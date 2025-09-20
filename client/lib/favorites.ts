export type FavoriteItem = {
  id: string;
  name: string | { ar?: string; en?: string };
  price?: number;
  image?: string;
  brand?: string | { ar?: string; en?: string };
  category?: string | { ar?: string; en?: string };
};

const KEY = 'favorites_v1';

function read(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: FavoriteItem[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function getFavorites(): FavoriteItem[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().some(i => i.id === id);
}

export function addFavorite(item: FavoriteItem) {
  const list = read();
  if (!list.some(i => i.id === item.id)) {
    list.push(item);
    write(list);
  }
}

export function removeFavorite(id: string) {
  const list = read().filter(i => i.id !== id);
  write(list);
}

export function toggleFavorite(item: FavoriteItem) {
  if (isFavorite(item.id)) removeFavorite(item.id); else addFavorite(item);
}
