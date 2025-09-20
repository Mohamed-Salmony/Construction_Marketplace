import { api } from '@/lib/api';

export type LoginDto = {
  email: string;
  password: string;
};

export type RegisterDto = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: 'Customer' | 'Merchant' | 'Technician' | 'Worker' | 'Admin' | 'customer' | 'vendor' | 'technician' | 'worker' | 'admin';
  phone?: string; // legacy
  phoneNumber?: string; // backend expects this key
  // Vendor specific fields (optional)
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneSecondary?: string;
  iban?: string; // SA IBAN
  buildingNumber?: string;
  streetName?: string;
  cityName?: string;
  postalCode?: string;
  taxNumber?: string; // optional
  registryStart?: string; // unified registry start
  registryEnd?: string;   // unified registry end
  // Optional upload files
  documentFile?: File | Blob;
  imageFile?: File | Blob;
  licenseImage?: File | Blob; // optional
};

export type AuthResponseDto = {
  success?: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
  user?: {
    id?: string | number;
    name?: string;
    email?: string;
    role?: string;
  } | null;
};

const TOKEN_KEY = 'auth_token';

export function saveToken(token?: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
  // Also mirror to a cookie so api.ts can read it and attach Authorization
  try {
    if (typeof document !== 'undefined') {
      if (token && token.length > 0) {
        // Path=/ to be accessible everywhere; no HttpOnly so client can read it
        // Short max-age (7 days) to reduce stale token risk; adjust as needed
        document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}`;
      } else {
        document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
      }
    }
  } catch {}
}

export function getToken(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export async function login(dto: LoginDto) {
  const res = await api.post<AuthResponseDto>('/api/Auth/login', dto);
  if (res.ok && res.data) {
    if (res.data.token) saveToken(res.data.token);
  }
  return res;
}

export async function register(dto: RegisterDto) {
  // Normalize role names to backend values
  const normalizeRole = (val?: string) => {
    if (!val) return val;
    const r = String(val).toLowerCase();
    return r === 'vendor' ? 'Merchant'
      : r === 'customer' ? 'Customer'
      : r === 'technician' ? 'Technician'
      : r === 'worker' ? 'Worker'
      : r === 'admin' ? 'Admin' : val;
  };

  // Backend controller uses [FromForm], so always send multipart/form-data
  const fd = new FormData();
  const merged: any = { ...dto };
  // ensure phoneNumber key is populated
  if (!merged.phoneNumber && merged.phone) merged.phoneNumber = merged.phone;
  // normalize phone number (basic SA heuristic): 05xxxxxxxx -> +9665xxxxxxxx
  if (typeof merged.phoneNumber === 'string') {
    let p = merged.phoneNumber.trim();
    if (/^0\d{8,}$/.test(p)) {
      p = '+966' + p.slice(1);
    }
    // If after normalization it's still clearly too short, omit to avoid [Phone] failure
    if (p.replace(/[^\d]/g, '').length < 9) {
      delete merged.phoneNumber;
    } else {
      merged.phoneNumber = p;
    }
  }
  // normalize role to server expected
  merged.role = normalizeRole(dto.role);
  // Map to backend RegisterDto naming (PascalCase)
  const mapKey = (k: string): string => {
    const m: Record<string, string> = {
      email: 'Email',
      password: 'Password',
      confirmPassword: 'ConfirmPassword',
      role: 'Role',
      firstName: 'FirstName',
      middleName: 'MiddleName',
      lastName: 'LastName',
      phoneNumber: 'PhoneNumber',
      phoneSecondary: 'PhoneSecondary',
      buildingNumber: 'BuildingNumber',
      streetName: 'StreetName',
      cityName: 'CityName',
      postalCode: 'PostalCode',
      taxNumber: 'TaxNumber',
      registryStart: 'RegistryStart',
      registryEnd: 'RegistryEnd',
      iban: 'Iban',
      address: 'Address',
      city: 'City',
      country: 'Country',
      companyName: 'CompanyName',
      dateOfBirth: 'DateOfBirth',
      documentFile: 'DocumentFile',
      imageFile: 'ImageFile',
      licenseImage: 'LicenseImage',
      name: 'Name',
    };
    return m[k] || k;
  };
  if ((merged as any).dob && !merged.dateOfBirth) merged.dateOfBirth = (merged as any).dob;
  const entries: [string, any][] = Object.entries(merged);
  for (const [key, val] of entries) {
    if (val === undefined || val === null) continue;
    const mk = mapKey(key);
    if (val instanceof Blob) fd.append(mk, val);
    else fd.append(mk, String(val));
  }
  const res = await api.post<AuthResponseDto>('/api/Auth/register', fd);

  if (res.ok && res.data) {
    if (res.data.token) {
      saveToken(res.data.token);
      return res;
    }
    // Some backends don't issue a token on register; try auto-login
    try {
      const loginRes = await login({ email: dto.email, password: dto.password });
      if (loginRes.ok && loginRes.data && loginRes.data.token) {
        // Return the login token as if it was part of register response
        return { ...res, data: { ...(res.data as any), token: loginRes.data.token } } as typeof res;
      }
    } catch {}
  }
  return res;
}

export function logout() {
  saveToken(null);
}

// Profile and password flows
export type UserDto = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  birthdate?: string;
};

export async function getProfile() {
  return api.get<UserDto>('/api/Auth/profile', { auth: true });
}

export async function updateProfile(payload: Partial<UserDto>) {
  return api.put<unknown>('/api/Auth/profile', payload, { auth: true });
}

export async function changePassword(current: string, next: string) {
  return api.post<unknown>('/api/Auth/change-password', { currentPassword: current, newPassword: next }, { auth: true });
}

export async function forgotPassword(email: string) {
  return api.post<unknown>('/api/Auth/forgot-password', { email });
}

export async function resetPassword(payload: { email: string; token: string; newPassword: string }) {
  return api.post<unknown>('/api/Auth/reset-password', payload);
}

export async function deleteAccount() {
  return api.del<unknown>('/api/Auth/account', { auth: true });
}
