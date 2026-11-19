import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequest } from '../src/services/apiClient.js';
import { isNonNegativeInt64, MAX_INT64, normalizePositiveInt64 } from '../src/services/int64.js';
import { parseJsonPreservingInt64 } from '../src/services/losslessJson.js';
import { isDefinitivePostStatus } from '../src/services/postOutcome.js';

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
});

test('POST outcome rejection statuses are allowlisted per operation', () => {
  for (const status of [400, 401, 403]) {
    assert.equal(isDefinitivePostStatus(status, 'productCreation'), true);
  }
  for (const status of [408, 409, 429, 500, 503]) {
    assert.equal(isDefinitivePostStatus(status, 'productCreation'), false);
  }
  assert.equal(isDefinitivePostStatus(400, 'unknownOperation'), false);

  for (const operation of ['inventoryRegistration', 'inventoryEntry']) {
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
