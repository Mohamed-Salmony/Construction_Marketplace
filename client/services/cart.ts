import { api } from '@/lib/api';

export type CartItemDto = {
  id: string | number;
  name?: string;
  price?: number;
  brand?: string;
  image?: string;
  quantity: number;
  // quantity represents units or meters depending on unitType
  unitType?: 'quantity' | 'meters';
};

export type CartDto = {
  items: CartItemDto[];
  total?: number;
};

// ---------- Guest cart helpers (localStorage) ----------
const GUEST_CART_KEY = 'guest_cart_v1';

function ensureNumber(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function calcTotal(items: CartItemDto[]): number {
  return items.reduce((sum, it) => sum + ensureNumber(it.price) * ensureNumber(it.quantity), 0);
}

function readGuestCart(): CartDto {
  try {
    if (typeof window === 'undefined') return { items: [], total: 0 };
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return { items: [], total: 0 };
    const parsed = JSON.parse(raw);
    const items: CartItemDto[] = Array.isArray(parsed?.items)
      ? parsed.items.map((x: any) => ({
          id: x?.id,
          name: typeof x?.name === 'string' ? x.name : undefined,
          price: ensureNumber(x?.price) || undefined,
          brand: typeof x?.brand === 'string' ? x.brand : undefined,
          image: typeof x?.image === 'string' ? x.image : undefined,
          quantity: Math.max(1, ensureNumber(x?.quantity) || 1),
          unitType: (x?.unitType === 'meters' ? 'meters' : (x?.unitType === 'quantity' ? 'quantity' : undefined)),
        }))
      : [];
    return { items, total: calcTotal(items) };
  } catch {
    return { items: [], total: 0 };
  }
}

function writeGuestCart(cart: CartDto) {
  try {
    if (typeof window === 'undefined') return;
    const total = calcTotal(cart.items || []);
    const payload: CartDto = { items: cart.items || [], total };
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(payload));
  } catch {}
}

function upsertGuestItem(item: { id: string | number; quantity: number; price?: number; name?: string; brand?: string; image?: string; unitType?: 'quantity' | 'meters' }): CartDto {
  const cart = readGuestCart();
  const idStr = String(item.id);
  const idx = cart.items.findIndex((it) => String(it.id) === idStr);
  if (idx >= 0) {
    const existing = cart.items[idx];
    const nextQty = ensureNumber(existing.quantity) + Math.max(1, ensureNumber(item.quantity));
    cart.items[idx] = {
      ...existing,
      quantity: nextQty,
      // Prefer latest known price/name if provided
      price: item.price ?? existing.price,
      name: item.name ?? existing.name,
      brand: item.brand ?? existing.brand,
      image: item.image ?? existing.image,
      unitType: item.unitType ?? existing.unitType,
    };
  } else {
    cart.items.push({
      id: item.id,
      quantity: Math.max(1, ensureNumber(item.quantity) || 1),
      price: typeof item.price === 'number' ? item.price : undefined,
      name: item.name,
      brand: item.brand,
      image: item.image,
      unitType: item.unitType,
    });
  }
  const total = calcTotal(cart.items);
  const result: CartDto = { items: cart.items, total };
  writeGuestCart(result);
  return result;
}

function setGuestItemQuantity(id: string | number, quantity: number): CartDto {
  const cart = readGuestCart();
  const idStr = String(id);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    cart.items = cart.items.filter((it) => String(it.id) !== idStr);
  } else {
    const idx = cart.items.findIndex((it) => String(it.id) === idStr);
    if (idx >= 0) {
      cart.items[idx] = { ...cart.items[idx], quantity: Math.floor(quantity) };
    }
  }
  const total = calcTotal(cart.items);
  const result: CartDto = { items: cart.items, total };
  writeGuestCart(result);
  return result;
}

function removeGuestItem(id: string | number): CartDto {
  const cart = readGuestCart();
  const idStr = String(id);
  cart.items = cart.items.filter((it) => String(it.id) !== idStr);
  const total = calcTotal(cart.items);
  const result: CartDto = { items: cart.items, total };
  writeGuestCart(result);
  return result;
}

function clearGuestCart(): CartDto {
  const empty: CartDto = { items: [], total: 0 };
  writeGuestCart(empty);
  return empty;
}

// Merge guest cart into server cart after successful authentication
export async function mergeGuestCartToServer(): Promise<{ merged: number; failed: number } | null> {
  try {
    const cart = readGuestCart();
    const items = Array.isArray(cart.items) ? cart.items : [];
    if (!items.length) return null;
    let merged = 0;
    let failed = 0;
    for (const it of items) {
      const payload = { id: it.id, quantity: Math.max(1, ensureNumber(it.quantity) || 1), price: typeof it.price === 'number' ? it.price : undefined, name: it.name, brand: it.brand, image: it.image };
      const res = await api.post<CartDto>(`/api/Cart/items`, payload, { auth: true, timeoutMs: 7000, retryAttempts: 1, retryBackoffMs: 400 });
      if (res.ok) merged++; else failed++;
    }
    // Clear guest cart if we merged anything (avoid duplicates going forward)
    if (merged > 0) clearGuestCart();
    return { merged, failed };
  } catch {
    return null;
  }
}

export async function getCart() {
  const r = await api.get<CartDto>(`/api/Cart`, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    // Guest: return persisted guest cart
    const guest = readGuestCart();
    return { ...r, ok: true, data: guest as CartDto };
  }
  return r;
}

export async function addItem(item: { id: string | number; quantity: number; price?: number; name?: string; brand?: string; image?: string }) {
  const r = await api.post<CartDto>(`/api/Cart/items`, item, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    // Guest: upsert into localStorage cart and return updated cart
    const guest = upsertGuestItem(item);
    return { ...r, ok: true, data: guest as CartDto };
  }
  return r;
}

export async function updateItemQuantity(id: string | number, quantity: number) {
  const r = await api.patch<CartDto>(`/api/Cart/items/${id}`, { quantity }, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    const guest = setGuestItemQuantity(id, quantity);
    return { ...r, ok: true, data: guest as CartDto };
  }
  return r;
}

export async function removeItem(id: string | number) {
  const r = await api.del<CartDto>(`/api/Cart/items/${id}`, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    const guest = removeGuestItem(id);
    return { ...r, ok: true, data: guest as CartDto };
  }
  return r;
}

export async function clearCart() {
  const r = await api.del<CartDto>(`/api/Cart`, { auth: true, timeoutMs: 7000, retryAttempts: 2, retryBackoffMs: 500 });
  if (r.status === 401) {
    const guest = clearGuestCart();
    return { ...r, ok: true, data: guest as CartDto };
  }
  return r;
}
