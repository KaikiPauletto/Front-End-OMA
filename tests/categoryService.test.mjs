import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCategory,
  createSubcategory,
  listCategories,
  listSubcategories,
  setCategoryActive,
  setSubcategoryActive,
  updateCategory,
  updateSubcategory,
} from '../src/services/productService.js';

const adminToken = 'admin-token';

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function withMockedApi(run) {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
}

test('category reads use an optional admin token and retain active state and Long IDs', async () => {
  await withMockedApi(async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return jsonResponse([{
        id: '9007199254740993',
        name: 'Cuias',
        active: false,
      }], 200);
    };

    const categories = await listCategories(adminToken);
    const subcategories = await listSubcategories('9007199254740993', adminToken);

    assert.equal(categories[0].id, '9007199254740993');
    assert.equal(categories[0].active, false);
    assert.equal(subcategories[0].id, '9007199254740993');
    assert.equal(calls[0].url, 'https://gateway.example/categories');
    assert.equal(calls[0].options.headers.Authorization, `Bearer ${adminToken}`);
    assert.equal(
      calls[1].url,
      'https://gateway.example/categories/9007199254740993/subcategories',
    );
    assert.equal(calls[1].options.headers.Authorization, `Bearer ${adminToken}`);
  });
});

test('category and subcategory create, edit, and status actions use the documented routes', async () => {
  await withMockedApi(async () => {
    const calls = [];
    const responses = [
      [{ id: 2, name: 'Cuia', active: true }, 201],
      [{ id: 2, name: 'Cuias', active: true }, 200],
      [{ id: 2, name: 'Cuias', active: false }, 200],
      [{ id: 7, categoryId: 2, name: 'Porongo', active: true }, 201],
      [{ id: 7, categoryId: 3, name: 'Porongo artesanal', active: true }, 200],
      [{ id: 7, categoryId: 3, name: 'Porongo artesanal', active: false }, 200],
    ];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      const [data, status] = responses.shift();
      return jsonResponse(data, status);
    };

    await createCategory('Cuia', adminToken);
    await updateCategory('2', 'Cuias', adminToken);
    await setCategoryActive('2', false, adminToken);
    await createSubcategory('2', 'Porongo', adminToken);
    await updateSubcategory('7', '3', 'Porongo artesanal', adminToken);
    await setSubcategoryActive('7', false, adminToken);

    assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
      ['https://gateway.example/ws/categories', 'POST'],
      ['https://gateway.example/ws/categories/2', 'PUT'],
      ['https://gateway.example/ws/categories/2/status', 'PATCH'],
      ['https://gateway.example/ws/subcategories', 'POST'],
      ['https://gateway.example/ws/subcategories/7', 'PUT'],
      ['https://gateway.example/ws/subcategories/7/status', 'PATCH'],
    ]);
    for (const { options } of calls) {
      assert.equal(options.headers.Authorization, `Bearer ${adminToken}`);
    }
    assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'Cuia' });
    assert.deepEqual(JSON.parse(calls[2].options.body), { active: false });
    assert.deepEqual(JSON.parse(calls[3].options.body), {
      categoryId: 2,
      name: 'Porongo',
    });
    assert.deepEqual(JSON.parse(calls[4].options.body), {
      categoryId: 3,
      name: 'Porongo artesanal',
    });
    assert.deepEqual(JSON.parse(calls[5].options.body), { active: false });
  });
});

test('subcategory writes serialize Long category IDs as exact JSON numbers', async () => {
  await withMockedApi(async () => {
    let requestBody;
    globalThis.fetch = async (_url, options) => {
      requestBody = options.body;
      return jsonResponse({
        id: '11',
        categoryId: '9007199254740993',
        name: 'Cuia especial',
        active: true,
      }, 201);
    };

    const result = await createSubcategory(
      '9007199254740993',
      'Cuia especial',
      adminToken,
    );

    assert.match(requestBody, /"categoryId":9007199254740993/);
    assert.equal(result.categoryId, '9007199254740993');
  });
});

test('category write operations require an admin token and valid names', async () => {
  await assert.rejects(createCategory('Nova'), /sessão não está válida/);
  await assert.rejects(createCategory('  ', adminToken), /nome deve conter/);
  await assert.rejects(createSubcategory('0', 'Porongo', adminToken), /identificador da categoria/);
});
