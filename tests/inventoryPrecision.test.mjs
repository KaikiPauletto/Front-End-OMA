import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, apiRequest } from '../src/services/apiClient.js';
import {
  addNonNegativeInt64,
  isNonNegativeInt64,
  isSignedInt64,
  MAX_INT64,
  MIN_INT64,
  normalizePositiveInt64,
  normalizeSignedInt64,
} from '../src/services/int64.js';
import {
  adjustProductInventory,
  getProductInventory,
  InvalidInventoryResponseError,
  listInventory,
  listInventoryMovements,
  registerInventoryEntry,
  registerProductInventory,
  setLowStockThreshold,
} from '../src/services/inventoryService.js';
import { parseJsonPreservingInt64 } from '../src/services/losslessJson.js';
import { isDefinitivePostStatus } from '../src/services/postOutcome.js';
import {
  getAdminProductById,
  listAdminProducts,
} from '../src/services/productService.js';

test('lossless parser preserves unsafe integer tokens and retains safe decimals', () => {
  const parsed = parseJsonPreservingInt64(
    '{"safe":9007199254740991,"firstUnsafe":9007199254740992,' +
    '"productId":9223372036854775807,"decimal":75.25}',
  );

  assert.equal(parsed.safe, Number.MAX_SAFE_INTEGER);
  assert.equal(parsed.firstUnsafe, '9007199254740992');
  assert.equal(parsed.productId, MAX_INT64);
  assert.equal(parsed.decimal, 75.25);
  assert.equal(normalizePositiveInt64(parsed.productId), MAX_INT64);
});

