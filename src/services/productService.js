import { apiRequest } from './apiClient';
import { normalizePositiveInt64 } from './int64';
import { parseJsonPreservingInt64 } from './losslessJson';

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
    typeof product.active !== 'boolean' ||
    !['SINGLE_UNIT', 'MULTI_UNIT'].includes(product.productType)
  ) {
    throw new InvalidCatalogResponseError();
  }
  if (product.convertedPrice < 0) {
    throw new Error('Não foi possível obter o preço do produto em BRL.');
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
    originalPrice: Number.isFinite(product.price) ? product.price : product.convertedPrice,
    type: product.productType === 'SINGLE_UNIT' ? 'UNITÁRIO' : 'QUANTITATIVO',
  };
}

export async function getProductById(productId) {
  const response = await apiRequest(
    `/products/${encodeURIComponent(productId)}?targetCurrency=BRL`,
  );
  return mapProduct(response);
}

export async function getAdminProductById(productId, token) {
  if (!hasIdentifier(productId)) {
    throw new Error('O identificador do produto é inválido.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const response = await apiRequest(
    `/ws/products/${encodeURIComponent(productId)}?targetCurrency=BRL`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return mapProduct(response);
}

export async function createProduct(product, token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const response = await apiRequest(
    '/ws/products',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    },
    {
      includeStatus: true,
      parseJson: parseJsonPreservingInt64,
    },
  );

  if (
    response.status !== 201 ||
    !isRecord(response.data)
  ) {
    throw new InvalidCatalogResponseError();
  }

  const id = normalizePositiveInt64(response.data.id);
  if (!id) {
    throw new InvalidCatalogResponseError();
  }

  return { ...response.data, id };
}

export async function updateProduct(productId, product, token) {
  if (!hasIdentifier(productId)) {
    throw new Error('O identificador do produto é inválido.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const response = await apiRequest(
    `/ws/products/${encodeURIComponent(productId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    },
    { includeStatus: true },
  );

  if (
    response.status !== 200 ||
    !isRecord(response.data) ||
    !hasIdentifier(response.data.id) ||
    String(response.data.id) !== String(productId)
  ) {
    throw new InvalidCatalogResponseError();
  }

  return response.data;
}

export async function setProductActive(productId, active, token) {
  if (!hasIdentifier(productId)) {
    throw new Error('O identificador do produto é inválido.');
  }
  if (typeof active !== 'boolean') {
    throw new Error('O status do produto deve ser ativo ou inativo.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const response = await apiRequest(
    `/ws/products/${encodeURIComponent(productId)}/status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active }),
    },
    { includeStatus: true },
  );

  if (
    response.status !== 200 ||
    !isRecord(response.data) ||
    !hasIdentifier(response.data.id) ||
    String(response.data.id) !== String(productId) ||
    response.data.active !== active
  ) {
    throw new InvalidCatalogResponseError();
  }

  return response.data;
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

export async function listAdminProducts({
  name,
  categoryId,
  subcategoryId,
  minPrice,
  maxPrice,
  status = 'ACTIVE',
  sort = 'description,asc',
  page = 0,
  size = 10,
  token,
}) {
  if (!['ACTIVE', 'INACTIVE', 'ALL'].includes(status)) {
    throw new Error('O filtro de status deve ser ACTIVE, INACTIVE ou ALL.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const query = queryString({
    name: name?.trim(),
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    targetCurrency: 'BRL',
    status,
    sort,
    page,
    size,
  });
  const response = await apiRequest(
    `/ws/products?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

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
