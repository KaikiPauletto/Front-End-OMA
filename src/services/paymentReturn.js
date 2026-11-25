import { ApiError } from './apiClient.js';
import { normalizePositiveInt64 } from './int64.js';

export const PAYMENT_POLL_INTERVAL_MS = 2000;
export const PAYMENT_POLL_MAX_ATTEMPTS = 15; // ~30 s

const pendingStatuses = ['CREATED', 'PENDING'];
const failedStatuses = {
  FAILED: 'O pagamento foi recusado.',
  EXPIRED: 'A sessão de pagamento expirou.',
  CANCELLED: 'O pagamento foi cancelado.',
  REFUNDED: 'O pagamento foi estornado.',
};

function firstString(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' ? candidate.trim() : '';
}

// Lê os parâmetros do retorno do Stripe (rota payment/:result?order_id=&session_id=).
// O orderId vem da URL, nunca do estado em memória.
export function parsePaymentReturnParams(params) {
  const result = firstString(params?.result);
  if (!['success', 'cancel'].includes(result)) {
    return { ok: false, message: 'Endereço de retorno do pagamento inválido.' };
  }

  const orderId = normalizePositiveInt64(firstString(params?.order_id ?? params?.orderId));
  if (!orderId) {
    return { ok: false, result, message: 'O endereço de retorno não informa um pedido válido.' };
  }

  const sessionId = firstString(params?.session_id ?? params?.sessionId) || null;
  return { ok: true, result, orderId, sessionId };
}

export function describePaymentStatus(status) {
  if (status === 'APPROVED') {
    return { kind: 'approved', title: 'Pagamento aprovado', message: 'Recebemos a confirmação do Stripe.' };
  }
  if (pendingStatuses.includes(status)) {
    return {
      kind: 'pending',
      title: 'Aguardando confirmação',
      message: 'O Stripe ainda está confirmando o pagamento.',
    };
  }
  if (Object.prototype.hasOwnProperty.call(failedStatuses, status)) {
    return { kind: 'failed', title: 'Pagamento não aprovado', message: failedStatuses[status] };
  }
  return {
    kind: 'pending',
    title: 'Aguardando confirmação',
    message: 'O pagamento ainda não foi registrado.',
  };
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Consulta o pagamento até um status final ou até esgotar as tentativas.
// Erros de rede/5xx são tolerados e tentados de novo; 401/403 encerram.
export async function pollPaymentStatus({
  orderId,
  getStatus,
  onUpdate = () => {},
  isActive = () => true,
  sleep = defaultSleep,
  intervalMs = PAYMENT_POLL_INTERVAL_MS,
  maxAttempts = PAYMENT_POLL_MAX_ATTEMPTS,
}) {
  let lastError = null;
  let lastPayment = null;

  for (let attempt = 1; attempt <= maxAttempts && isActive(); attempt += 1) {
    try {
      const payment = await getStatus(orderId);
      lastError = null;
      lastPayment = payment;
      const status = payment?.status ?? null;
      const description = describePaymentStatus(status);
      onUpdate({ attempt, payment, status, description, error: null });
      if (description.kind !== 'pending') {
        return { outcome: description.kind, status, payment, attempts: attempt };
      }
    } catch (error) {
      lastError = error;
      onUpdate({ attempt, payment: lastPayment, status: lastPayment?.status ?? null, error });
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        return { outcome: 'unauthorized', error, attempts: attempt };
      }
    }

    if (attempt < maxAttempts && isActive()) {
      await sleep(intervalMs);
    }
  }

  if (!isActive()) {
    return { outcome: 'aborted' };
  }
  return lastError && !lastPayment
    ? { outcome: 'error', error: lastError, attempts: maxAttempts }
    : { outcome: 'timeout', status: lastPayment?.status ?? null, payment: lastPayment, attempts: maxAttempts };
}
