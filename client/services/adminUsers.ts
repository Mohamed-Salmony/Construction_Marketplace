import { api } from '@/lib/api';

// Types aligned with Server/Controllers/AdminController.cs
export type AdminListUser = {
  id: string;
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string | null;
  companyName?: string | null;
  city?: string | null;
  country?: string | null;
  profilePicture?: string | null;
};

export type AdminUsersResponse = { success: boolean; items: AdminListUser[] };

export async function getAdminUsers(params?: { role?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.role) query.set('role', params.role);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return api.get<AdminUsersResponse>(`/api/Admin/users${qs ? `?${qs}` : ''}`, { auth: true });
}

export type UpdateUserStatusPayload = { status: string };
export async function setAdminUserStatus(userId: string, status: string) {
  return api.post(`/api/Admin/users/${encodeURIComponent(userId)}/status`, { status } as UpdateUserStatusPayload, { auth: true });
}

export type AdminCreateUserDto = {
  email: string;
  password: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  city?: string;
  country?: string;
  role?: 'Admin' | 'Merchant' | 'Technician' | 'Customer';
};

export async function addAdminUser(payload: AdminCreateUserDto) {
  return api.post<{ success: boolean; id: string }>(`/api/Admin/users`, payload, { auth: true });
}

export type AdminUpdateUserDto = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  city?: string;
  country?: string;
  role?: 'Admin' | 'Merchant' | 'Technician' | 'Customer';
  dailyRate?: number;
};

export async function updateAdminUser(userId: string, payload: AdminUpdateUserDto) {
  return api.put<{ success: boolean }>(`/api/Admin/users/${encodeURIComponent(userId)}`, payload, { auth: true });
}

export async function deleteAdminUser(userId: string) {
  return api.del<{ success: boolean }>(`/api/Admin/users/${encodeURIComponent(userId)}`, { auth: true });
}

// Full user details for admin view (includes IBAN and document paths)
export type AdminUserDetails = AdminListUser & {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  taxNumber?: string | null;
  profession?: string | null;
  licenseNumber?: string | null;
  iban?: string | null;
  registryStart?: string | null;
  registryEnd?: string | null;
  address?: string | null;
  buildingNumber?: string | null;
  streetName?: string | null;
  postalCode?: string | null;
  profilePicture?: string | null;
  documentPath?: string | null;
  licenseImagePath?: string | null;
  bio?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  dailyRate?: number | null;
};

export async function getAdminUserById(userId: string) {
  return api.get<{ success: boolean; item: AdminUserDetails }>(`/api/Admin/users/${encodeURIComponent(userId)}`, { auth: true });
}
