import { api } from '@/lib/api';

export type CartItemDto = {
  id: string | number;
  name?: string;
  price?: number;
  brand?: string;
  image?: string;
  quantity: number;
};

export type CartDto = {
  items: CartItemDto[];
  total?: number;
};

export async function getCart() {
  return api.get<CartDto>(`/api/Cart`, { auth: true });
}

export async function addItem(item: { id: string | number; quantity: number; price?: number; name?: string; brand?: string; image?: string }) {
  return api.post<CartDto>(`/api/Cart/items`, item, { auth: true });
}

export async function updateItemQuantity(id: string | number, quantity: number) {
  return api.patch<CartDto>(`/api/Cart/items/${id}`, { quantity }, { auth: true });
}

export async function removeItem(id: string | number) {
  return api.del<CartDto>(`/api/Cart/items/${id}`, { auth: true });
}

export async function clearCart() {
  return api.del<CartDto>(`/api/Cart`, { auth: true });
}
