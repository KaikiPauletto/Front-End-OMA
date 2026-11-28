import { apiRequest } from './apiClient.js';
import { isNonNegativeInt64, normalizePositiveInt64 } from './int64.js';
import { parseJsonPreservingInt64 } from './losslessJson.js';

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

function mapProductImage(image) {
  const id = isRecord(image) ? normalizePositiveInt64(image.id) : null;
  if (
    !isRecord(image) ||
    !id ||
    typeof image.url !== 'string' ||
    !image.url.trim() ||
    typeof image.isPrimary !== 'boolean' ||
    !Number.isInteger(image.position) ||
    image.position < 1
  ) {
    throw new InvalidCatalogResponseError();
  }
  return {
    ...image,
    id,
    url: image.url.trim(),
  };
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

  const images = product.images === undefined || product.images === null
    ? []
    : Array.isArray(product.images)
      ? product.images.map(mapProductImage).sort((left, right) => left.position - right.position)
      : null;
  if (!images) {
    throw new InvalidCatalogResponseError();
  }
  if (images.filter((image) => image.isPrimary).length > 1) {
    throw new InvalidCatalogResponseError();
  }
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];
  const primaryImageUrl = primaryImage?.url ??
    (typeof product.image === 'string' && product.image.trim() ? product.image : null);

  return {
    ...product,
    id: String(product.id),
    category: hasIdentifier(product.categoryId) ? String(product.categoryId) : '',
    subcategory: hasIdentifier(product.subcategoryId) ? String(product.subcategoryId) : '',
    image: primaryImageUrl ? { uri: primaryImageUrl } : null,
    images,
    price: product.convertedPrice,
    originalPrice: Number.isFinite(product.price) ? product.price : product.convertedPrice,
    type: product.productType === 'SINGLE_UNIT' ? 'UNITÁRIO' : 'QUANTITATIVO',
  };
}

