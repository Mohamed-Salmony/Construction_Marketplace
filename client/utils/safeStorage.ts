import { safeSync, logError } from './errorHandler';

// Safe storage utilities that never crash the application
export class SafeStorage {
  // Safe localStorage operations
  static setItem(key: string, value: string): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    }, false, 'localStorage setItem') || false;
  }

  static getItem(key: string): string | null {
    const result = safeSync(() => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    }, null, 'localStorage getItem');
    return result ?? null;
  }

  static removeItem(key: string): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      localStorage.removeItem(key);
      return true;
    }, false, 'localStorage removeItem') || false;
  }

  static clear(): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      localStorage.clear();
      return true;
    }, false, 'localStorage clear') || false;
  }

  // Safe sessionStorage operations
  static setSessionItem(key: string, value: string): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      sessionStorage.setItem(key, value);
      return true;
    }, false, 'sessionStorage setItem') || false;
  }

  static getSessionItem(key: string): string | null {
    const result = safeSync(() => {
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem(key);
    }, null, 'sessionStorage getItem');
    return result ?? null;
  }

  static removeSessionItem(key: string): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      sessionStorage.removeItem(key);
      return true;
    }, false, 'sessionStorage removeItem') || false;
  }

  static clearSession(): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      sessionStorage.clear();
      return true;
    }, false, 'sessionStorage clear') || false;
  }

  // Safe JSON operations
  static setJSON(key: string, value: any): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      return true;
    }, false, 'localStorage setJSON') || false;
  }

  static getJSON<T>(key: string, fallback?: T): T | null {
    const result = safeSync(() => {
      if (typeof window === 'undefined') return fallback || null;
      const item = localStorage.getItem(key);
      if (!item) return fallback || null;
      return JSON.parse(item) as T;
    }, fallback || null, 'localStorage getJSON');
    return result ?? (fallback || null);
  }

  static setSessionJSON(key: string, value: any): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      const jsonString = JSON.stringify(value);
      sessionStorage.setItem(key, jsonString);
      return true;
    }, false, 'sessionStorage setJSON') || false;
  }

  static getSessionJSON<T>(key: string, fallback?: T): T | null {
    const result = safeSync(() => {
      if (typeof window === 'undefined') return fallback || null;
      const item = sessionStorage.getItem(key);
      if (!item) return fallback || null;
      return JSON.parse(item) as T;
    }, fallback || null, 'sessionStorage getJSON');
    return result ?? (fallback || null);
  }

  // Check storage availability
  static isLocalStorageAvailable(): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    }, false, 'localStorage availability check') || false;
  }

  static isSessionStorageAvailable(): boolean {
    return safeSync(() => {
      if (typeof window === 'undefined') return false;
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    }, false, 'sessionStorage availability check') || false;
  }

  // Get storage size info
  static getStorageInfo(): { localStorage: number; sessionStorage: number } {
    return safeSync(() => {
      if (typeof window === 'undefined') return { localStorage: 0, sessionStorage: 0 };
      
      let localSize = 0;
      let sessionSize = 0;

      // Calculate localStorage size
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localSize += localStorage[key].length + key.length;
        }
      }

      // Calculate sessionStorage size
      for (let key in sessionStorage) {
        if (sessionStorage.hasOwnProperty(key)) {
          sessionSize += sessionStorage[key].length + key.length;
        }
      }

      return { localStorage: localSize, sessionStorage: sessionSize };
    }, { localStorage: 0, sessionStorage: 0 }, 'storage info') || { localStorage: 0, sessionStorage: 0 };
  }

  // Clean up expired items (if using expiration pattern)
  static cleanupExpired(): number {
    return safeSync(() => {
      if (typeof window === 'undefined') return 0;
      
      let cleaned = 0;
      const now = Date.now();
      const keysToRemove: string[] = [];

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        try {
          const item = localStorage.getItem(key);
          if (!item) continue;

          const parsed = JSON.parse(item);
          if (parsed && parsed.expires && parsed.expires < now) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Not a JSON item with expiration, skip
        }
      }

      // Remove expired items
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });

      return cleaned;
    }, 0, 'cleanup expired storage') || 0;
  }
}

// Convenience exports
export const setStorage = SafeStorage.setItem.bind(SafeStorage);
export const getStorage = SafeStorage.getItem.bind(SafeStorage);
export const removeStorage = SafeStorage.removeItem.bind(SafeStorage);
export const clearStorage = SafeStorage.clear.bind(SafeStorage);

export const setSession = SafeStorage.setSessionItem.bind(SafeStorage);
export const getSession = SafeStorage.getSessionItem.bind(SafeStorage);
export const removeSession = SafeStorage.removeSessionItem.bind(SafeStorage);
export const clearSession = SafeStorage.clearSession.bind(SafeStorage);

export const setJSON = SafeStorage.setJSON.bind(SafeStorage);
export const getJSON = SafeStorage.getJSON.bind(SafeStorage);
export const setSessionJSON = SafeStorage.setSessionJSON.bind(SafeStorage);
export const getSessionJSON = SafeStorage.getSessionJSON.bind(SafeStorage);

export const isStorageAvailable = SafeStorage.isLocalStorageAvailable.bind(SafeStorage);
export const isSessionAvailable = SafeStorage.isSessionStorageAvailable.bind(SafeStorage);
export const getStorageInfo = SafeStorage.getStorageInfo.bind(SafeStorage);
export const cleanupExpiredStorage = SafeStorage.cleanupExpired.bind(SafeStorage);
