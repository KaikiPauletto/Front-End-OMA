import { ApiError, apiRequest } from './apiClient.js';
import { normalizePositiveInt64 } from './int64.js';
import { parseJsonPreservingInt64 } from './losslessJson.js';

const orderStatuses = [
  'RESERVATION_PENDING',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
  'LEGACY',
];
const paymentStatuses = [
  'CREATED',
  'PENDING',
  'APPROVED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REFUNDED',
];
const MAX_ORDER_QUANTITY = 2147483647;

export class InvalidOrderResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de pedido ou pagamento inválida.');
    this.name = 'InvalidOrderResponseError';
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como cliente.');
  }
}

function getIdentifier(value) {
  const identifier = normalizePositiveInt64(value);
  if (!identifier) {
    throw new InvalidOrderResponseError();
  }
  return identifier;
}

function getMoney(value, required = false) {
  if (value === null || value === undefined) {
    if (required) {
      throw new InvalidOrderResponseError();
    }
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new InvalidOrderResponseError();
  }
  return value;
}

function getOptionalMoney(record, keys) {
  const key = keys.find((candidate) => record[candidate] !== undefined);
  return key ? getMoney(record[key]) : null;
}

function mapOrderItem(item, index) {
  const productId = getIdentifier(item?.productId);
  if (
    !isRecord(item) ||
    !Number.isInteger(item.quantity) ||
    item.quantity < 1 ||
    item.quantity > MAX_ORDER_QUANTITY
  ) {
    throw new InvalidOrderResponseError();
  }

  const productName = item.productName ?? item.name;
  if (typeof productName !== 'string' || !productName.trim()) {
    throw new InvalidOrderResponseError();
  }

  return {
    key: `${productId}:${index}`,
    productId,
    productName,
    quantity: item.quantity,
    unitPrice: getOptionalMoney(item, ['unitPrice']),
    lineTotal: getOptionalMoney(item, ['subtotalAmount', 'subtotal', 'lineTotal']),
  };
}

function mapShippingAddress(address) {
  if (!isRecord(address)) {
    throw new InvalidOrderResponseError();
  }
  const zipCode = address.zipCode ?? address.postalCode;
  const fields = ['street', 'number', 'neighborhood', 'city', 'state'];
  if (
    typeof zipCode !== 'string' ||
    !fields.every((field) => typeof address[field] === 'string')
  ) {
    throw new InvalidOrderResponseError();
  }

  return {
    zipCode,
    street: address.street,
    number: address.number,
    complement: typeof address.complement === 'string' ? address.complement : '',
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
  };
}

function mapOrder(order) {
  const id = getIdentifier(order?.id);
  if (
    !isRecord(order) ||
    !orderStatuses.includes(order.status) ||
    !Array.isArray(order.items) ||
    typeof order.currency !== 'string'
  ) {
    throw new InvalidOrderResponseError();
  }

  const createdAt = order.orderDate ?? order.createdAt;
  if (typeof createdAt !== 'string') {
    throw new InvalidOrderResponseError();
  }

  return {
    id,
    status: order.status,
    createdAt,
    currency: order.currency,
    subtotalAmount: getOptionalMoney(order, ['subtotalAmount', 'subtotal']),
    shippingAmount: getOptionalMoney(order, ['shippingAmount', 'shippingCost', 'shippingFee']),
    discountAmount: getOptionalMoney(order, ['discountAmount', 'discount']),
    totalAmount: getMoney(order.totalAmount, true),
    items: order.items.map(mapOrderItem),
    address: mapShippingAddress(order.shippingAddress ?? order.address),
  };
}

function getPage(response) {
  if (Array.isArray(response)) {
    return { content: response, totalPages: 1 };
  }
  if (!isRecord(response) || !Array.isArray(response.content)) {
    throw new InvalidOrderResponseError();
  }

  const totalPages = response.totalPages;
  if (totalPages !== undefined && (!Number.isInteger(totalPages) || totalPages < 0)) {
    throw new InvalidOrderResponseError();
  }
  return {
    content: response.content,
    totalPages: totalPages ?? 1,
  };
}

