import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupBrazilianPostalCode } from '../src/services/cepService.js';

async function withFetch(fetchImpl, callback) {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await callback();
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test('ViaCEP lookup strips punctuation and returns city and state', async () => {
  await withFetch(async (url) => {
    assert.equal(url, 'https://viacep.com.br/ws/99010000/json/');
    return new Response(
      JSON.stringify({ localidade: 'Passo Fundo', uf: 'RS' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }, async () => {
    assert.deepEqual(await lookupBrazilianPostalCode('99010-000'), {
      city: 'Passo Fundo',
      state: 'RS',
    });
  });
});

test('ViaCEP lookup rejects invalid and unknown postal codes', async () => {
  await assert.rejects(
    lookupBrazilianPostalCode('123'),
    /Informe um CEP válido/,
  );

  await withFetch(async () => new Response(
    JSON.stringify({ erro: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ), async () => {
    await assert.rejects(
      lookupBrazilianPostalCode('00000000'),
      /CEP não encontrado/,
    );
  });
});
