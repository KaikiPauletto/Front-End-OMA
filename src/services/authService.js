import { ApiError, apiRequest } from './apiClient';

const rolesByType = {
  Common: 'CLIENTE',
  Admin: 'ADMINISTRADOR',
};

export class InvalidAuthResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de autenticação inválida.');
    this.name = 'InvalidAuthResponseError';
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateUser(user) {
  if (
    !isRecord(user) ||
    user.id === undefined ||
    user.id === null ||
    typeof user.name !== 'string' ||
    !user.name.trim() ||
    typeof user.email !== 'string' ||
    !user.email.trim()
  ) {
    throw new InvalidAuthResponseError();
  }
}

function jsonOptions(method, payload) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

export async function registerUser({ name, email, password }) {
  const response = await apiRequest(
    '/auth/signup',
    jsonOptions('POST', { name, email, password }),
    { includeStatus: true },
  );

  if (response.status !== 201) {
    throw new InvalidAuthResponseError();
  }

  validateUser(response.data);
  if (response.data.type !== 'Common') {
    throw new InvalidAuthResponseError();
  }

  return response.data;
}

export async function authenticateUser({ email, password }) {
  const response = await apiRequest(
    '/auth/signin',
    jsonOptions('POST', { email, password }),
    { includeStatus: true },
  );

  if (response.status !== 200 || !isRecord(response.data)) {
    throw new InvalidAuthResponseError();
  }

  const { user, token } = response.data;
  validateUser(user);
  if (
    typeof user.type !== 'string' ||
    !Object.prototype.hasOwnProperty.call(rolesByType, user.type) ||
    typeof token !== 'string' ||
    !token.trim()
  ) {
    throw new InvalidAuthResponseError();
  }

  return {
    user: { ...user, role: rolesByType[user.type] },
    token,
  };
}

export async function revokeToken(token) {
  const response = await apiRequest(
    '/auth/logout',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
    { includeStatus: true },
  );

  if (response.status !== 204) {
    throw new InvalidAuthResponseError();
  }
}

export function getAuthErrorMessage(error, operation) {
  if (error instanceof ApiError) {
    if (operation === 'logout') {
      return `O servidor não confirmou a revogação da sessão (HTTP ${error.status}).`;
    }
    if (error.status === 401 && operation === 'signin') {
      return 'E-mail ou senha inválidos.';
    }
    if (error.status === 400 && typeof error.body === 'string' && error.body.trim()) {
      return error.body.trim();
    }
    if (error.status === 400 && operation === 'register') {
      return 'Não foi possível criar a conta. Verifique os dados e se este e-mail já está cadastrado.';
    }
    if (error.status === 400 && operation === 'signin') {
      return 'Não foi possível validar os dados de acesso. Confira o e-mail e tente novamente.';
    }
    if (error.status >= 500) {
      return 'O servidor está temporariamente indisponível. Tente novamente.';
    }
    return error.message;
  }

  if (error instanceof InvalidAuthResponseError) {
    if (operation === 'logout') {
      return 'O servidor retornou uma resposta inesperada e não confirmou a revogação.';
    }
    return 'O servidor retornou uma resposta inesperada. Tente novamente.';
  }

  if (error instanceof Error && error.message.startsWith('API não configurada.')) {
    return error.message;
  }

  return operation === 'logout'
    ? 'Não foi possível confirmar a revogação da sessão no servidor.'
    : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
}
