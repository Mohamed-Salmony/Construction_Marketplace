import { api } from '@/lib/api';

export type VendorDto = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  status?: 'active' | 'pending' | 'suspended' | string;
  productsCount?: number;
  joinDate?: string;
};

export async function listVendors(params?: { status?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString();
  return api.get<VendorDto[]>(`/api/Vendors${query ? `?${query}` : ''}`, { auth: true });
}

export async function listPendingVendorUsers() {
  // If backend supports pending vendor users via Auth endpoint, adjust accordingly
  return api.get<any[]>(`/api/Vendors/pending`, { auth: true });
}

export async function approveVendor(id: string ) {
  return api.patch<unknown>(`/api/Vendors/${id}/approve`, {}, { auth: true });
}

export async function suspendVendor(id: string ) {
  return api.patch<unknown>(`/api/Vendors/${id}/suspend`, {}, { auth: true });
}
