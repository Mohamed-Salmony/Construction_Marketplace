import { api } from '@/lib/api';

export type SearchFilterDto = {
  page?: number;
  pageSize?: number;
  query?: string;
  categoryId?: string; // Mongo ObjectId
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

// Images
export type AddProductImageDto = {
  imageUrl: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

export async function addProductImage(productId: string | number, payload: AddProductImageDto) {
  const id = String(productId);
  return api.post(`/api/products/${id}/images`, payload, { auth: true });
}

// Match server ProductDto at Server/DTOs/BusinessDTOs.cs
export type ProductImageDto = { id: number; imageUrl: string; altText?: string; isPrimary: boolean };
export type ProductAttributeDto = { id: number; nameEn: string; nameAr: string; valueEn: string; valueAr: string };
export type ProductDto = {
  id: string; // Mongo ObjectId
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  merchantId: string;
  merchantName: string;
  categoryId: string; // Mongo ObjectId
  categoryName: string;
  price: number;
  discountPrice?: number | null;
  currency: string;
  stockQuantity: number;
  allowCustomDimensions: boolean;
  isAvailableForRent: boolean;
  rentPricePerDay?: number | null;
  isApproved: boolean;
  approvedAt?: string | null;
  averageRating?: number | null;
  reviewCount: number;
  images: ProductImageDto[];
  attributes: ProductAttributeDto[];
  createdAt: string;
};

export type PagedResultDto<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function getProducts(filter: SearchFilterDto = {}) {
  const params = new URLSearchParams();
  if (filter.page) params.set('page', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  // Backend expects SearchTerm
  if ((filter as any).SearchTerm) params.set('SearchTerm', String((filter as any).SearchTerm));
  if (filter.query) params.set('SearchTerm', filter.query);
  if (filter.categoryId) params.set('CategoryId', String(filter.categoryId));
  // Backend expects SortBy and SortDescending (boolean)
  if (filter.sortBy) params.set('SortBy', filter.sortBy);
  if (filter.sortDirection) params.set('SortDescending', String(filter.sortDirection === 'desc'));
  const qs = params.toString();
  const primary = await api.get<PagedResultDto<ProductDto>>(`/api/Products${qs ? `?${qs}` : ''}`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<PagedResultDto<ProductDto>>(`/api/products${qs ? `?${qs}` : ''}`);
    return alt;
  }
  return primary;
}

// Featured products for homepage
export async function getFeaturedProducts() {
  const primary = await api.get(`/api/Products/featured`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get(`/api/products/featured`);
    return alt;
  }
  return primary;
}

export async function getProductById(id: string | number) {
  const primary = await api.get<ProductDto>(`/api/Products/${String(id)}`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<ProductDto>(`/api/products/${encodeURIComponent(String(id))}`);
    return alt;
  }
  return primary;
}

export async function getProductBySlug(slug: string) {
  const primary = await api.get<ProductDto>(`/api/Products/slug/${encodeURIComponent(slug)}`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<ProductDto>(`/api/products/slug/${encodeURIComponent(slug)}`);
    return alt;
  }
  return primary;
}

// Rentals listing from backend
export async function getAvailableForRent() {
  const primary = await api.get<ProductDto[]>(`/api/Products/rentals`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<ProductDto[]>(`/api/products/rentals`);
    return alt;
  }
  return primary;
}

// Match server DTO at Server/DTOs/BusinessDTOs.cs -> CategoryDto
export type CategoryDto = {
  id: string; // Mongo ObjectId
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  parentCategoryId?: string | null;
  subCategories?: CategoryDto[];
  productCount?: number;
  isActive?: boolean;
  sortOrder?: number;
};

export async function getRootCategories() {
  const primary = await api.get<CategoryDto[]>(`/api/Categories`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<CategoryDto[]>(`/api/categories`);
    return alt;
  }
  return primary;
}
export async function getAllCategories() {
  const primary = await api.get<CategoryDto[]>(`/api/Categories/all`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<CategoryDto[]>(`/api/categories/all`);
    return alt;
  }
  return primary;
}

// Admin: Categories CRUD
export type CreateOrUpdateCategoryPayload = {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export async function createCategory(payload: CreateOrUpdateCategoryPayload) {
  return api.post<CategoryDto>(`/api/Categories`, payload, { auth: true });
}

export async function updateCategory(id: string | number, payload: CreateOrUpdateCategoryPayload) {
  return api.put<CategoryDto>(`/api/Categories/${String(id)}`, payload, { auth: true });
}

export async function deleteCategory(id: string | number) {
  return api.del(`/api/Categories/${String(id)}`, { auth: true });
}

// Mutations and additional endpoints
export async function getCategoryById(id: string | number) {
  const primary = await api.get<CategoryDto>(`/api/Categories/${String(id)}`);
  if (!primary.ok && (primary.status === 404 || primary.status === 405)) {
    const alt = await api.get<CategoryDto>(`/api/categories/${encodeURIComponent(String(id))}`);
    return alt;
  }
  return primary;
}

export type CreateOrUpdateProductDto = {
  // Must match backend CreateProductDto
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  categoryId: string; // Mongo ObjectId as string
  price: number;
  discountPrice?: number;
  stockQuantity: number;
  allowCustomDimensions?: boolean;
  isAvailableForRent?: boolean;
  rentPricePerDay?: number | null;
  attributes?: Array<{
    nameEn: string;
    nameAr: string;
    valueEn: string;
    valueAr: string;
  }>;
};

export async function createProduct(payload: CreateOrUpdateProductDto) {
  // Merchant only per backend; requires auth token
  return api.post(`/api/Products`, payload, { auth: true });
}

export async function updateProduct(id: string | number, payload: CreateOrUpdateProductDto) {
  // Merchant only per backend; requires auth token
  return api.put(`/api/Products/${String(id)}`, payload, { auth: true });
}

export async function deleteProduct(id: string | number) {
  // Merchant only per backend; requires auth token
  return api.del(`/api/Products/${String(id)}`, { auth: true });
}

export async function getMyProducts() {
  // Merchant only per backend; requires auth token
  return api.get(`/api/Products/merchant/my-products`, { auth: true });
}
