import { api } from '@/lib/api';

export type OfferDto = {
  id: string;
  technicianId: string;
  targetType: 'service' | 'project';
  serviceId?: string;
  projectId?: string;
  price: number;
  days: number;
  message?: string;
  status: string;
  createdAt?: string;
};

export async function createOffer(payload: { targetType: 'service' | 'project'; serviceId?: string | number; projectId?: string | number; price: number; days: number; message?: string; }) {
  // Backend expects PascalCase or exact property names from OffersController. It uses OfferInput with same casing.
  const body = {
    TargetType: payload.targetType,
    ServiceId: payload.serviceId != null ? String(payload.serviceId) : undefined,
    ProjectId: payload.projectId != null ? String(payload.projectId) : undefined,
    Price: payload.price,
    Days: payload.days,
    Message: payload.message ?? null,
  } as any;
  return api.post<OfferDto>('/api/Offers', body, { auth: true });
}

export async function updateOffer(id: string | number, payload: { targetType: 'service' | 'project'; serviceId?: string | number; projectId?: string | number; price: number; days: number; message?: string; }) {
  const body = {
    TargetType: payload.targetType,
    ServiceId: payload.serviceId != null ? String(payload.serviceId) : undefined,
    ProjectId: payload.projectId != null ? String(payload.projectId) : undefined,
    Price: payload.price,
    Days: payload.days,
    Message: payload.message ?? null,
  } as any;
  return api.put<OfferDto>(`/api/Offers/${encodeURIComponent(String(id))}`, body, { auth: true });
}

export async function deleteOffer(id: string | number) {
  return api.del<void>(`/api/Offers/${encodeURIComponent(String(id))}`, { auth: true });
}

export async function getTechnicianOffers(technicianId: string) {
  return api.get<OfferDto[]>(`/api/Technicians/${encodeURIComponent(String(technicianId))}/offers`, { auth: true });
}

export async function listOffersForService(serviceId: string | number) {
  return api.get<OfferDto[]>(`/api/Offers/service/${encodeURIComponent(String(serviceId))}`, { auth: true });
}

export async function listOffersForProject(projectId: string | number) {
  return api.get<OfferDto[]>(`/api/Offers/project/${encodeURIComponent(String(projectId))}`, { auth: true });
}

export async function updateOfferStatus(id: string | number, status: 'accepted' | 'rejected' | 'pending') {
  return api.post<OfferDto>(`/api/Offers/${encodeURIComponent(String(id))}/status`, { Status: status }, { auth: true });
}
