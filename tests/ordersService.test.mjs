import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/services/apiClient.js';
import {
  createCheckoutSession,
  createOrder,
  getPaymentStatus,
  InvalidOrderResponseError,
  listOrders,
} from '../src/services/ordersService.js';
import { MAX_INT64 } from '../src/services/int64.js';

const address = {
  zipCode: '99000000',
  street: 'Rua das Flores',
  number: '150',
  neighborhood: 'Centro',
  city: 'Passo Fundo',
  state: 'RS',
};

const orderJson = `{"id":${MAX_INT64},"status":"PENDING_PAYMENT",` +
  '"orderDate":"2026-11-24T12:00:00Z","currency":"BRL",' +
  '"subtotalAmount":120.5,"shippingAmount":20,"discountAmount":0,' +
  '"totalAmount":140.5,"items":[{"productId":' + MAX_INT64 +
  ',"productName":"Cuia artesanal","quantity":1,"unitPrice":120.5,' +
  '"subtotalAmount":120.5}],"shippingAddress":' + JSON.stringify(address) + '}';

async function withApi(fetchImpl, callback) {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = fetchImpl;

  try {
    await callback();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
}

test('createOrder posts the exact Long IDs, authenticated address, and idempotency key', async () => {
  await withApi(async (url, options) => {
    assert.equal(url, 'https://gateway.example/ws/orders');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer customer-token');
    assert.equal(options.headers['Idempotency-Key'], 'attempt-1');
    assert.equal(
      options.body,
      `{"items":[{"productId":${MAX_INT64},"quantity":1}],"shippingAddress":${JSON.stringify(address)}}`,
    );
    return new Response(orderJson, {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const order = await createOrder(
      { items: [{ productId: MAX_INT64, quantity: 1 }], shippingAddress: address },
      'customer-token',
      'attempt-1',
    );
    assert.equal(order.id, MAX_INT64);
    assert.equal(order.totalAmount, 140.5);
    assert.equal(order.items[0].productId, MAX_INT64);
  });
});

test('listOrders fetches every page and preserves order IDs', async () => {
  const requestedPages = [];
  await withApi(async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    requestedPages.push(page);
    return new Response(`{"content":[${orderJson}],"totalPages":2}`, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const orders = await listOrders('customer-token');
    assert.deepEqual(requestedPages, [0, 1]);
    assert.equal(orders.length, 2);
    assert.equal(orders[0].id, MAX_INT64);
  });
});

test('checkout session and payment status use authenticated Stripe API routes', async () => {
  const calls = [];
  await withApi(async (url, options) => {
    calls.push({ url, options });
    const body = url.endsWith('/checkout-session')
      ? `{"paymentId":15,"orderId":${MAX_INT64},"status":"PENDING",` +
        '"checkoutUrl":"https://checkout.stripe.com/c/pay/cs_test_123"}'
      : `{"paymentId":15,"orderId":${MAX_INT64},"status":"APPROVED",` +
        '"amount":140.5,"currency":"BRL","checkoutUrl":null}';
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const session = await createCheckoutSession(MAX_INT64, 'customer-token');
    const payment = await getPaymentStatus(MAX_INT64, 'customer-token');
    assert.equal(session.checkoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_123');
    assert.equal(payment.status, 'APPROVED');
  });

  assert.equal(calls[0].url, `https://gateway.example/ws/payments/orders/${MAX_INT64}/checkout-session`);
  assert.equal(calls[1].url, `https://gateway.example/ws/payments/orders/${MAX_INT64}`);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer customer-token');
});

test('payment status treats a missing payment as not started and rejects non-Stripe URLs', async () => {
  await withApi(async (url) => {
    if (url.endsWith('/checkout-session')) {
      return new Response(
        `{"paymentId":15,"orderId":${MAX_INT64},"status":"PENDING",` +
          '"checkoutUrl":"https://example.com/fake-checkout"}',
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('Not found', { status: 404 });
  }, async () => {
    assert.equal(await getPaymentStatus(MAX_INT64, 'customer-token'), null);
    await assert.rejects(
      createCheckoutSession(MAX_INT64, 'customer-token'),
      InvalidOrderResponseError,
    );
  });
});

test('order service preserves API errors and rejects malformed order payloads', async () => {
  await withApi(async () => new Response('Conflict', { status: 409 }), async () => {
    await assert.rejects(
      createOrder(
        { items: [{ productId: '17', quantity: 1 }], shippingAddress: address },
        'customer-token',
        'attempt-2',
      ),
      (error) => error instanceof ApiError && error.status === 409,
    );
  });

  await withApi(async () => new Response('{"id":17}', {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  }), async () => {
    await assert.rejects(
      createOrder(
        { items: [{ productId: '17', quantity: 1 }], shippingAddress: address },
        'customer-token',
        'attempt-3',
      ),
      InvalidOrderResponseError,
    );
  });
});
