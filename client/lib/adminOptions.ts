export type AdminProductOptions = {
  categories: string[]; // Arabic labels
};

const PRODUCT_OPTIONS_KEY = 'admin_product_options_v1';
const TECHNICIAN_OPTIONS_KEY = 'admin_technician_options_v1';
const RENTAL_OPTIONS_KEY = 'admin_rental_options_v1';

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const DEFAULT_PRODUCT_OPTIONS: AdminProductOptions = {
  categories: ['أبواب', 'نوافذ'],
};

export type AdminTechnicianOptions = {
  specialties: string[];
};

const DEFAULT_TECHNICIAN_OPTIONS: AdminTechnicianOptions = {
  specialties: ['ميكانيكي', 'كهربائي سيارات', 'سمكري'],
};

export type AdminRentalOptions = {
  categories: string[];
};

const DEFAULT_RENTAL_OPTIONS: AdminRentalOptions = {
  categories: ['تأجير سيارات', 'تأجير معدات'],
};

export function getAdminProductOptions(): AdminProductOptions {
  const v = read<AdminProductOptions>(PRODUCT_OPTIONS_KEY);
  if (!v) return { ...DEFAULT_PRODUCT_OPTIONS };
  const categories = Array.isArray(v.categories) && v.categories.length ? v.categories : DEFAULT_PRODUCT_OPTIONS.categories;
  return { categories: categories.map(c => String(c)) };
}

export function saveAdminProductOptions(opts: AdminProductOptions) {
  const normalized: AdminProductOptions = {
    categories: Array.isArray(opts.categories)
      ? Array.from(new Set(opts.categories.map((s) => String(s).trim()).filter(Boolean)))
      : []
  };
  write(PRODUCT_OPTIONS_KEY, normalized);
  try { window.dispatchEvent(new Event('admin_options_updated')); } catch {}
}


export function getAdminTechnicianOptions(): AdminTechnicianOptions {
  const v = read<AdminTechnicianOptions>(TECHNICIAN_OPTIONS_KEY);
  if (!v) return { ...DEFAULT_TECHNICIAN_OPTIONS };
  const specialties = Array.isArray(v.specialties) && v.specialties.length ? v.specialties : DEFAULT_TECHNICIAN_OPTIONS.specialties;
  return { specialties: specialties.map(c => String(c)) };
}

export function saveAdminTechnicianOptions(opts: AdminTechnicianOptions) {
  const normalized: AdminTechnicianOptions = {
    specialties: Array.isArray(opts.specialties)
      ? Array.from(new Set(opts.specialties.map((s) => String(s).trim()).filter(Boolean)))
      : []
  };
  write(TECHNICIAN_OPTIONS_KEY, normalized);
  try { window.dispatchEvent(new Event('admin_options_updated')); } catch {}
}

export function getAdminRentalOptions(): AdminRentalOptions {
  const v = read<AdminRentalOptions>(RENTAL_OPTIONS_KEY);
  if (!v) return { ...DEFAULT_RENTAL_OPTIONS };
  const categories = Array.isArray(v.categories) && v.categories.length ? v.categories : DEFAULT_RENTAL_OPTIONS.categories;
  return { categories: categories.map(c => String(c)) };
}

export function saveAdminRentalOptions(opts: AdminRentalOptions) {
  const normalized: AdminRentalOptions = {
    categories: Array.isArray(opts.categories)
      ? Array.from(new Set(opts.categories.map((s) => String(s).trim()).filter(Boolean)))
      : []
  };
  write(RENTAL_OPTIONS_KEY, normalized);
  try { window.dispatchEvent(new Event('admin_options_updated')); } catch {}
}
