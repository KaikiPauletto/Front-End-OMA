import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/services/apiClient.js';
import {
  addCartItem,
  getCart,
  InvalidCartResponseError,
  removeCartItem,
  updateCartItemQuantity,
} from '../src/services/cartService.js';
import { MAX_INT64 } from '../src/services/int64.js';
import { getProductById, listProducts } from '../src/services/productService.js';

const cartJson = '{"id":9223372036854775807,"version":2,' +
  '"createdAt":"2026-11-10T12:00:00Z","updatedAt":"2026-11-10T12:10:00Z",' +
  '"currency":"BRL","estimatedSubtotal":150.00,"estimateComplete":true,' +
  '"items":[{"productId":9223372036854775807,"name":"Cuia artesanal",' +
  '"brand":"Marca Gaúcha","model":"CU-01","image":null,' +
  '"productType":"MULTI_UNIT","active":true,"productAvailable":true,' +
  '"desiredQuantity":2,"quantityOnHand":9007199254740993,' +
  '"quantityReserved":1,"availableQuantity":9007199254740992,' +
  '"unitPrice":75.00,"estimatedSubtotal":150.00,"available":true,' +
  '"addedAt":"2026-11-10T12:00:00Z","updatedAt":"2026-11-10T12:00:00Z"}]}';

async function withApi(fetchImpl, callback) {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = fetchImpl;

  try {
    await callback();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
}

test('cart GET authenticates and preserves Long IDs and inventory values', async () => {
  await withApi(async (url, options) => {
    assert.equal(url, 'https://gateway.example/ws/cart');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer customer-token');
    assert.equal(options.headers['X-User-Id'], undefined);
    assert.equal(options.headers['X-User-Type'], undefined);
    assert.equal(options.headers['X-User-Email'], undefined);
    assert.equal(options.headers['X-Service-Token'], undefined);
    return new Response(cartJson, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const cart = await getCart('customer-token');
    assert.equal(cart.id, MAX_INT64);
    assert.equal(cart.items[0].productId, MAX_INT64);
    assert.equal(cart.items[0].quantityOnHand, '9007199254740993');
    assert.equal(cart.items[0].availableQuantity, '9007199254740992');
  });
});

test('POST sends the absolute upsert quantity and exact Long product ID', async () => {
  await withApi(async (url, options) => {
    assert.equal(url, 'https://gateway.example/ws/cart/items');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer customer-token');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(
      options.body,
      '{"productId":9223372036854775807,"quantity":3}',
    );
    return new Response(cartJson, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const cart = await addCartItem(MAX_INT64, 3, 'customer-token');
    assert.equal(cart.items[0].desiredQuantity, 2);
  });
});

test('PATCH and DELETE use the public item routes and DELETE requires 204', async () => {
  const calls = [];
  await withApi(async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'PATCH') {
      assert.equal(options.body, '{"quantity":3}');
      return new Response(cartJson, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  }, async () => {
    await updateCartItemQuantity(MAX_INT64, 3, 'customer-token');
    await removeCartItem(MAX_INT64, 'customer-token');
  });

  assert.equal(calls[0].url, 'https://gateway.example/ws/cart/items/9223372036854775807');
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[1].url, 'https://gateway.example/ws/cart/items/9223372036854775807');
  assert.equal(calls[1].options.method, 'DELETE');
});

test('cart service rejects invalid payloads and preserves HTTP status errors', async () => {
  await withApi(async () => new Response(
    '{"id":7,"version":0,"currency":"BRL","estimateComplete":true,' +
    '"estimatedSubtotal":0,"items":[{"productId":7}]}',
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ), async () => {
    await assert.rejects(getCart('customer-token'), InvalidCartResponseError);
  });

  await withApi(async () => new Response('Not found', { status: 404 }), async () => {
    await assert.rejects(
      getCart('customer-token'),
      (error) => error instanceof ApiError && error.status === 404,
    );
  });
});

test('public product listing preserves Long IDs before products reach the cart', async () => {
  const productJson = '{"id":9223372036854775807,"name":"Produto exemplo",' +
    '"description":"Produto para teste","convertedPrice":10.5,' +
    '"active":true,"productType":"MULTI_UNIT"}';
  await withApi(async (url) => {
    let body;
    if (url.includes('/products?')) {
      assert.match(url, /^https:\/\/gateway\.example\/products\?/);
      body = `{"content":[${productJson}],"number":0,"totalPages":1,"totalElements":9223372036854775807}`;
    } else {
      assert.equal(
        url,
        'https://gateway.example/products/9223372036854775807?targetCurrency=BRL',
      );
      body = productJson;
    }
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const result = await listProducts({});
    const product = await getProductById(MAX_INT64);
    assert.equal(result.products[0].id, MAX_INT64);
    assert.equal(result.totalElements, MAX_INT64);
    assert.equal(product.id, MAX_INT64);
  });
});
