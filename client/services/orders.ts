import { api } from '@/lib/api';

export type OrderDto = {
  id: string | number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  itemsCount?: number;
  total?: number;
  customerName?: string;
};

export async function listVendorOrders(params?: { vendorId?: 'me' | string | number; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.vendorId) qs.set('vendorId', String(params.vendorId));
  if (params?.status) qs.set('status', params.status);
  const q = qs.toString();
  return api.get<OrderDto[]>(`/api/Orders${q?`?${q}`:''}`, { auth: true });
}

export async function getOrderById(id: string | number) {
  return api.get<OrderDto>(`/api/Orders/${id}`, { auth: true });
}

export async function updateOrderStatus(id: string | number, status: string) {
  return api.patch<unknown>(`/api/Orders/${id}/status`, { status }, { auth: true });
}

// User-facing orders
export async function listMyOrders() {
  // Backend should infer user from auth token
  return api.get<OrderDto[]>(`/api/Orders/my`, { auth: true });
}

export async function cancelOrder(id: string | number) {
  return api.post<void>(`/api/Orders/${id}/cancel`, {}, { auth: true });
}

export async function confirmDelivered(id: string | number) {
  return api.post<void>(`/api/Orders/${id}/confirm-delivered`, {}, { auth: true });
}

export type CreateOrderDto = {
  items: Array<{ id: string | number; quantity: number; price?: number }>;
  shipping?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    additionalInfo?: string;
  };
  paymentMethod?: string; // card | cod | bank
  deliveryMethod?: string; // standard | express
};

export async function createOrder(payload: CreateOrderDto) {
  return api.post<{ id: string | number }>(`/api/Orders`, payload, { auth: true });
}
