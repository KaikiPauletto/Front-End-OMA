import { apiRequest } from './apiClient.js';
import { isNonNegativeInt64, normalizePositiveInt64 } from './int64.js';
import { parseJsonPreservingInt64 } from './losslessJson.js';

const productTypes = ['SINGLE_UNIT', 'MULTI_UNIT'];
const MAX_CART_QUANTITY = 2147483647;

export class InvalidCartResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de carrinho inválida.');
    this.name = 'InvalidCartResponseError';
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

function validateCredentials(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como cliente.');
  }
}

function validateQuantity(quantity) {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_CART_QUANTITY
  ) {
    throw new Error('Informe uma quantidade inteira positiva válida.');
  }
}

function isNullableString(value) {
  return value === null || typeof value === 'string';
}

function isNullableMoney(value, positive = false) {
  return value === null || (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (positive ? value > 0 : value >= 0)
  );
}

function validateCartItem(item) {
  let productId;
  try {
    productId = normalizeProductId(item?.productId);
  } catch {
    throw new InvalidCartResponseError();
  }

  if (
    !isRecord(item) ||
    productId !== String(item.productId) ||
    !isNullableString(item.name) ||
    !isNullableString(item.brand) ||
    !isNullableString(item.model) ||
    !isNullableString(item.image) ||
    (item.productType !== null && !productTypes.includes(item.productType)) ||
    typeof item.active !== 'boolean' ||
    typeof item.productAvailable !== 'boolean' ||
    !Number.isInteger(item.desiredQuantity) ||
    item.desiredQuantity < 1 ||
    item.desiredQuantity > MAX_CART_QUANTITY ||
    !isNonNegativeInt64(item.quantityOnHand) ||
    !isNonNegativeInt64(item.quantityReserved) ||
    !isNonNegativeInt64(item.availableQuantity) ||
    !isNullableMoney(item.unitPrice, true) ||
    !isNullableMoney(item.estimatedSubtotal) ||
    typeof item.available !== 'boolean' ||
    typeof item.addedAt !== 'string' ||
    typeof item.updatedAt !== 'string' ||
    (item.productAvailable && (
      typeof item.name !== 'string' ||
      !productTypes.includes(item.productType) ||
      item.unitPrice === null ||
      item.estimatedSubtotal === null
    )) ||
    (!item.productAvailable && (
      item.name !== null ||
      item.productType !== null ||
      item.unitPrice !== null ||
      item.estimatedSubtotal !== null
    ))
  ) {
    throw new InvalidCartResponseError();
  }

  return item;
}

function validateCartResponse(response) {
  let id;
  try {
    id = normalizeProductId(response?.id);
  } catch {
    throw new InvalidCartResponseError();
  }

  if (
    !isRecord(response) ||
    id !== String(response.id) ||
    !isNonNegativeInt64(response.version) ||
    typeof response.createdAt !== 'string' ||
    typeof response.updatedAt !== 'string' ||
    response.currency !== 'BRL' ||
    !isNullableMoney(response.estimatedSubtotal) ||
    typeof response.estimateComplete !== 'boolean' ||
    !Array.isArray(response.items) ||
    (response.estimateComplete && response.estimatedSubtotal === null) ||
    (!response.estimateComplete && response.estimatedSubtotal !== null)
  ) {
    throw new InvalidCartResponseError();
  }

  response.items.forEach(validateCartItem);
  return response;
}

function getCartResponse(response) {
  if (
    !isRecord(response) ||
    response.status !== 200 ||
    !isRecord(response.data)
  ) {
    throw new InvalidCartResponseError();
  }
  return validateCartResponse(response.data);
}

function getAuthHeaders(token, includeJson = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function getCart(token) {
  validateCredentials(token);
  const response = await apiRequest(
    '/ws/cart',
    {
      method: 'GET',
      headers: getAuthHeaders(token),
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );
  return getCartResponse(response);
}

export async function addCartItem(productId, quantity, token) {
  validateCredentials(token);
  const normalizedProductId = normalizeProductId(productId);
  validateQuantity(quantity);
  const response = await apiRequest(
    '/ws/cart/items',
    {
      method: 'POST',
      headers: getAuthHeaders(token, true),
      body: `{"productId":${normalizedProductId},"quantity":${quantity}}`,
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );
  return getCartResponse(response);
}

export async function updateCartItemQuantity(productId, quantity, token) {
  validateCredentials(token);
  const normalizedProductId = normalizeProductId(productId);
  validateQuantity(quantity);
  const response = await apiRequest(
    `/ws/cart/items/${encodeURIComponent(normalizedProductId)}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(token, true),
      body: JSON.stringify({ quantity }),
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );
  return getCartResponse(response);
}

export async function removeCartItem(productId, token) {
  validateCredentials(token);
  const normalizedProductId = normalizeProductId(productId);
  const response = await apiRequest(
    `/ws/cart/items/${encodeURIComponent(normalizedProductId)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    },
    { includeStatus: true },
  );

  if (!isRecord(response) || response.status !== 204 || response.data !== null) {
    throw new InvalidCartResponseError();
  }
}

export async function clearCartItems(token) {
  validateCredentials(token);
  const response = await apiRequest(
    '/ws/cart/items',
    {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    },
    { includeStatus: true },
  );

  if (!isRecord(response) || response.status !== 204 || response.data !== null) {
    throw new InvalidCartResponseError();
  }
}
