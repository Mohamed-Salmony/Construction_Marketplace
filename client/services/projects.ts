import { api } from '@/lib/api';

export type SearchFilterDto = {
  page?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type ProjectStatus = 'Draft' | 'Published' | 'InBidding' | 'InProgress' | 'Completed' | string;

export type ProjectDto = {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  categoryId?: number;
  total?: number;
  days?: number;
  currency?: string;
  status?: ProjectStatus;
  createdAt?: string;
};

export type PagedResultDto<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function getProjects(filter: SearchFilterDto = {}) {
  const params = new URLSearchParams();
  if (filter.page) params.set('page', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  if (filter.query) params.set('query', filter.query);
  if (filter.sortBy) params.set('sortBy', filter.sortBy);
  if (filter.sortDirection) params.set('sortDirection', filter.sortDirection);
  const qs = params.toString();
  return api.get<PagedResultDto<ProjectDto>>(`/api/Projects${qs ? `?${qs}` : ''}`);
}

export async function getOpenProjects() {
  return api.get<ProjectDto[]>(`/api/Projects/open`);
}

export async function getProjectById(id: string) {
  return api.get<ProjectDto>(`/api/Projects/${encodeURIComponent(id)}`, { auth: true });
}

export type BidDto = {
  id: string;
  projectId: string;
  merchantId?: string;
  amount?: number;
  price?: number;
  days?: number;
  message?: string;
  createdAt?: string;
  status?: string;
};

export async function getProjectBids(projectId: string) {
  return api.get<BidDto[]>(`/api/Projects/${encodeURIComponent(projectId)}/bids`, { auth: true });
}

export async function createBid(projectId: string, payload: { price: number; days: number; message?: string }) {
  // Backend expects CreateBidDto, using body keys as-is is fine
  return api.post<BidDto>(`/api/Projects/${encodeURIComponent(projectId)}/bids`, { price: payload.price, days: payload.days, message: payload.message ?? '' }, { auth: true });
}

export async function selectBid(projectId: string, bidId: string) {
  return api.post<{ success: boolean; message: string }>(`/api/Projects/${encodeURIComponent(projectId)}/select-bid/${encodeURIComponent(bidId)}`, null, { auth: true });
}

export async function acceptBid(bidId: string | number) {
  return api.post<{ success: boolean; message: string }>(`/api/Projects/bids/${encodeURIComponent(String(bidId))}/accept`, null, { auth: true });
}

export async function rejectBid(bidId: string | number, reason?: string) {
  return api.post<{ success: boolean; message: string }>(`/api/Projects/bids/${encodeURIComponent(String(bidId))}/reject`, reason ?? '', { auth: true });
}

export async function getMyBids() {
  return api.get<BidDto[]>(`/api/Projects/bids/merchant/my-bids`, { auth: true });
}

// Create/update/delete projects (Customer role)
export type CreateProjectDto = {
  title?: string;
  description?: string;
  // Domain-specific fields used by UI; backend will map/validate as needed
  type?: string; // ptype
  psubtype?: string;
  material?: string;
  color?: string;
  width?: number;
  height?: number;
  quantity?: number;
  days?: number;
  pricePerMeter?: number;
  total?: number;
  items?: any[];
};

export async function createProject(payload: CreateProjectDto) {
  return api.post<ProjectDto>(`/api/Projects`, payload, { auth: true });
}

export async function updateProject(id: string | number, payload: CreateProjectDto) {
  return api.put<ProjectDto>(`/api/Projects/${encodeURIComponent(String(id))}`, payload, { auth: true });
}

export async function deleteProject(id: string | number) {
  // Server exposes delete under Projects controller for the owning customer
  return api.del<{ success: boolean }>(`/api/Projects/${encodeURIComponent(String(id))}`, { auth: true });
}

export async function getMyProjects() {
  return api.get<ProjectDto[]>(`/api/Projects/customer/my-projects`, { auth: true });
}