export async function getProductById(productId) {
  const response = await apiRequest(
    `/products/${encodeURIComponent(productId)}?targetCurrency=BRL`,
    {},
    { parseJson: parseJsonPreservingInt64 },
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
    {
      parseJson: parseJsonPreservingInt64,
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

export async function uploadProductImage(productId, asset, token) {
  if (!hasIdentifier(productId)) {
    throw new Error('O identificador do produto é inválido.');
  }
  if (!asset?.uri) {
    throw new Error('Selecione uma imagem válida.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const uri = asset.uri;
  const extension = (asset.fileName || uri.split('?')[0]).split('.').pop()?.toLowerCase();
  const supportedExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
  const mimeType = asset.mimeType || (supportedExtension && extension === 'png'
    ? 'image/png'
    : supportedExtension && extension === 'webp'
      ? 'image/webp'
      : 'image/jpeg');
  const fileName = asset.fileName || `produto.${supportedExtension ? extension : 'jpg'}`;
  const formData = new FormData();

  if (typeof window !== 'undefined' && typeof File !== 'undefined') {
    let file = asset.file;

    if (!file) {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Não foi possível ler o arquivo de imagem selecionado.');
      }
      const blob = await response.blob();
      file = new File([blob], fileName, { type: blob.type || mimeType });
    }

    formData.append('file', file, fileName);
  } else {
    formData.append('file', {
      uri,
      name: fileName,
      type: mimeType,
    });
  }

  const response = await apiRequest(
    `/ws/products/${encodeURIComponent(productId)}/images`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
    { includeStatus: true, parseJson: parseJsonPreservingInt64 },
  );

  if (response.status !== 201 || !isRecord(response.data)) {
    throw new InvalidCatalogResponseError();
  }

  return mapProductImage(response.data);
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
  const id = isRecord(resource) ? normalizePositiveInt64(resource.id) : null;
  if (
    !isRecord(resource) ||
    !id ||
    typeof resource.name !== 'string' ||
    !resource.name.trim()
  ) {
    throw new InvalidCatalogResponseError();
  }

  if (resource.active !== undefined && typeof resource.active !== 'boolean') {
    throw new InvalidCatalogResponseError();
  }

  const categoryId = resource.categoryId === undefined
    ? undefined
    : normalizePositiveInt64(resource.categoryId);
  if (resource.categoryId !== undefined && !categoryId) {
    throw new InvalidCatalogResponseError();
  }

  return {
    ...resource,
    id,
    ...(categoryId ? { categoryId } : {}),
  };
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
  const response = await apiRequest(
    `/products?${query}`,
    {},
    { parseJson: parseJsonPreservingInt64 },
  );

  if (
    !isRecord(response) ||
    !Array.isArray(response.content) ||
    !Number.isInteger(response.number) ||
    !Number.isInteger(response.totalPages) ||
    !isNonNegativeInt64(response.totalElements)
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
    {
      parseJson: parseJsonPreservingInt64,
    },
  );

  if (
    !isRecord(response) ||
    !Array.isArray(response.content) ||
    !Number.isInteger(response.number) ||
    !Number.isInteger(response.totalPages) ||
    !isNonNegativeInt64(response.totalElements)
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

export async function listAdminConfirmedSales({ page = 0, size = 20, token }) {
  if (!Number.isInteger(page) || page < 0) {
    throw new Error('A página de vendas solicitada é inválida.');
  }
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new Error('A quantidade de vendas por página é inválida.');
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }

  const query = queryString({
    status: 'CONFIRMED',
    page,
    size,
    sort: 'confirmedAt,desc',
  });
  const response = await apiRequest(
    `/ws/admin/orders?${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    { parseJson: parseJsonPreservingInt64 },
  );

  if (
    !isRecord(response) ||
    !Array.isArray(response.content) ||
    !Number.isInteger(response.number) ||
    !Number.isInteger(response.totalPages) ||
    !isNonNegativeInt64(response.totalElements)
  ) {
    throw new InvalidCatalogResponseError();
  }

  const sales = response.content.flatMap((order) => {
    if (
      !isRecord(order) ||
      !hasIdentifier(order.id) ||
      order.status !== 'CONFIRMED' ||
      !Array.isArray(order.items)
    ) {
      throw new InvalidCatalogResponseError();
    }

    return order.items.map((item) => {
      if (!isRecord(item) || !hasIdentifier(item.productId)) {
        throw new InvalidCatalogResponseError();
      }

      const product = isRecord(item.product) ? item.product : {};
      const productName = item.productName ?? product.name;
      const productImage = item.productImage ?? product.image;
      const quantity = Number(item.quantity);
      const subtotal = Number(item.subtotal);

      if (
        typeof productName !== 'string' ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(subtotal)
      ) {
        throw new InvalidCatalogResponseError();
      }

      return {
        id: `${order.id}:${item.id ?? item.productId}`,
        orderId: String(order.id),
        orderDate: order.confirmedAt ?? order.orderDate,
        productId: String(item.productId),
        productName,
        productImage: typeof productImage === 'string' && productImage.trim()
          ? { uri: productImage }
          : null,
        productCategoryName: item.categoryName ?? item.subcategoryName ?? product.categoryName ?? '',
        quantity,
        subtotal,
      };
    });
  });

  return {
    sales,
    page: response.number,
    totalPages: response.totalPages,
    totalOrders: response.totalElements,
  };
}

function categoryHeaders(token) {
  if (token === undefined) {
    return {};
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }
  return { Authorization: `Bearer ${token}` };
}

function normalizeResourceName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 180) {
    throw new Error('O nome deve conter entre 1 e 180 caracteres.');
  }
  return name.trim();
}

function normalizeResourceId(id, field = 'identificador') {
  const normalizedId = normalizePositiveInt64(id);
  if (!normalizedId) {
    throw new Error(`O ${field} informado é inválido.`);
  }
  return normalizedId;
}

async function writeNamedResource(path, method, body, token, expectedStatus, expectedId) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Sua sessão não está válida. Entre novamente como administrador.');
  }
  const requestBody = body.categoryId
    ? `{"categoryId":${body.categoryId},"name":${JSON.stringify(body.name)}}`
    : JSON.stringify(body);
  const response = await apiRequest(
    path,
    {
      method,
      headers: {
        ...categoryHeaders(token),
        'Content-Type': 'application/json',
      },
      body: requestBody,
    },
    { includeStatus: true, parseJson: parseJsonPreservingInt64 },
  );
  const resource = mapNamedResource(response.data);
  if (
    response.status !== expectedStatus ||
    (expectedId && resource.id !== expectedId) ||
    typeof resource.active !== 'boolean'
  ) {
    throw new InvalidCatalogResponseError();
  }
  return resource;
}

export async function listCategories(token) {
  const response = await apiRequest(
    '/categories',
    { headers: categoryHeaders(token) },
    { parseJson: parseJsonPreservingInt64 },
  );
  if (!Array.isArray(response)) {
    throw new InvalidCatalogResponseError();
  }
  return response.map(mapNamedResource);
}

export async function listSubcategories(categoryId, token) {
  const id = normalizeResourceId(categoryId, 'identificador da categoria');
  const response = await apiRequest(
    `/categories/${encodeURIComponent(id)}/subcategories`,
    { headers: categoryHeaders(token) },
    { parseJson: parseJsonPreservingInt64 },
  );
  if (!Array.isArray(response)) {
    throw new InvalidCatalogResponseError();
  }
  return response.map(mapNamedResource);
}

export async function createCategory(name, token) {
  return writeNamedResource(
    '/ws/categories',
    'POST',
    { name: normalizeResourceName(name) },
    token,
    201,
  );
}

export async function updateCategory(categoryId, name, token) {
  const id = normalizeResourceId(categoryId, 'identificador da categoria');
  return writeNamedResource(
    `/ws/categories/${encodeURIComponent(id)}`,
    'PUT',
    { name: normalizeResourceName(name) },
    token,
    200,
    id,
  );
}

export async function setCategoryActive(categoryId, active, token) {
  const id = normalizeResourceId(categoryId, 'identificador da categoria');
  if (typeof active !== 'boolean') {
    throw new Error('O status da categoria deve ser ativo ou inativo.');
  }
  const category = await writeNamedResource(
    `/ws/categories/${encodeURIComponent(id)}/status`,
    'PATCH',
    { active },
    token,
    200,
    id,
  );
  if (category.active !== active) {
    throw new InvalidCatalogResponseError();
  }
  return category;
}

export async function createSubcategory(categoryId, name, token) {
  const id = normalizeResourceId(categoryId, 'identificador da categoria');
  return writeNamedResource(
    '/ws/subcategories',
    'POST',
    { categoryId: id, name: normalizeResourceName(name) },
    token,
    201,
  );
}

export async function updateSubcategory(subcategoryId, categoryId, name, token) {
  const id = normalizeResourceId(subcategoryId, 'identificador da subcategoria');
  const parentId = normalizeResourceId(categoryId, 'identificador da categoria');
  return writeNamedResource(
    `/ws/subcategories/${encodeURIComponent(id)}`,
    'PUT',
    { categoryId: parentId, name: normalizeResourceName(name) },
    token,
    200,
    id,
  );
}

export async function setSubcategoryActive(subcategoryId, active, token) {
  const id = normalizeResourceId(subcategoryId, 'identificador da subcategoria');
  if (typeof active !== 'boolean') {
    throw new Error('O status da subcategoria deve ser ativo ou inativo.');
  }
  const subcategory = await writeNamedResource(
    `/ws/subcategories/${encodeURIComponent(id)}/status`,
    'PATCH',
    { active },
    token,
    200,
    id,
  );
  if (subcategory.active !== active) {
    throw new InvalidCatalogResponseError();
  }
  return subcategory;
}
