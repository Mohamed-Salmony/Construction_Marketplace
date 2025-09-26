import { api } from '@/lib/api';

export type WishlistItem = {
  id: string | number;
  productId: string | number;
  productName: string;
  createdAt: string;
};

export async function getWishlist() {
  const r = await api.get<WishlistItem[]>('/api/Wishlist', { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    return { ...r, ok: true, data: [] as WishlistItem[] };
  }
  return r;
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
  const first = await api.post<void>(`/api/Wishlist/${encodeURIComponent(pid)}`, undefined, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (first.ok) return first as any;
  // Fallback: some backends expect body { productId }
  const second = await api.post<void>(`/api/Wishlist`, { productId: pid, ...(userId ? { userId } : {}) }, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (second.status === 401) {
    // Guest fallback: simulate success
    return { ...second, ok: true, data: undefined } as any;
  }
  return second as any;
}

export async function removeFromWishlist(productId: string | number) {
  // Use api.del helper (wrapped fetch)
  const pid = String(productId);
  const r = await api.del<void>(`/api/Wishlist/${encodeURIComponent(pid)}`, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    // Guest fallback: simulate success
    return { ...r, ok: true, data: undefined } as any;
  }
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
  const r = await api.post<{ success: boolean; inWishlist: boolean }>(`/api/Wishlist/toggle`, { productId: pid, ...(userId ? { userId } : {}) }, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.ok) return r;
  const r2 = await api.post<{ success: boolean; inWishlist: boolean }>(`/api/Wishlist/toggle/${encodeURIComponent(pid)}`, undefined, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r2.status === 401) {
    // Guest fallback: treat as not in wishlist
    return { ...r2, ok: true, data: { success: true, inWishlist: false } } as any;
  }
  return r2 as any;
}
