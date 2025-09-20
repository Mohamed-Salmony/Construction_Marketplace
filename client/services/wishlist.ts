import { api } from '@/lib/api';

export type WishlistItem = {
  id: string | number;
  productId: string | number;
  productName: string;
  createdAt: string;
};

export async function getWishlist() {
  return api.get<WishlistItem[]>('/api/Wishlist', { auth: true });
}

export async function addToWishlist(productId: string | number) {
  const pid = String(productId);
  // Try to include userId when available (some backends require it in addition to JWT)
  const userId = (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('mock_current_user') : null;
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const id = obj?.id || obj?._id;
      return id ? String(id) : null;
    } catch { return null; }
  })();
  // Try URL style first; if it fails, fallback to body style
  const first = await api.post<void>(`/api/Wishlist/${encodeURIComponent(pid)}`, undefined, { auth: true });
  if (first.ok) return first as any;
  // Fallback: some backends expect body { productId }
  return api.post<void>(`/api/Wishlist`, { productId: pid, ...(userId ? { userId } : {}) }, { auth: true });
}

export async function removeFromWishlist(productId: string | number) {
  // Use api.del helper (wrapped fetch)
  const pid = String(productId);
  const r = await api.del<void>(`/api/Wishlist/${encodeURIComponent(pid)}`, { auth: true });
  return r as any;
}

export async function toggleWishlist(productId: string | number) {
  const pid = String(productId);
  const userId = (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('mock_current_user') : null;
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const id = obj?.id || obj?._id;
      return id ? String(id) : null;
    } catch { return null; }
  })();
  // Prefer body-based toggle; backend also supports /toggle/:productId
  const r = await api.post<{ success: boolean; inWishlist: boolean }>(`/api/Wishlist/toggle`, { productId: pid, ...(userId ? { userId } : {}) }, { auth: true });
  if (r.ok) return r;
  return api.post<{ success: boolean; inWishlist: boolean }>(`/api/Wishlist/toggle/${encodeURIComponent(pid)}`, undefined, { auth: true });
}
