import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProduct,
  getProductById,
  listAdminConfirmedSales,
  updateProduct,
  uploadProductImage,
} from '../src/services/productService.js';

test('product creation and editing preserve explicitly supplied legacy image URLs', async () => {
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

test('product details preserve every image and use the API primary image as the main image', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://gateway.example/products/42?targetCurrency=BRL');
    return new Response(JSON.stringify({
      id: 42,
      name: 'Cuia artesanal',
      description: 'Cuia de porongo',
      convertedPrice: 75,
      price: 75,
      active: true,
      productType: 'SINGLE_UNIT',
      image: 'https://images.example/legacy.jpg',
      images: [
        {
          id: 8,
          url: 'https://images.example/second.jpg',
          isPrimary: false,
          position: 2,
        },
        {
          id: 7,
          url: 'https://images.example/primary.jpg',
          isPrimary: true,
          position: 1,
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const product = await getProductById('42');
    assert.equal(product.images.length, 2);
    assert.deepEqual(product.images.map((image) => image.id), ['7', '8']);
    assert.equal(product.image.uri, 'https://images.example/primary.jpg');
    assert.equal(product.images[0].isPrimary, true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
});

test('image upload uses the authenticated multipart endpoint and validates its image response', async () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.window = {};
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://gateway.example/ws/products/42/images');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    assert.equal(options.body.get('file').name, 'cuia.png');
    assert.equal(options.headers['Content-Type'], undefined);
    return new Response(JSON.stringify({
      id: 7,
      url: 'https://images.example/cuia.png',
      isPrimary: true,
      position: 1,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const image = await uploadProductImage('42', {
      uri: 'blob:cuia',
      fileName: 'cuia.png',
      mimeType: 'image/png',
      file: new File(['image'], 'cuia.png', { type: 'image/png' }),
    }, 'admin-token');
    assert.equal(image.id, '7');
    assert.equal(image.isPrimary, true);
    assert.equal(image.position, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
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