export async function createOrder({ items, shippingAddress }, token, idempotencyKey) {
  requireToken(token);
  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 100 ||
    typeof idempotencyKey !== 'string' ||
    !idempotencyKey.trim() ||
    idempotencyKey.length > 128 ||
    !isRecord(shippingAddress)
  ) {
    throw new Error('Confira os itens e o endereço antes de finalizar o pedido.');
  }

  const seenProductIds = new Set();
  const orderItems = items.map(({ productId, quantity }) => {
    const normalizedProductId = normalizePositiveInt64(productId);
    if (
      !normalizedProductId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ORDER_QUANTITY ||
      seenProductIds.has(normalizedProductId)
    ) {
      throw new Error('A sacola contém itens ou quantidades inválidas.');
    }
    seenProductIds.add(normalizedProductId);
    return { productId: normalizedProductId, quantity };
  });

  const addressFields = [
    'zipCode',
    'street',
    'number',
    'neighborhood',
    'city',
    'state',
  ];
  if (
    !addressFields.every(
      (field) => typeof shippingAddress[field] === 'string' && shippingAddress[field].trim(),
    )
  ) {
    throw new Error('Preencha todos os campos obrigatórios do endereço de entrega.');
  }

  const itemsJson = orderItems
    .map(({ productId, quantity }) => `{"productId":${productId},"quantity":${quantity}}`)
    .join(',');
  const body = `{"items":[${itemsJson}],"shippingAddress":${JSON.stringify(shippingAddress)}}`;
  const response = await apiRequest(
    '/ws/orders',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body,
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );

  if (
    ![200, 201].includes(response.status) ||
    !isRecord(response.data)
  ) {
    throw new InvalidOrderResponseError();
  }
  return mapOrder(response.data);
}

export async function listOrders(token) {
  requireToken(token);
  const orders = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await apiRequest(
      `/ws/orders?page=${page}&size=100&targetCurrency=BRL`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      { parseJson: parseJsonPreservingInt64 },
    );
    const result = getPage(response);
    totalPages = result.totalPages;
    orders.push(...result.content.map(mapOrder));
    page += 1;
  }

  return orders;
}

export function getCheckoutSessionErrorMessage(error) {
  if (error instanceof ApiError) {
    if ([502, 503, 504].includes(error.status)) {
      return 'Não foi possível iniciar o pagamento. Tente de novo.';
    }
    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente para pagar.';
    }
    if (error.status === 403) {
      return 'Sua conta não tem permissão para pagar este pedido.';
    }
    if (error.status === 404) {
      return 'Pedido não encontrado. Atualize seus pedidos e tente de novo.';
    }
    if (error.status === 409) {
      return 'Este pedido não pode mais ser pago. Atualize seus pedidos.';
    }
    return `Não foi possível iniciar o pagamento (HTTP ${error.status}). Tente de novo.`;
  }
  if (error instanceof InvalidOrderResponseError) {
    return 'Não foi possível iniciar o pagamento: resposta inválida do servidor. Tente de novo.';
  }
  return 'Não foi possível iniciar o pagamento. Verifique a conexão e tente de novo.';
}

export async function createCheckoutSession(orderId, token) {
  requireToken(token);
  const normalizedOrderId = getIdentifier(orderId);
  const response = await apiRequest(
    `/ws/payments/orders/${encodeURIComponent(normalizedOrderId)}/checkout-session`,
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

  if (response.status !== 200 || !isRecord(response.data)) {
    throw new InvalidOrderResponseError();
  }

  const paymentId = normalizePositiveInt64(response.data.paymentId);
  const responseOrderId = normalizePositiveInt64(response.data.orderId);
  let checkoutUrl;
  try {
    checkoutUrl = new URL(response.data.checkoutUrl);
  } catch {
    throw new InvalidOrderResponseError();
  }
  if (
    !paymentId ||
    responseOrderId !== normalizedOrderId ||
    response.data.status !== 'PENDING' ||
    checkoutUrl.protocol !== 'https:' ||
    checkoutUrl.hostname !== 'checkout.stripe.com'
  ) {
    throw new InvalidOrderResponseError();
  }

  return {
    paymentId,
    orderId: normalizedOrderId,
    status: response.data.status,
    checkoutUrl: checkoutUrl.toString(),
  };
}

export async function getPaymentStatus(orderId, token) {
  requireToken(token);
  const normalizedOrderId = getIdentifier(orderId);
  let response;
  try {
    response = await apiRequest(
      `/ws/payments/orders/${encodeURIComponent(normalizedOrderId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      { parseJson: parseJsonPreservingInt64 },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }

  const paymentId = normalizePositiveInt64(response?.paymentId);
  const responseOrderId = normalizePositiveInt64(response?.orderId);
  if (
    !isRecord(response) ||
    !paymentId ||
    responseOrderId !== normalizedOrderId ||
    !paymentStatuses.includes(response.status) ||
    typeof response.currency !== 'string' ||
    !Number.isFinite(response.amount) ||
    response.amount < 0
  ) {
    throw new InvalidOrderResponseError();
  }

  return {
    paymentId,
    orderId: normalizedOrderId,
    status: response.status,
    amount: response.amount,
    currency: response.currency,
  };
}
