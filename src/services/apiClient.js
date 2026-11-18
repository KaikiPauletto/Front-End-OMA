function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      'API não configurada. Defina EXPO_PUBLIC_API_URL no ambiente do Expo.',
    );
  }
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

function decodeBody(rawBody, contentType) {
  if (rawBody.length === 0) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return rawBody;
    }
  }

  return rawBody;
}

export async function apiRequest(path, options = {}, { includeStatus = false } = {}) {
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
  const body = decodeBody(rawBody, contentType);

  if (!response.ok) {
    throw new ApiError(response, rawBody, body);
  }

  return includeStatus
    ? { status: response.status, data: body }
    : body;
}
