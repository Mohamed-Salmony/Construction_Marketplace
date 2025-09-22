import { api } from '@/lib/api';

// Product types (for admin interface)
export type ProductDto = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  merchantId: string;
  merchantName: string;
  categoryId: string;
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
  images: Array<{ id: number; imageUrl: string; altText?: string; isPrimary: boolean }>;
  attributes: Array<{ id: number; nameEn: string; nameAr: string; valueEn: string; valueAr: string }>;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  companyName?: string;
  city?: string;
  country?: string;
  profilePicture?: string;
};

// Pending products for admin approval
export async function getPendingProducts() {
  return api.get<{ success: boolean; items: any[] }>(
    '/api/Admin/products/pending',
    { auth: true }
  );
}

export async function approveProduct(productId: string) {
  return api.post<unknown>(`/api/Admin/products/${productId}/approve`, undefined, { auth: true });
}

export async function rejectProduct(productId: string, reason?: string) {
  return api.post<unknown>(`/api/Admin/products/${productId}/reject`, reason ?? '', { auth: true });
}

// Admin product management (auto-approve on create via backend)
export async function adminCreateProduct(payload: any) {
  return api.post(`/api/Admin/products`, payload, { auth: true });
}

export async function adminUpdateProduct(id: string | number, payload: any) {
  return api.put(`/api/Admin/products/${String(id)}`, payload, { auth: true });
}

export async function adminGetProducts(filter: { page?: number; pageSize?: number; query?: string; categoryId?: string } = {}) {
  const params = new URLSearchParams();
  if (filter.page) params.set('page', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  if (filter.query) params.set('SearchTerm', filter.query);
  if (filter.categoryId) params.set('CategoryId', String(filter.categoryId));
  const qs = params.toString();
  return api.get(`/api/Admin/products${qs ? `?${qs}` : ''}`, { auth: true });
}

export async function adminSetProductDiscount(id: string | number, discountPrice: number | null) {
  return api.post(`/api/Admin/products/${String(id)}/discount`, { discountPrice }, { auth: true });
}

export async function approveService(serviceId: string) {
  return api.post<unknown>(`/api/Admin/services/${serviceId}/approve`, undefined, { auth: true });
}

export async function rejectService(serviceId: string, reason?: string) {
  return api.post<unknown>(`/api/Admin/services/${serviceId}/reject`, reason ?? '', { auth: true });
}

export async function getPendingMerchants() {
  return api.get<{ success: boolean; items: Array<{ id: string; email: string; name: string; companyName?: string; createdAt?: string; profilePicture?: string }> }>(
    '/api/Admin/merchants/pending',
    { auth: true }
  );
}

export async function approveMerchant(userId: string) {
  return api.post<unknown>(`/api/Admin/merchants/${userId}/approve`, undefined, { auth: true });
}

export async function suspendMerchant(userId: string) {
  return api.post<unknown>(`/api/Admin/merchants/${userId}/suspend`, undefined, { auth: true });
}

export async function getUsers(params?: { role?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.role) qs.set('role', params.role);
  if (params?.status) qs.set('status', params.status);
  const q = qs.toString();
  const path = `/api/Admin/users${q ? `?${q}` : ''}`;
  return api.get<{ success: boolean; items: AdminUser[] }>(path, { auth: true });
}

// Project catalogs (types, materials, price rules, currency)
export async function getAdminOption(key: string) {
  return api.get<{ key: string; value: string }>(`/api/AdminOptions/${encodeURIComponent(key)}`, { auth: true });
}

export async function setAdminOption(key: string, value: any) {
  // Send as number for commission values, server will handle conversion
  return api.put(`/api/AdminOptions/${encodeURIComponent(key)}`, Number(value) || 0, { auth: true });
}

// Pending projects and approval actions
export async function getPendingProjects() {
  return api.get<{ success: boolean; items: Array<{ id: number; title: string; description?: string; customerId: string; customerName?: string; categoryId: number; createdAt: string }> }>(
    '/api/ProjectsAdmin/pending',
    { auth: true }
  );
}

export async function approveProject(id: number | string, state: 'Published' | 'InBidding' = 'Published') {
  const pid = encodeURIComponent(String(id));
  return api.post(`/api/ProjectsAdmin/${pid}/approve?state=${encodeURIComponent(state)}`, undefined, { auth: true });
}

export async function rejectProject(id: number | string, reason?: string) {
  const pid = encodeURIComponent(String(id));
  return api.post(`/api/ProjectsAdmin/${pid}/reject`, reason ?? '', { auth: true });
}

// Admin: get full project details by id
export async function getAdminProjectById(id: number | string) {
  const pid = encodeURIComponent(String(id));
  return api.get(`/api/ProjectsAdmin/${pid}`, { auth: true });
}

// Admin: list bids for a project with merchant identity
export async function getAdminProjectBids(id: number | string) {
  const pid = encodeURIComponent(String(id));
  return api.get<{ success: boolean; items: Array<{ id: number; projectId: number; amount: number; estimatedDays: number; proposal: string; status: string; createdAt: string; merchantId: string; merchantName: string; merchantEmail: string }> }>(
    `/api/ProjectsAdmin/${pid}/bids`,
    { auth: true }
  );
}

// Approve/Deactivate technicians (workers) using the generic users status endpoint
export async function approveTechnician(userId: string) {
  // maps to: POST /api/Admin/users/{userId}/status { status: 'active' }
  return api.post(`/api/Admin/users/${userId}/status`, { status: 'active' }, { auth: true });
}

export async function suspendTechnician(userId: string) {
  // maps to: POST /api/Admin/users/{userId}/status { status: 'suspended' }
  return api.post(`/api/Admin/users/${userId}/status`, { status: 'suspended' }, { auth: true });
}

// Admin analytics overview (users breakdown + sales aggregates)
export type AdminAnalyticsOverview = {
  success: boolean;
  stats: {
    totalUsers: number;
    customers: number;
    merchants: number;
    technicians: number;
    activeVendors: number;
  };
  sales: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
    currency: string;
  };
  finance: {
    monthlyRevenue: number;
    platformCommission: number;
    pendingVendorPayouts: number;
    currency: string;
  };
};

export async function getAdminAnalyticsOverview() {
  return api.get<AdminAnalyticsOverview>(`/api/Admin/analytics/overview`, { auth: true });
}
