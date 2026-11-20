import { apiRequest } from './apiClient.js';
import {
  isNonNegativeInt64,
  isSignedInt64,
  normalizeNonNegativeInt64,
  normalizePositiveInt64,
  MAX_INT64,
} from './int64.js';
import { parseJsonPreservingInt64 } from './losslessJson.js';

const INITIAL_ENTRY_REASON = 'Estoque inicial';
const productTypes = ['SINGLE_UNIT', 'MULTI_UNIT'];
const movementTypes = [
  'ENTRY',
  'MANUAL_EXIT',
  'ADJUSTMENT',
  'RESERVATION_CONFIRMATION',
];

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

function validateToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }
}

function validateCredentials(token, productType) {
  validateToken(token);
  if (!productTypes.includes(productType)) {
    throw new Error('O tipo do produto é inválido.');
  }
}

function validateInventoryResponse(response, productId, productType) {
  if (!isRecord(response)) {
    throw new InvalidInventoryResponseError();
  }

  let responseProductId;
  try {
    responseProductId = normalizeProductId(response.productId);
  } catch {
    throw new InvalidInventoryResponseError();
  }

  if (
    (productId !== undefined && responseProductId !== productId) ||
    !productTypes.includes(response.productType) ||
    (productType && response.productType !== productType) ||
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

function validateMovementResponse(response) {
  if (
    !isRecord(response) ||
    !normalizePositiveInt64(response.id) ||
    !normalizePositiveInt64(response.productId) ||
    !movementTypes.includes(response.movementType) ||
    !isSignedInt64(response.quantityDelta) ||
    (response.reason !== null && typeof response.reason !== 'string') ||
    (response.orderId !== null && response.orderId !== undefined &&
      !normalizePositiveInt64(response.orderId)) ||
    (response.reservationId !== null && response.reservationId !== undefined &&
      !normalizePositiveInt64(response.reservationId)) ||
    typeof response.createdAt !== 'string'
  ) {
    throw new InvalidInventoryResponseError();
  }

  return response;
}

function validatePage(response, validateItem) {
  if (
    !isRecord(response) ||
    !Array.isArray(response.content) ||
    !Number.isInteger(response.number) ||
    response.number < 0 ||
    !Number.isInteger(response.size) ||
    response.size < 0 ||
    !Number.isInteger(response.totalPages) ||
    response.totalPages < 0 ||
    !isNonNegativeInt64(response.totalElements)
  ) {
    throw new InvalidInventoryResponseError();
  }

  return {
    items: response.content.map(validateItem),
    page: response.number,
    size: response.size,
    totalPages: response.totalPages,
    totalElements: response.totalElements,
  };
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

function validatePageRequest({ page = 0, size = 20 }) {
  if (!Number.isSafeInteger(page) || page < 0) {
    throw new Error('A página informada é inválida.');
  }
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new Error('O tamanho da página informado é inválido.');
  }

  return { page, size };
}

function queryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => (
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    ))
    .join('&');
}

function getTimestampFilter(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`${fieldName} deve ser uma data/hora ISO-8601.`);
  }
  return value;
}

function validateMovementFilters({ movementType, from, to }) {
  if (movementType && !movementTypes.includes(movementType)) {
    throw new Error('O tipo de movimentação é inválido.');
  }

  return {
    movementType,
    from: getTimestampFilter(from, 'A data inicial'),
    to: getTimestampFilter(to, 'A data final'),
  };
}

function normalizeReason(reason) {
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 500) {
    throw new Error('O motivo é obrigatório e deve ter no máximo 500 caracteres.');
  }
  return reason.trim();
}

function normalizePositiveQuantity(quantity) {
  const normalized = normalizePositiveInt64(quantity);
  if (!normalized) {
    throw new Error('A quantidade deve ser um inteiro positivo válido.');
  }
  return normalized;
}

function normalizeNonNegativeQuantity(quantity, label) {
  const normalized = normalizeNonNegativeInt64(quantity);
  if (normalized === null) {
    throw new Error(`${label} deve ser um inteiro não negativo válido.`);
  }
  return normalized;
}

function getPageQuery({ page = 0, size = 20, sort }) {
  const pagination = validatePageRequest({ page, size });
  if (sort !== undefined && (typeof sort !== 'string' || !sort.trim())) {
    throw new Error('A ordenação informada é inválida.');
  }
  return queryString({
    ...pagination,
    sort,
  });
}

async function getInventoryMutationResponse(path, token, body) {
  validateToken(token);
  const response = await apiRequest(
    path,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body }),
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );
  return response;
}

