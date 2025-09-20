import { api } from '@/lib/api';

export type Address = {
  id: number;
  name: string;
  fullAddress: string;
  phone: string;
  isDefault: boolean;
};

export async function getAddresses() {
  return api.get<Address[]>('/api/Addresses', { auth: true });
}

export async function createAddress(input: { name: string; fullAddress: string; phone: string; }) {
  return api.post<Address>('/api/Addresses', input, { auth: true });
}

export async function updateAddress(id: number, input: { name: string; fullAddress: string; phone: string; }) {
  return api.put<Address>(`/api/Addresses/${id}`, input, { auth: true });
}

export async function deleteAddress(id: number) {
  // Fallback to native fetch if api.delete is unavailable
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`/api/Addresses/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Failed to delete address');
  return { ok: true } as any;
}

export async function makeDefaultAddress(id: number) {
  return api.put<void>(`/api/Addresses/${id}/make-default`, {}, { auth: true });
}
