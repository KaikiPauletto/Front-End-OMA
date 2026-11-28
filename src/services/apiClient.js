// Gateway do back-end na própria máquina (web). Para celular ou emulador, defina
// EXPO_PUBLIC_API_URL com um endereço que o dispositivo alcance.
const DEFAULT_API_URL = 'http://localhost:8080';

export function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
  return baseUrl.replace(/\/+$/, '');
}

export class ApiError extends Error {
  constructor(response, rawBody, body) {
    const message = typeof body === 'string' && body.trim()
      ? body.trim()
      : `A API respondeu com HTTP ${response.status}.`;
    super(message);
    this.name = 'ApiError';
    this.status = response.status;
    this.rawBody = rawBody;
    this.body = body;
  }
}

function decodeBody(rawBody, contentType, parseJson) {
  if (rawBody.length === 0) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      return parseJson(rawBody);
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

export async function apiRequest(
  path,
  options = {},
  { includeStatus = false, parseJson = JSON.parse } = {},
) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new Error('O caminho da API deve ser relativo e começar com "/".');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return includeStatus ? { status: response.status, data: null } : null;
  }

  const rawBody = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const body = decodeBody(rawBody, contentType, parseJson);

  if (!response.ok) {
    throw new ApiError(response, rawBody, body);
  }

  return includeStatus
    ? { status: response.status, data: body }
    : body;
}