async function sendStockMovement(productId, productType, quantity, reason, token, action) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const normalizedQuantity = normalizePositiveQuantity(quantity);
  if (productType === 'SINGLE_UNIT' && normalizedQuantity !== '1' && action === 'entry') {
    throw new Error('Produto unitário permite uma unidade por entrada.');
  }

  const normalizedReason = normalizeReason(reason);
  const body = `{"quantity":${normalizedQuantity},"reason":${JSON.stringify(normalizedReason)}}`;
  const response = await getInventoryMutationResponse(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/${action === 'entry' ? 'entries' : 'exits'}`,
    token,
    body,
  );
  return validateSuccessfulResponse(response, normalizedProductId, productType);
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

export async function listInventory({
  productType,
  lowStock,
  page = 0,
  size = 20,
  sort,
  token,
}) {
  validateToken(token);
  if (productType && !productTypes.includes(productType)) {
    throw new Error('O tipo do produto é inválido.');
  }
  if (lowStock !== undefined && lowStock !== null && typeof lowStock !== 'boolean') {
    throw new Error('O filtro de estoque baixo é inválido.');
  }

  const query = getPageQuery({ page, size, sort });
  const filters = queryString({ productType, lowStock });
  const response = await apiRequest(
    `/ws/inventory?${[filters, query].filter(Boolean).join('&')}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    { parseJson: parseJsonPreservingInt64 },
  );

  return validatePage(response, (item) => validateInventoryResponse(item));
}

export async function getProductInventory(productId, productType, token) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const response = await apiRequest(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}`,
    {
      method: 'GET',
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

export async function registerProductInventory(productId, productType, token) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const response = await getInventoryMutationResponse(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/registration`,
    token,
  );

  return validateSuccessfulResponse(response, normalizedProductId, productType);
}

export async function registerInventoryEntry(
  productId,
  productType,
  quantity,
  reason,
  token,
) {
  return sendStockMovement(productId, productType, quantity, reason, token, 'entry');
}

export async function registerInventoryExit(
  productId,
  productType,
  quantity,
  reason,
  token,
) {
  return sendStockMovement(productId, productType, quantity, reason, token, 'exit');
}

export async function adjustProductInventory(
  productId,
  productType,
  newQuantity,
  reason,
  token,
) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const normalizedQuantity = normalizeNonNegativeQuantity(newQuantity, 'A nova quantidade');
  const normalizedReason = normalizeReason(reason);
  const body = `{"newQuantity":${normalizedQuantity},"reason":${JSON.stringify(normalizedReason)}}`;
  const response = await getInventoryMutationResponse(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/adjustments`,
    token,
    body,
  );

  return validateSuccessfulResponse(response, normalizedProductId, productType);
}

export async function setLowStockThreshold(
  productId,
  productType,
  threshold,
  token,
) {
  validateCredentials(token, productType);
  const normalizedProductId = normalizeProductId(productId);
  const normalizedThreshold = normalizeNonNegativeQuantity(threshold, 'O limite');
  const response = await apiRequest(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/low-stock-threshold`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: `{"threshold":${normalizedThreshold}}`,
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
  const normalizedQuantity = normalizePositiveQuantity(quantity);
  if (productType === 'SINGLE_UNIT' && normalizedQuantity !== '1') {
    throw new Error('Produto unitário permite no máximo uma unidade.');
  }
  const body = `{"quantity":${normalizedQuantity},"reason":${JSON.stringify(INITIAL_ENTRY_REASON)}}`;
  const response = await getInventoryMutationResponse(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/entries`,
    token,
    body,
  );

  return validateSuccessfulResponse(response, normalizedProductId, productType);
}

async function getInventoryMovements(path, token, options) {
  validateToken(token);
  const {
    productId,
    movementType,
    from,
    to,
    page = 0,
    size = 20,
    sort,
  } = options;
  const normalizedProductId = productId === undefined || productId === null
    ? undefined
    : normalizeProductId(productId);
  const filters = validateMovementFilters({ movementType, from, to });
  const query = queryString({
    ...(path === '/ws/inventory/movements' ? { productId: normalizedProductId } : {}),
    ...filters,
    ...validatePageRequest({ page, size }),
    sort,
  });
  if (sort !== undefined && (typeof sort !== 'string' || !sort.trim())) {
    throw new Error('A ordenação informada é inválida.');
  }
  const response = await apiRequest(
    `${path}${query ? `?${query}` : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
    { parseJson: parseJsonPreservingInt64 },
  );

  return validatePage(response, validateMovementResponse);
}

export async function listProductInventoryMovements(productId, token, options = {}) {
  validateToken(token);
  const normalizedProductId = normalizeProductId(productId);
  return getInventoryMovements(
    `/ws/inventory/${encodeURIComponent(normalizedProductId)}/movements`,
    token,
    options,
  );
}

export async function listInventoryMovements(token, options = {}) {
  return getInventoryMovements('/ws/inventory/movements', token, options);
}
