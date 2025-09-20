import { api } from '@/lib/api';

export type AdminOption = { key: string; value: string };

export async function getOption(key: string) {
  // Returns { key, value } where value is a JSON string
  return api.get<AdminOption>(`/api/Options/${encodeURIComponent(key)}`);
}

export async function getProjectTypes(): Promise<Array<{ id: string; en?: string; ar?: string }>> {
  const { ok, data } = await getOption('project_types');
  if (!ok || !data) return [];
  try {
    const arr = JSON.parse((data as any).value || '[]');
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
  } catch {
    return [];
  }
}

export async function getProjectMaterials(): Promise<Array<{ id: string; en?: string; ar?: string }>> {
  const { ok, data } = await getOption('project_materials');
  if (!ok || !data) return [];
  try {
    const arr = JSON.parse((data as any).value || '[]');
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
  } catch {
    return [];
  }
}

export async function getProjectPriceRules(): Promise<Record<string, number>> {
  const { ok, data } = await getOption('project_price_rules');
  if (!ok || !data) return {};
  try {
    const v = JSON.parse((data as any).value || '{}');
    if (v && typeof v === 'object') {
      const result: Record<string, number> = {};
      Object.keys(v).forEach(k => {
        const n = Number((v as any)[k]);
        if (Number.isFinite(n)) result[k] = n;
      });
      return result;
    }
    return {};
  } catch {
    return {};
  }
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
  const { ok, data } = await getOption('project_catalog');
  if (!ok || !data) return null;
  try {
    const v = JSON.parse((data as any).value || '{}');
    if (v && typeof v === 'object' && Array.isArray(v.products)) return v as ProjectCatalog;
    return null;
  } catch {
    return null;
  }
}
