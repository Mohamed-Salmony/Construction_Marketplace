import { api } from '@/lib/api';

// Simple in-memory cache and localStorage-backed cache for options
// TTL defaults to 10 minutes; can be adjusted per key if needed
const MEM_CACHE: Map<string, { ts: number; data: any }> = new Map();
const DEFAULT_TTL_MS = 10 * 60 * 1000;

function now() { return Date.now(); }

function readLocal<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(`opt:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { ts, data } = parsed as { ts: number; data: T };
    if (!ts) return null;
    return data as T;
  } catch { return null; }
}

function writeLocal<T>(key: string, data: T) {
  try {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({ ts: now(), data });
    window.localStorage.setItem(`opt:${key}`, payload);
  } catch {}
}

async function getCachedOption<T>(key: string, ttlMs: number, parse: (v: any) => T): Promise<T> {
  // 1) Memory cache hit and not expired
  const mem = MEM_CACHE.get(key);
  if (mem && now() - mem.ts < ttlMs) return mem.data as T;

  // 2) LocalStorage cache
  const local = readLocal<T>(key);
  if (local != null) {
    // Promotes to memory cache for this session
    MEM_CACHE.set(key, { ts: now(), data: local });
    return local;
  }

  // 3) Fetch from server via getOption
  const { ok, data } = await getOption(key);
  if (!ok || !data) {
    // Return empty shapes per type
    return parse(null);
  }
  try {
    const parsed = parse((data as any).value);
    MEM_CACHE.set(key, { ts: now(), data: parsed });
    writeLocal(key, parsed);
    return parsed;
  } catch {
    return parse(null);
  }
}

export type AdminOption = { key: string; value: string };

export async function getOption(key: string) {
  // Returns { key, value } where value is a JSON string
  return api.get<AdminOption>(`/api/Options/${encodeURIComponent(key)}`, { timeoutMs: 5000, retryAttempts: 1, retryBackoffMs: 400 });
}

export async function getProjectTypes(): Promise<Array<{ id: string; en?: string; ar?: string }>> {
  const key = 'project_types';
  return getCachedOption<Array<{ id: string; en?: string; ar?: string }>>(key, DEFAULT_TTL_MS, (value: any) => {
    const arr = (() => {
      try { return JSON.parse(typeof value === 'string' ? value : '[]'); } catch { return []; }
    })();
    if (!Array.isArray(arr)) return [];
    const mapped = arr.map((x: any) => {
      if (typeof x === 'string') return { id: x };
      if (x && typeof x === 'object') {
        const id = String(x.id ?? x.value ?? '');
        const en = typeof x.en === 'string' ? x.en : undefined;
        const ar = typeof x.ar === 'string' ? x.ar : undefined;
        if (!id) return null;
        return { id, en, ar };
      }
      return null;
    }).filter((v: any): v is { id: string; en?: string; ar?: string } => !!v);
    return mapped;
  });
}

export async function getProjectMaterials(): Promise<Array<{ id: string; en?: string; ar?: string }>> {
  const key = 'project_materials';
  return getCachedOption<Array<{ id: string; en?: string; ar?: string }>>(key, DEFAULT_TTL_MS, (value: any) => {
    const arr = (() => {
      try { return JSON.parse(typeof value === 'string' ? value : '[]'); } catch { return []; }
    })();
    if (!Array.isArray(arr)) return [];
    const mapped = arr.map((x: any) => {
      if (typeof x === 'string') return { id: x };
      if (x && typeof x === 'object') {
        const id = String(x.id ?? x.value ?? '');
        const en = typeof x.en === 'string' ? x.en : undefined;
        const ar = typeof x.ar === 'string' ? x.ar : undefined;
        if (!id) return null;
        return { id, en, ar };
      }
      return null;
    }).filter((v: any): v is { id: string; en?: string; ar?: string } => !!v);
    return mapped;
  });
}

export async function getProjectPriceRules(): Promise<Record<string, number>> {
  const key = 'project_price_rules';
  return getCachedOption<Record<string, number>>(key, DEFAULT_TTL_MS, (value: any) => {
    const v = (() => {
      try { return JSON.parse(typeof value === 'string' ? value : '{}'); } catch { return {}; }
    })();
    if (v && typeof v === 'object') {
      const result: Record<string, number> = {};
      Object.keys(v).forEach(k => {
        const n = Number((v as any)[k]);
        if (Number.isFinite(n)) result[k] = n;
      });
      return result;
    }
    return {};
  });
}

// Unified catalog
export type ProjectCatalog = {
  products: Array<{
    id: string;
    en?: string; ar?: string;
    basePricePerM2?: number;
    dimensions?: { width?: boolean; height?: boolean; length?: boolean };
    // Subtypes may optionally provide their own materials list
    // Each material can also include an optional pricePerM2 that overrides base pricing
    subtypes?: Array<{
      id: string;
      en?: string; ar?: string;
      materials?: Array<{ id: string; en?: string; ar?: string; pricePerM2?: number }>;
    }>;
    // Legacy/product-level materials may still be present
    materials?: Array<{ id: string; en?: string; ar?: string }>;
    colors?: Array<{ id: string; en?: string; ar?: string }>;
    accessories?: Array<{ id: string; en?: string; ar?: string; price?: number }>;
  }>
};

export async function getProjectCatalog(): Promise<ProjectCatalog | null> {
  const key = 'project_catalog';
  return getCachedOption<ProjectCatalog | null>(key, DEFAULT_TTL_MS, (value: any) => {
    const v = (() => {
      try { return JSON.parse(typeof value === 'string' ? value : '{}'); } catch { return {}; }
    })();
    if (v && typeof v === 'object' && Array.isArray((v as any).products)) return v as ProjectCatalog;
    return null;
  });
}
