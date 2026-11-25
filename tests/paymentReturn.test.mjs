import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/services/apiClient.js';
import {
  clearAuthSession,
  clearPendingPaymentReturn,
  loadAuthSession,
  loadPendingPaymentReturn,
  saveAuthSession,
  savePendingPaymentReturn,
} from '../src/services/browserSession.js';
import { MAX_INT64 } from '../src/services/int64.js';
import {
  getCheckoutSessionErrorMessage,
  InvalidOrderResponseError,
} from '../src/services/ordersService.js';
import {
  describePaymentStatus,
  parsePaymentReturnParams,
  pollPaymentStatus,
} from '../src/services/paymentReturn.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

function apiError(status) {
  return new ApiError({ status }, '', null);
}

const noSleep = async () => {};

test('payment return reads order_id and session_id from the URL params', () => {
  assert.deepEqual(
    parsePaymentReturnParams({ result: 'success', order_id: MAX_INT64, session_id: 'cs_test_123' }),
    { ok: true, result: 'success', orderId: MAX_INT64, sessionId: 'cs_test_123' },
  );
  assert.deepEqual(
    parsePaymentReturnParams({ result: 'cancel', order_id: '42' }),
    { ok: true, result: 'cancel', orderId: '42', sessionId: null },
  );
});

test('payment return rejects unknown results and invalid order ids', () => {
  assert.equal(parsePaymentReturnParams({ result: 'other', order_id: '1' }).ok, false);
  assert.equal(parsePaymentReturnParams({ result: 'success' }).ok, false);
  assert.equal(parsePaymentReturnParams({ result: 'success', order_id: '0' }).ok, false);
  assert.equal(parsePaymentReturnParams({ result: 'success', order_id: '12abc' }).ok, false);
  assert.equal(parsePaymentReturnParams(undefined).ok, false);
});

test('payment status descriptions map to approved, pending and failed', () => {
  assert.equal(describePaymentStatus('APPROVED').title, 'Pagamento aprovado');
  assert.equal(describePaymentStatus('PENDING').title, 'Aguardando confirmação');
  assert.equal(describePaymentStatus('CREATED').kind, 'pending');
  for (const status of ['FAILED', 'EXPIRED', 'CANCELLED']) {
    assert.equal(describePaymentStatus(status).kind, 'failed', status);
  }
});

test('polling stops as soon as the payment is approved', async () => {
  const statuses = ['PENDING', 'PENDING', 'APPROVED'];
  const updates = [];
  const sleeps = [];
  const result = await pollPaymentStatus({
    orderId: '7',
    getStatus: async (orderId) => {
      assert.equal(orderId, '7');
      return { status: statuses.shift() };
    },
    onUpdate: (update) => updates.push(update.status),
    sleep: async (ms) => sleeps.push(ms),
  });

  assert.equal(result.outcome, 'approved');
  assert.equal(result.attempts, 3);
  assert.deepEqual(updates, ['PENDING', 'PENDING', 'APPROVED']);
  assert.deepEqual(sleeps, [2000, 2000]);
});

test('polling reports failed payments and times out after ~30 s of PENDING', async () => {
  const failed = await pollPaymentStatus({
    orderId: '7',
    getStatus: async () => ({ status: 'EXPIRED' }),
    sleep: noSleep,
  });
  assert.equal(failed.outcome, 'failed');
  assert.equal(failed.status, 'EXPIRED');

  let calls = 0;
  const pending = await pollPaymentStatus({
    orderId: '7',
    getStatus: async () => {
      calls += 1;
      return { status: 'PENDING' };
    },
    sleep: noSleep,
  });
  assert.equal(pending.outcome, 'timeout');
  assert.equal(calls, 15);
});

test('polling retries transient errors but stops on 401', async () => {
  const responses = [apiError(502), { status: 'APPROVED' }];
  const recovered = await pollPaymentStatus({
    orderId: '7',
    getStatus: async () => {
      const next = responses.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    },
    sleep: noSleep,
  });
  assert.equal(recovered.outcome, 'approved');

  let calls = 0;
  const unauthorized = await pollPaymentStatus({
    orderId: '7',
    getStatus: async () => {
      calls += 1;
      throw apiError(401);
    },
    sleep: noSleep,
  });
  assert.equal(unauthorized.outcome, 'unauthorized');
  assert.equal(calls, 1);
});

test('polling stops when the screen is no longer active', async () => {
  let active = true;
  const result = await pollPaymentStatus({
    orderId: '7',
    getStatus: async () => ({ status: 'PENDING' }),
    isActive: () => active,
    sleep: async () => {
      active = false;
    },
  });
  assert.equal(result.outcome, 'aborted');
});

test('auth session round-trips through storage and ignores invalid data', () => {
  const storage = fakeStorage();
  const session = {
    user: { id: 1, name: 'Cliente', email: 'cliente@example.com', type: 'Common', role: 'CLIENTE' },
    token: 'jwt-token',
  };

  assert.equal(loadAuthSession(storage), null);
  saveAuthSession(session, storage);
  assert.deepEqual(loadAuthSession(storage), session);
  clearAuthSession(storage);
  assert.equal(loadAuthSession(storage), null);

  storage.setItem('oma.auth.session', '{not json');
  assert.equal(loadAuthSession(storage), null);
  storage.setItem('oma.auth.session', JSON.stringify({ user: session.user, token: '' }));
  assert.equal(loadAuthSession(storage), null);
  assert.equal(storage.data.has('oma.auth.session'), false);
});

test('pending payment return keeps the order id for after login', () => {
  const storage = fakeStorage();
  savePendingPaymentReturn({ result: 'success', orderId: MAX_INT64, sessionId: 'cs_1' }, storage);
  assert.deepEqual(
    loadPendingPaymentReturn(storage),
    { result: 'success', orderId: MAX_INT64, sessionId: 'cs_1' },
  );
  clearPendingPaymentReturn(storage);
  assert.equal(loadPendingPaymentReturn(storage), null);
});

test('checkout session errors explain gateway failures clearly', () => {
  for (const status of [502, 503, 504]) {
    assert.equal(
      getCheckoutSessionErrorMessage(apiError(status)),
      'Não foi possível iniciar o pagamento. Tente de novo.',
    );
  }
  assert.match(getCheckoutSessionErrorMessage(apiError(401)), /sessão expirou/);
  assert.match(getCheckoutSessionErrorMessage(apiError(500)), /HTTP 500/);
  assert.match(getCheckoutSessionErrorMessage(new InvalidOrderResponseError()), /resposta inválida/);
  assert.match(getCheckoutSessionErrorMessage(new TypeError('Failed to fetch')), /conexão/);
});
