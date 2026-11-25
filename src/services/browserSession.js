// Persistência mínima da sessão no navegador.
// Na web, usa sessionStorage (sobrevive ao reload da volta do Stripe e é
// descartado ao fechar a aba). No celular não há sessionStorage: o valor fica
// apenas em memória, preservando o comportamento anterior do app.

const AUTH_KEY = 'oma.auth.session';
const PAYMENT_RETURN_KEY = 'oma.payment.return';
const memoryStore = new Map();

function getBrowserStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Acesso ao storage pode ser bloqueado (modo privado, políticas do navegador).
  }
  return null;
}

function readJson(key, storage = getBrowserStorage()) {
  try {
    const raw = storage ? storage.getItem(key) : memoryStore.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value, storage = getBrowserStorage()) {
  const raw = JSON.stringify(value);
  try {
    if (storage) {
      storage.setItem(key, raw);
      return;
    }
  } catch {
    // Sem storage disponível: cai para memória.
  }
  memoryStore.set(key, raw);
}

function removeKey(key, storage = getBrowserStorage()) {
  try {
    storage?.removeItem(key);
  } catch {
    // Ignora falhas de storage.
  }
  memoryStore.delete(key);
}

function isValidStoredAuth(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof value.token === 'string' &&
    value.token.trim().length > 0 &&
    value.user !== null &&
    typeof value.user === 'object' &&
    value.user.id !== undefined &&
    value.user.id !== null &&
    ['CLIENTE', 'ADMINISTRADOR'].includes(value.user.role);
}

export function loadAuthSession(storage) {
  const value = readJson(AUTH_KEY, storage);
  if (!isValidStoredAuth(value)) {
    if (value !== null) {
      removeKey(AUTH_KEY, storage);
    }
    return null;
  }
  return { user: value.user, token: value.token };
}

export function saveAuthSession(session, storage) {
  if (!isValidStoredAuth(session)) {
    return;
  }
  writeJson(AUTH_KEY, { user: session.user, token: session.token }, storage);
}

export function clearAuthSession(storage) {
  removeKey(AUTH_KEY, storage);
}

export function loadPendingPaymentReturn(storage) {
  const value = readJson(PAYMENT_RETURN_KEY, storage);
  if (
    value === null ||
    typeof value !== 'object' ||
    !['success', 'cancel'].includes(value.result) ||
    typeof value.orderId !== 'string'
  ) {
    return null;
  }
  return {
    result: value.result,
    orderId: value.orderId,
    sessionId: typeof value.sessionId === 'string' ? value.sessionId : null,
  };
}

export function savePendingPaymentReturn(paymentReturn, storage) {
  writeJson(PAYMENT_RETURN_KEY, paymentReturn, storage);
}

export function clearPendingPaymentReturn(storage) {
  removeKey(PAYMENT_RETURN_KEY, storage);
}
