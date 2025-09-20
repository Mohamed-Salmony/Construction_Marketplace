import { api } from '@/lib/api';

export type ServiceItem = {
  id: number;
  type: string;
  dailyWage: number;
  days?: number | null;
  total?: number | null;
  description: string;
  createdAt: string;
  updatedAt?: string | null;
  vendorId: string;
  isApproved: boolean;
  requiredSkills?: string | null;
  technicianType?: string | null;
  status: string; // Open, InProgress, Completed, Cancelled
  startDate?: string;
  endDate?: string | null;
};

export async function getPublicServices() {
  return api.get<ServiceItem[]>(`/api/Services/public`);
}

// Admin endpoints
export async function getAdminPendingServices() {
  return api.get<{ success: boolean; items: Array<{ id: number; title: string; description: string; merchantId: string; payRate: number; currency: string; createdAt: string }> }>(`/api/Admin/services/pending`, { auth: true });
}

export async function approveService(serviceId: number) {
  return api.post<{ success: boolean }>(`/api/Admin/services/${serviceId}/approve`, null, { auth: true });
}

export async function rejectService(serviceId: number, reason?: string) {
  return api.post<{ success: boolean }>(`/api/Admin/services/${serviceId}/reject`, reason ?? '', { auth: true });
}

export type ServiceTypeItem = { id: string; ar: string; en: string };
export async function getServiceTypes() {
  return api.get<ServiceTypeItem[]>(`/api/Services/types`);
}
