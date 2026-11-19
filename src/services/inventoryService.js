import { apiRequest } from './apiClient';
import { isNonNegativeInt64, normalizePositiveInt64, MAX_INT64 } from './int64';
import { parseJsonPreservingInt64 } from './losslessJson';

const INITIAL_ENTRY_REASON = 'Estoque inicial';
const productTypes = ['SINGLE_UNIT', 'MULTI_UNIT'];

export class InvalidInventoryResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de estoque inválida.');
    this.name = 'InvalidInventoryResponseError';
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProductId(productId) {
  const normalized = normalizePositiveInt64(productId);
  if (!normalized) {
    throw new Error('O identificador do produto é inválido.');
  }

  return normalized;
}

function validateCredentials(token, productType) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }
  if (!productTypes.includes(productType)) {
    throw new Error('O tipo do produto é inválido.');
  }
}

function validateInventoryResponse(response, productId, productType) {
  let responseProductId;
  try {
    responseProductId = normalizeProductId(response?.productId);
  } catch {
    throw new InvalidInventoryResponseError();
  }

  if (
    !isRecord(response) ||
    responseProductId !== productId ||
    response.productType !== productType ||
    !isNonNegativeInt64(response.quantityOnHand) ||
    !isNonNegativeInt64(response.quantityReserved) ||
    !isNonNegativeInt64(response.availableQuantity) ||
    !isNonNegativeInt64(response.lowStockThreshold) ||
    typeof response.lowStock !== 'boolean' ||
    typeof response.createdAt !== 'string' ||
    typeof response.updatedAt !== 'string'
  ) {
    throw new InvalidInventoryResponseError();
  }

  return response;
}

function validateSuccessfulResponse(response, productId, productType) {
  if (
    !isRecord(response) ||
    response.status !== 200 ||
    !isRecord(response.data)
  ) {
    throw new InvalidInventoryResponseError();
  }

  return validateInventoryResponse(response.data, productId, productType);
}

function assertPositiveQuantity(quantity, productType) {
  const normalizedQuantity = normalizePositiveInt64(quantity);
  if (!normalizedQuantity || normalizedQuantity !== quantity) {
    throw new Error('A quantidade inicial deve ser um inteiro positivo válido.');
  }
  if (productType === 'SINGLE_UNIT' && quantity !== '1') {
    throw new Error('Produto unitário permite no máximo uma unidade.');
  }
}

export function validateInitialQuantity(value, productType) {
  if (!productTypes.includes(productType)) {
    return { quantity: null, error: 'Selecione o tipo do produto.' };
  }

  const input = typeof value === 'string' ? value.trim() : '';
  if (!input) {
    return { quantity: null, error: 'Informe a quantidade inicial.' };
  }
  if (!/^\d+$/.test(input)) {
    return { quantity: null, error: 'Informe uma quantidade inteira não negativa.' };
  }

  const quantity = input.replace(/^0+(?=\d)/, '');
  if (
    quantity.length > MAX_INT64.length ||
    (quantity.length === MAX_INT64.length && quantity > MAX_INT64)
  ) {
    return { quantity: null, error: 'A quantidade excede o limite suportado.' };
  }
  if (productType === 'SINGLE_UNIT' && quantity !== '0' && quantity !== '1') {
    return { quantity: null, error: 'Produto unitário permite somente 0 ou 1 unidade.' };
  }

  return { quantity, error: '' };
}

export async function registerProductInventory(productId, productType, token) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const response = await apiRequest(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/registration`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );

  return validateSuccessfulResponse(response, normalizedProductId, productType);
}

export async function registerInitialInventoryEntry(
  productId,
  productType,
  quantity,
  token,
) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  assertPositiveQuantity(quantity, productType);

  const response = await apiRequest(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/entries`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Keep the 64-bit quantity as an exact JSON integer instead of a JS Number.
      body: `{"quantity":${quantity},"reason":${JSON.stringify(INITIAL_ENTRY_REASON)}}`,
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );

  return validateSuccessfulResponse(response, normalizedProductId, productType);
}