test('int64 validators reject unsafe Number values and values above Long.MAX_VALUE', () => {
  assert.equal(isNonNegativeInt64(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isNonNegativeInt64(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isNonNegativeInt64('9007199254740992'), true);
  assert.equal(isNonNegativeInt64(MAX_INT64), true);
  assert.equal(isNonNegativeInt64('9223372036854775808'), false);
  assert.equal(normalizePositiveInt64(Number.MAX_SAFE_INTEGER + 1), null);
  assert.equal(addNonNegativeInt64('9007199254740992', '1'), '9007199254740993');
  assert.equal(addNonNegativeInt64(MAX_INT64, '1'), null);
  assert.equal(normalizeSignedInt64(MIN_INT64), MIN_INT64);
  assert.equal(normalizeSignedInt64('-0'), '0');
  assert.equal(isSignedInt64('-9007199254740993'), true);
  assert.equal(isSignedInt64('-9223372036854775809'), false);
});

test('POST outcome rejection statuses are allowlisted per operation', () => {
  for (const status of [400, 401, 403]) {
    assert.equal(isDefinitivePostStatus(status, 'productCreation'), true);
  }
  for (const status of [408, 409, 429, 500, 503]) {
    assert.equal(isDefinitivePostStatus(status, 'productCreation'), false);
  }
  assert.equal(isDefinitivePostStatus(400, 'unknownOperation'), false);

  for (const operation of [
    'inventoryRegistration',
    'inventoryEntry',
    'inventoryExit',
    'inventoryAdjustment',
    'inventoryThreshold',
  ]) {
    for (const status of [400, 401, 403, 404, 409]) {
      assert.equal(isDefinitivePostStatus(status, operation), true);
    }
    for (const status of [408, 429, 500, 502, 503]) {
      assert.equal(isDefinitivePostStatus(status, operation), false);
    }
  }
});

test('apiRequest uses the lossless parser only when explicitly selected', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async () => new Response(
    '{"id":9223372036854775807,"price":75.25}',
    { headers: { 'Content-Type': 'application/json' } },
  );

  try {
    const defaultResponse = await apiRequest('/products');
    const losslessResponse = await apiRequest(
      '/ws/products',
      {},
      { parseJson: parseJsonPreservingInt64 },
    );

    assert.equal(typeof defaultResponse.id, 'number');
    assert.equal(losslessResponse.id, MAX_INT64);
    assert.equal(losslessResponse.price, 75.25);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('inventory GET authenticates and preserves 64-bit response values', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://gateway.example/ws/inventory/9223372036854775807');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.equal(options.headers['X-Service-Token'], undefined);

    return new Response(
      '{"productId":9223372036854775807,"productType":"MULTI_UNIT",' +
      '"quantityOnHand":9007199254740993,"quantityReserved":1,' +
      '"availableQuantity":9007199254740992,"lowStockThreshold":9007199254740993,' +
      '"lowStock":true,"createdAt":"2026-01-15T12:00:00Z",' +
      '"updatedAt":"2026-01-16T12:00:00Z"}',
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const inventory = await getProductInventory(
      '9223372036854775807',
      'MULTI_UNIT',
      'admin-token',
    );

    assert.equal(inventory.productId, MAX_INT64);
    assert.equal(inventory.quantityOnHand, '9007199254740993');
    assert.equal(inventory.quantityReserved, 1);
    assert.equal(inventory.availableQuantity, '9007199254740992');
    assert.equal(inventory.lowStockThreshold, '9007199254740993');
    assert.equal(inventory.lowStock, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('inventory GET rejects incompatible responses and preserves HTTP errors', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';

  try {
    globalThis.fetch = async () => new Response(
      '{"productId":7,"productType":"MULTI_UNIT","quantityOnHand":9223372036854775808,' +
      '"quantityReserved":0,"availableQuantity":0,"lowStockThreshold":0,' +
      '"lowStock":false,"createdAt":"2026-01-15T12:00:00Z",' +
      '"updatedAt":"2026-01-16T12:00:00Z"}',
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
    await assert.rejects(
      getProductInventory('7', 'MULTI_UNIT', 'admin-token'),
      InvalidInventoryResponseError,
    );

    globalThis.fetch = async (_url, options) => {
      assert.equal(options.method, 'GET');
      return new Response('Not found', { status: 404 });
    };
    await assert.rejects(
      getProductInventory('7', 'MULTI_UNIT', 'admin-token'),
      (error) => error instanceof ApiError && error.status === 404,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('inventory and movement pages preserve Long values and use only the admin Bearer token', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, undefined);
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.equal(options.headers['X-Service-Token'], undefined);

    if (url.includes('/ws/inventory/movements?')) {
      return new Response(
        '{"content":[{"id":9223372036854775807,"productId":7,' +
        '"movementType":"MANUAL_EXIT","quantityDelta":-9007199254740993,' +
        '"reason":"Ajuste manual","orderId":null,"reservationId":null,' +
        '"createdAt":"2026-01-16T12:00:00Z"}],"number":0,"size":20,' +
        '"totalPages":1,"totalElements":9223372036854775807}',
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    assert.equal(
      url,
      'https://gateway.example/ws/inventory?productType=MULTI_UNIT&lowStock=true&page=0&size=20',
    );
    return new Response(
      '{"content":[{"productId":9223372036854775807,"productType":"MULTI_UNIT",' +
      '"quantityOnHand":9007199254740993,"quantityReserved":1,' +
      '"availableQuantity":9007199254740992,"lowStockThreshold":5,' +
      '"lowStock":true,"createdAt":"2026-01-15T12:00:00Z",' +
      '"updatedAt":"2026-01-16T12:00:00Z"}],"number":0,"size":20,' +
      '"totalPages":1,"totalElements":9223372036854775807}',
      { headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const inventoryPage = await listInventory({
      productType: 'MULTI_UNIT',
      lowStock: true,
      token: 'admin-token',
    });
    const movementPage = await listInventoryMovements('admin-token');

    assert.equal(inventoryPage.items[0].productId, MAX_INT64);
    assert.equal(inventoryPage.items[0].quantityOnHand, '9007199254740993');
    assert.equal(inventoryPage.totalElements, MAX_INT64);
    assert.equal(movementPage.items[0].id, MAX_INT64);
    assert.equal(movementPage.items[0].quantityDelta, '-9007199254740993');
    assert.equal(movementPage.totalElements, MAX_INT64);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('inventory write requests serialize 64-bit quantities as exact JSON integer tokens', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.equal(options.headers['X-Service-Token'], undefined);

    return new Response(
      '{"productId":7,"productType":"MULTI_UNIT","quantityOnHand":0,' +
      '"quantityReserved":0,"availableQuantity":0,"lowStockThreshold":0,' +
      '"lowStock":false,"createdAt":"2026-01-15T12:00:00Z",' +
      '"updatedAt":"2026-01-16T12:00:00Z"}',
      { headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    await registerProductInventory('7', 'MULTI_UNIT', 'admin-token');
    await registerInventoryEntry('7', 'MULTI_UNIT', MAX_INT64, 'Entrada longa', 'admin-token');
    await adjustProductInventory('7', 'MULTI_UNIT', MAX_INT64, 'Ajuste longo', 'admin-token');
    await setLowStockThreshold('7', 'MULTI_UNIT', MAX_INT64, 'admin-token');

    assert.deepEqual(
      requests.map(({ url, options }) => [url, options.method, options.body]),
      [
        [
          'https://gateway.example/ws/inventory/7/registration',
          'POST',
          undefined,
        ],
        [
          'https://gateway.example/ws/inventory/7/entries',
          'POST',
          `{"quantity":${MAX_INT64},"reason":"Entrada longa"}`,
        ],
        [
          'https://gateway.example/ws/inventory/7/adjustments',
          'POST',
          `{"newQuantity":${MAX_INT64},"reason":"Ajuste longo"}`,
        ],
        [
          'https://gateway.example/ws/inventory/7/low-stock-threshold',
          'PATCH',
          `{"threshold":${MAX_INT64}}`,
        ],
      ],
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('admin product list and details preserve 64-bit product IDs', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  const productResponse = '{"id":9223372036854775807,"name":"Produto exemplo",' +
    '"description":"Produto para teste","convertedPrice":10.5,"price":10.5,' +
    '"active":true,"productType":"MULTI_UNIT","categoryId":1,"subcategoryId":2}';
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    const body = url.includes('/ws/products?')
      ? `{"content":[${productResponse}],"number":0,"totalPages":1,"totalElements":9223372036854775807}`
      : productResponse;
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const result = await listAdminProducts({ token: 'admin-token' });
    const product = await getAdminProductById(MAX_INT64, 'admin-token');

    assert.equal(result.products[0].id, MAX_INT64);
    assert.equal(result.totalElements, MAX_INT64);
    assert.equal(product.id, MAX_INT64);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});
