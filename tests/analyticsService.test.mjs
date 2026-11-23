import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAdminAnalytics,
  getAnalyticsPeriod,
} from '../src/services/analyticsService.js';

function setupAnalyticsResponses() {
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;
  const previousFetch = globalThis.fetch;
  process.env.EXPO_PUBLIC_API_URL = 'https://gateway.example';
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer admin-token');
    const requestUrl = new URL(url);
    if (requestUrl.pathname === '/ws/admin/analytics/overview') {
      assert.match(requestUrl.searchParams.get('from'), /^\d{4}-\d{2}-\d{2}$/);
      assert.match(requestUrl.searchParams.get('to'), /^\d{4}-\d{2}-\d{2}$/);
      return new Response(JSON.stringify({
        totalRevenue: 219.5,
        confirmedOrders: 1,
        averageTicket: 219.5,
        unitsSold: 5,
        topProducts: [{
          productName: 'Cuia artesanal',
          units: 3,
          revenue: 149.5,
        }],
        topCategories: [{
          categoryName: 'Cuias',
          revenue: 219.5,
          revenueShare: 100,
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    assert.equal(requestUrl.pathname, '/ws/admin/analytics/sales');
    assert.match(requestUrl.searchParams.get('from'), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(requestUrl.searchParams.get('to'), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(requestUrl.searchParams.get('granularity'), 'MONTH');
    return new Response(JSON.stringify({
      granularity: 'MONTH',
      totals: { revenue: 219.5, orders: 1, units: 5, averageTicket: 219.5 },
      points: [{ periodStart: '2026-11-01', revenue: 219.5, orders: 1, units: 5 }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  return () => {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  };
}

test('admin analytics loads overview and monthly sales with the admin token', async () => {
  const cleanup = setupAnalyticsResponses();
  try {
    const result = await getAdminAnalytics('admin-token');

    assert.equal(result.overview.totalRevenue, 219.5);
    assert.equal(result.overview.confirmedOrders, 1);
    assert.equal(result.overview.topProducts[0].productName, 'Cuia artesanal');
    assert.equal(result.overview.topCategories[0].categoryName, 'Cuias');
    assert.deepEqual(result.sales, [{ periodStart: '2026-11-01', revenue: 219.5 }]);
    assert.equal(result.period.from, getAnalyticsPeriod().from);
  } finally {
    cleanup();
  }
});

test('analytics period covers five years using the Sao Paulo calendar date', () => {
  assert.deepEqual(getAnalyticsPeriod(new Date('2026-11-22T18:00:00.000Z')), {
    from: '2021-11-22',
    to: '2026-11-22',
  });
});

test('admin analytics rejects an invalid sales response', async () => {
  const cleanup = setupAnalyticsResponses();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (new URL(url).pathname.endsWith('/overview')) {
      return previousFetch(url, options);
    }
    return new Response(JSON.stringify({ points: [{ periodStart: 'invalid', revenue: 1 }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await assert.rejects(getAdminAnalytics('admin-token'), /resposta de analytics inválida/);
  } finally {
    cleanup();
  }
});
