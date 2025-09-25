import { handleApiError } from '../utils/errorHandler';

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
      // In production, always use the env variable
      if (process.env.NODE_ENV === 'production') {
        console.log('[API Base] Using:', NORMALIZED_BASE);
        return NORMALIZED_BASE;
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
  // Optional timeout override in milliseconds (default: 30000, or 60000 for registration)
  timeoutMs?: number;
  // Optional retry settings
  retryAttempts?: number; // number of additional attempts on network/5xx/429 (default 0)
  retryBackoffMs?: number; // base backoff in ms (exponential) (default 500)
}): Promise<{ data: T | null; ok: boolean; status: number; error?: any }> {

  const url = (() => {
    if (path.startsWith('http')) return path;
    
    // Always use backend URL in production (not same-origin)
    const base = RUNTIME_BASE;
    const fullUrl = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    
    // Log API calls only when explicitly enabled via window.__API_DEBUG__
    if (typeof window !== 'undefined' && (window as any).__API_DEBUG__) {
      console.log('[API Debug]', options?.method || 'GET', fullUrl);
    }
    
    return fullUrl;
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

  const method = options?.method || 'GET';

  // Add timeout for requests (60 seconds for registration, 30 for others) with per-call override
  const isRegistration = path.includes('/register') || path.includes('/Auth/register');
  const timeoutMs = typeof options?.timeoutMs === 'number' && options?.timeoutMs! > 0
    ? options.timeoutMs!
    : (isRegistration ? 60000 : 30000);
  
  // Simple rate-limited warning for timeouts (per-path, 10s window)
  const warnKey = `[api-timeout] ${path}`;
  const canWarn = () => {
    try {
      if (typeof window === 'undefined') return true;
      const map = ((window as any).__apiWarns ||= new Map<string, number>());
      const now = Date.now();
      const last = map.get(warnKey) || 0;
      if (now - last > 10000) { map.set(warnKey, now); return true; }
      return false;
    } catch { return true; }
  };

  const attempts = Math.max(0, Number(options?.retryAttempts ?? 0));
  const baseBackoff = Math.max(0, Number(options?.retryBackoffMs ?? 500));

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  let lastError: any = null;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      timeoutId = setTimeout(() => {
        if (canWarn()) console.warn(`[api] Request timeout after ${timeoutMs}ms for ${path}`);
        controller.abort();
      }, timeoutMs);

      const finalSignal = options?.signal || controller.signal;

      const response = await fetch(url, {
        method,
        body: isForm ? options?.body : JSON.stringify(options?.body),
        headers,
        signal: finalSignal,
        credentials: useCredentials ? 'include' : undefined,
        cache: options?.cache,
      });

      clearTimeout(timeoutId);

      // Log response only when debug is enabled
      if (typeof window !== 'undefined' && (window as any).__API_DEBUG__) {
        console.log('[API Response]', response.status, url);
        if (!response.ok) {
          console.error('[API Error]', response.status, response.statusText, url);
        }
      }

      // Retry on 429/5xx when attempts remain
      if (!response.ok && attempt < attempts && (response.status === 429 || response.status >= 500)) {
        const delay = baseBackoff * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      let data: T | null = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        if (!(response.bodyUsed || !response.body)) {
          if ((window as any).__API_DEBUG__) console.warn(`Failed to parse JSON from ${url}:`, jsonErr);
        }
      }

      return {
        data,
        ok: response.ok,
        status: response.status,
        error: !response.ok ? { status: response.status, message: response.statusText || 'Request failed' } : undefined,
      };
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = error;
      // Only log in debug mode
      if (typeof window !== 'undefined' && (window as any).__API_DEBUG__) {
        console.error('[API Network Error]', error?.message || error, url);
      }
      // Do not handle abort here; will retry if attempts remain
      if (attempt < attempts) {
        const delay = baseBackoff * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      // Fall-through: return error response
      const isAbort = error?.name === 'AbortError';
      if (!isAbort) handleApiError(error, `API: ${method} ${url}`);
      return {
        data: null,
        ok: false,
        status: isAbort ? 408 : 0,
        error: {
          status: isAbort ? 408 : 0,
          message: isAbort && (error?.message || '').includes('timeout')
            ? `Request timeout after ${timeoutMs || 30000}ms`
            : error?.message || 'Network error',
          name: error?.name || 'Error',
        },
      };
    }
  }

  // Should never reach here, but return last error if it happens
  return {
    data: null,
    ok: false,
    status: 0,
    error: { status: 0, message: lastError?.message || 'Unknown error', name: lastError?.name || 'Error' },
  };
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
