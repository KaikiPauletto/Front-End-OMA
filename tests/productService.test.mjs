import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProduct,
  listAdminConfirmedSales,
  normalizeProductImageUrl,
  updateProduct,
} from '../src/services/productService.js';

test('product image URL accepts HTTP URLs and rejects malformed or unsafe URLs', () => {
  assert.equal(
    normalizeProductImageUrl('  https://images.example/cuia.jpg  '),
    'https://images.example/cuia.jpg',
  );
  assert.equal(normalizeProductImageUrl('  '), null);
  assert.throws(
    () => normalizeProductImageUrl('not-a-url'),
    /URL válida/,
  );
  assert.throws(
    () => normalizeProductImageUrl('javascript:alert(1)'),
    /http:\/\/ ou https:\/\//,
  );
});

test('product creation and editing send the selected image URL to the API', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.equal(JSON.parse(options.body).image, 'https://images.example/cuia.jpg');
    return new Response(JSON.stringify({ id: 42 }), {
      status: options.method === 'POST' ? 201 : 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const product = {
      name: 'Cuia artesanal',
      image: 'https://images.example/cuia.jpg',
    };
    const created = await createProduct(product, 'admin-token');
    assert.equal(created.id, '42');
    await updateProduct('42', product, 'admin-token');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('confirmed sales requests confirmed admin orders and flattens their items', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    assert.equal(
      url,
      'https://gateway.example/ws/admin/orders?status=CONFIRMED&page=0&size=10&sort=confirmedAt%2Cdesc',
    );
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    return new Response(
      JSON.stringify({
        content: [{
          id: 20,
          status: 'CONFIRMED',
          orderDate: '2026-11-20T12:00:00Z',
          confirmedAt: '2026-11-20T12:05:00Z',
          items: [{
            id: 41,
            productId: 7,
            productName: 'Cuia artesanal',
            productImage: 'https://images.example/cuia.jpg',
            quantity: 2,
            subtotal: 150,
          }],
        }],
        number: 0,
        totalPages: 1,
        totalElements: 1,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await listAdminConfirmedSales({
      page: 0,
      size: 10,
      token: 'admin-token',
    });

    assert.equal(result.totalOrders, 1);
    assert.equal(result.sales.length, 1);
    assert.equal(result.sales[0].orderId, '20');
    assert.equal(result.sales[0].productId, '7');
    assert.equal(result.sales[0].productImage.uri, 'https://images.example/cuia.jpg');
    assert.equal(result.sales[0].quantity, 2);
    assert.equal(result.sales[0].subtotal, 150);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('confirmed sales rejects orders that are not confirmed', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      content: [{ id: 20, status: 'PENDING_PAYMENT', items: [] }],
      number: 0,
      totalPages: 1,
      totalElements: 1,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );

  try {
    await assert.rejects(
      listAdminConfirmedSales({ page: 0, size: 10, token: 'admin-token' }),
      /resposta de catálogo inválida/,
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
