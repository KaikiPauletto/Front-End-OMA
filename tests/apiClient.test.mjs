import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiBaseUrl } from '../src/services/apiClient.js';

function withApiUrl(value, run) {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = value;
  }
  try {
    run();
  } finally {
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  }
}

test('uses the local gateway when EXPO_PUBLIC_API_URL is missing or blank', () => {
  for (const value of [undefined, '', '   ']) {
    withApiUrl(value, () => assert.equal(getApiBaseUrl(), 'http://localhost:8080'));
  }
});

test('uses the configured gateway without trailing slashes', () => {
  withApiUrl(' https://gateway.example// ', () => {
    assert.equal(getApiBaseUrl(), 'https://gateway.example');
  });
});
