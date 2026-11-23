import { apiRequest } from './apiClient.js';
import { parseJsonPreservingInt64 } from './losslessJson.js';

export class InvalidAnalyticsResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de analytics inválida.');
    this.name = 'InvalidAnalyticsResponseError';
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toNonNegativeNumber(value) {
  const number = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function formatDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getAnalyticsPeriod(now = new Date()) {
  const { year, month, day } = formatDateParts(now);
  const from = new Date(Date.UTC(Number(year) - 5, Number(month) - 1, Number(day)));

  return {
    from: from.toISOString().slice(0, 10),
    to: `${year}-${month}-${day}`,
  };
}

function validateOverview(response) {
  if (
    !isRecord(response) ||
    !Array.isArray(response.topProducts) ||
    !Array.isArray(response.topCategories)
  ) {
    throw new InvalidAnalyticsResponseError();
  }

  const totalRevenue = toNonNegativeNumber(response.totalRevenue);
  const confirmedOrders = toNonNegativeNumber(response.confirmedOrders);
  const averageTicket = toNonNegativeNumber(response.averageTicket);
  const unitsSold = toNonNegativeNumber(response.unitsSold);

  if (
    totalRevenue === null ||
    confirmedOrders === null ||
    averageTicket === null ||
    unitsSold === null
  ) {
    throw new InvalidAnalyticsResponseError();
  }

  return {
    totalRevenue,
    confirmedOrders,
    averageTicket,
    unitsSold,
    topProducts: response.topProducts.map((product) => {
      if (!isRecord(product) || typeof product.productName !== 'string') {
        throw new InvalidAnalyticsResponseError();
      }

      const units = toNonNegativeNumber(product.units);
      const revenue = toNonNegativeNumber(product.revenue);
      if (units === null || revenue === null) {
        throw new InvalidAnalyticsResponseError();
      }

      return { productName: product.productName, units, revenue };
    }),
    topCategories: response.topCategories.map((category) => {
      if (!isRecord(category) || typeof category.categoryName !== 'string') {
        throw new InvalidAnalyticsResponseError();
      }

      const revenue = toNonNegativeNumber(category.revenue);
      const revenueShare = toNonNegativeNumber(category.revenueShare);
      if (revenue === null || (category.revenueShare !== undefined && revenueShare === null)) {
        throw new InvalidAnalyticsResponseError();
      }

      return {
        categoryName: category.categoryName,
        revenue,
        revenueShare,
      };
    }),
  };
}

function validateSales(response) {
  if (!isRecord(response) || !Array.isArray(response.points)) {
    throw new InvalidAnalyticsResponseError();
  }

  return response.points.map((point) => {
    if (
      !isRecord(point) ||
      typeof point.periodStart !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(point.periodStart)
    ) {
      throw new InvalidAnalyticsResponseError();
    }

    const revenue = toNonNegativeNumber(point.revenue);
    if (revenue === null) {
      throw new InvalidAnalyticsResponseError();
    }

    return { periodStart: point.periodStart, revenue };
  });
}

export async function getAdminAnalytics(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const period = getAnalyticsPeriod();
  const query = `from=${period.from}&to=${period.to}`;
  const headers = { Authorization: `Bearer ${token}` };
  const [overviewResponse, salesResponse] = await Promise.all([
    apiRequest(`/ws/admin/analytics/overview?${query}`, { headers }, {
      parseJson: parseJsonPreservingInt64,
    }),
    apiRequest(`/ws/admin/analytics/sales?${query}&granularity=MONTH`, { headers }, {
      parseJson: parseJsonPreservingInt64,
    }),
  ]);

  return {
    overview: validateOverview(overviewResponse),
    sales: validateSales(salesResponse),
    period,
  };
}
