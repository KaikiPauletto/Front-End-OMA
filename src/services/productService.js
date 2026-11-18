import { apiRequest } from './apiClient';

export const productSortOptions = [
  { id: 'name-asc', label: 'Nome: A - Z', sort: 'name,asc' },
  { id: 'name-desc', label: 'Nome: Z - A', sort: 'name,desc' },
  { id: 'price-asc', label: 'Menor preço', sort: 'price,asc' },
  { id: 'price-desc', label: 'Maior preço', sort: 'price,desc' },
  { id: 'description-asc', label: 'Descrição: A - Z', sort: 'description,asc' },
  { id: 'description-desc', label: 'Descrição: Z - A', sort: 'description,desc' },
];

export class InvalidCatalogResponseError extends Error {
  constructor() {
    super('A API retornou uma resposta de catálogo inválida.');
    this.name = 'InvalidCatalogResponseError';
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasIdentifier(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.trim().length > 0);
}

function mapProduct(product) {
  if (
    !isRecord(product) ||
    !hasIdentifier(product.id) ||
    typeof product.name !== 'string' ||
    typeof product.description !== 'string' ||
    !Number.isFinite(product.convertedPrice) ||
    !['SINGLE_UNIT', 'MULTI_UNIT'].includes(product.productType)
  ) {
    throw new InvalidCatalogResponseError();
  }

  return {
    ...product,
    id: String(product.id),
    category: hasIdentifier(product.categoryId) ? String(product.categoryId) : '',
    subcategory: hasIdentifier(product.subcategoryId) ? String(product.subcategoryId) : '',
    image: typeof product.image === 'string' && product.image.trim()
      ? { uri: product.image }
      : null,
    price: product.convertedPrice,
    type: product.productType === 'SINGLE_UNIT' ? 'UNITÁRIO' : 'QUANTITATIVO',
  };
}

function mapNamedResource(resource) {
  if (
    !isRecord(resource) ||
    !hasIdentifier(resource.id) ||
    typeof resource.name !== 'string' ||
    !resource.name.trim()
  ) {
    throw new InvalidCatalogResponseError();
  }

  return { ...resource, id: String(resource.id) };
}

function queryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export async function listProducts({
  name,
  categoryId,
  subcategoryId,
  minPrice,
  maxPrice,
  sort = 'description,asc',
  page = 0,
  size = 10,
}) {
  const query = queryString({
    name: name?.trim(),
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    targetCurrency: 'BRL',
    sort,
    page,
    size,
  });
  const response = await apiRequest(`/products?${query}`);

  if (
    !isRecord(response) ||
    !Array.isArray(response.content) ||
    !Number.isInteger(response.number) ||
    !Number.isInteger(response.totalPages) ||
    !Number.isFinite(response.totalElements)
  ) {
    throw new InvalidCatalogResponseError();
  }

  return {
    products: response.content.map(mapProduct),
    page: response.number,
    totalPages: response.totalPages,
    totalElements: response.totalElements,
  };
}

export async function listCategories() {
  const response = await apiRequest('/categories');
  if (!Array.isArray(response)) {
    throw new InvalidCatalogResponseError();
  }
  return response.map(mapNamedResource);
}

export async function listSubcategories(categoryId) {
  const response = await apiRequest(`/categories/${encodeURIComponent(categoryId)}/subcategories`);
  if (!Array.isArray(response)) {
    throw new InvalidCatalogResponseError();
  }
  return response.map(mapNamedResource);
}
