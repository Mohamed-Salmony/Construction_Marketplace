export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Default to the public backend URL if env is not provided (use HTTPS to avoid mixed content)

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Ensure base has no trailing slash to avoid double slashes when concatenating
const NORMALIZED_BASE = (() => {
  try {
    const base = (API_BASE || '').replace(/\/+$/, '');
    return base;
  } catch {
    return API_BASE;
  }
})();

// Runtime base: when developing on localhost, prefer local backend to avoid CORS with remote
const RUNTIME_BASE = (() => {
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:4000';
      }
    }
  } catch {}
  return NORMALIZED_BASE;
})();

function getAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    // Prefer explicit auth_token, fallback to token
    const keys = ['auth_token', 'token', 'access_token', 'jwt', 'userToken', 'Authorization'];
    for (const k of keys) {
      const v = localStorage.getItem(k) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(k) : null);
      if (v) {
        // Strip possible 'Bearer ' prefix
        return v.startsWith('Bearer ') ? v.slice(7) : v;
      }
    }
    // Try to parse common JSON blobs like 'user' or 'auth'
    const jsonCandidates = ['user', 'auth', 'profile'];
    for (const c of jsonCandidates) {
      const raw = localStorage.getItem(c) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(c) : null);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        const candidates = [obj?.token, obj?.accessToken, obj?.jwt, obj?.authorization, obj?.auth?.token, obj?.authToken];
        const found = candidates.find((x: any) => typeof x === 'string' && x.length > 10);
        if (found) return String(found).startsWith('Bearer ') ? String(found).slice(7) : String(found);
      } catch {}
    }
    // Fallback: read token from cookies if backend stores it there (multiple keys)
    const cookies = document.cookie.split('; ');
    for (const k of keys) {
      const row = cookies.find((r) => r.startsWith(`${k}=`));
      if (row) return decodeURIComponent(row.split('=')[1] || '');
    }
    // Only use cookies for auth to avoid stale/broken localStorage tokens
    const cookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth_token='));
    if (cookie) return decodeURIComponent(cookie.split('=')[1] || '');
    const cookieAlt = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='));
    if (cookieAlt) return decodeURIComponent(cookieAlt.split('=')[1] || '');
    // Fallback: some flows may persist token only in localStorage
    try {
      const ls = window.localStorage?.getItem('auth_token');
      if (ls) return ls;
    } catch {}
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  auth?: boolean; // include bearer token from storage (default: true)
  signal?: AbortSignal;
  cache?: RequestCache; // e.g., 'no-store' to bypass 304 caches
}): Promise<{ data: T | null; ok: boolean; status: number; error?: any }> {

  const url = path.startsWith('http')
    ? path
    : (() => {
        const hasApiOnBase = /\/api\/?$/.test(RUNTIME_BASE);
        const startsWithApi = path.startsWith('/api');
        const base = hasApiOnBase && startsWithApi
          ? RUNTIME_BASE.replace(/\/api\/?$/, '')
          : RUNTIME_BASE;
        return `${base}${path.startsWith('/') ? path : `/${path}`}`;
      })();
  const isForm = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers || {}),
  };

  // Attach Authorization header by default unless explicitly disabled (auth === false)
  const shouldAuth = options?.auth !== false;
  let useCredentials = false;
  if (shouldAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Always include credentials for auth requests in case server uses cookies
    useCredentials = true;
    // Debug: if no token found but we are including credentials, log once
    if (!token && typeof window !== 'undefined') {
      if (!(window as any).__apiAuthDebugged) {
        (window as any).__apiAuthDebugged = true;
        console.debug('[api] No bearer token found; including cookies with credentials for', path);
      }
    }
  }

  try {
    // Determine if the request is cross-origin (e.g., different port or domain)
    const isCrossOrigin = (() => {
      try {
        if (typeof window === 'undefined') return false;
        return new URL(url).origin !== window.location.origin;
      } catch {
        return false;
      }
    })();

    const res = await fetch(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? (isForm ? options.body : JSON.stringify(options.body)) : undefined,
      signal: options?.signal,
      cache: options?.cache,

      // Include cookies when authenticated or for cross-origin (different port/domain) requests
      credentials: useCredentials || isCrossOrigin ? 'include' : 'same-origin',
    });

    const status = res.status;
    const ok = res.ok;
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!ok) {
      return { data: null, ok: false, status, error: data };
    }

    return { data: data as T, ok: true, status };
  } catch (error) {
    return { data: null, ok: false, status: 0, error };
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<Parameters<typeof apiFetch<T>>[1], 'method'>) => apiFetch<T>(path, { ...(opts || {}), method: 'GET' }),
  post: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof apiFetch<T>>[1], 'method' | 'body'>) => apiFetch<T>(path, { ...(opts || {}), method: 'POST', body }),
  put: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof apiFetch<T>>[1], 'method' | 'body'>) => apiFetch<T>(path, { ...(opts || {}), method: 'PUT', body }),
  patch: <T>(path: string, body?: any, opts?: Omit<Parameters<typeof apiFetch<T>>[1], 'method' | 'body'>) => apiFetch<T>(path, { ...(opts || {}), method: 'PATCH', body }),
  del: <T>(path: string, opts?: Omit<Parameters<typeof apiFetch<T>>[1], 'method'>) => apiFetch<T>(path, { ...(opts || {}), method: 'DELETE' }),
  uploadFile: async (file: File, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return apiFetch<{ success: boolean; url: string; publicId: string }>(`/api/uploads${query}`, {
      method: 'POST',
      body: form,
      auth: true,
    });
  },
  uploadFiles: async (files: File[], folder?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    return apiFetch<{ success: boolean; items: Array<{ url: string; publicId: string; fileName: string }> }>(`/api/uploads/batch${query}`, {
      method: 'POST',
      body: form,
      auth: true,
    });
  },
};
