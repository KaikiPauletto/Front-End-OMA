function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      'API não configurada. Defina EXPO_PUBLIC_API_URL no ambiente do Expo.',
    );
  }
  return baseUrl.replace(/\/+$/, '');
}

export async function apiRequest(path, options = {}) {
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

  if (!response.ok) {
    throw new Error(`A API respondeu com HTTP ${response.status}.`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('A API retornou uma resposta que não é JSON.');
  }

  return response.json();
}
