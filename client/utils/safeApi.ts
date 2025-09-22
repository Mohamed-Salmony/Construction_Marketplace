import { api } from '../lib/api';
import { safeAsync, handleApiError } from './errorHandler';

// Safe API wrapper that never crashes the application
export class SafeAPI {
  // Safe GET request
  static async get<T>(
    endpoint: string, 
    options?: any,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    const result = await safeAsync(async () => {
      const response = await api.get<T>(endpoint, options);
      if (response.ok) {
        return response.data;
      }
      throw new Error(`API Error: ${response.status} - ${endpoint}`);
    }, fallback, context || `GET ${endpoint}`);
    return result ?? fallback;
  }

  // Safe POST request
  static async post<T>(
    endpoint: string,
    data?: any,
    options?: any,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    const result = await safeAsync(async () => {
      const response = await api.post<T>(endpoint, data, options);
      if (response.ok) {
        return response.data;
      }
      throw new Error(`API Error: ${response.status} - ${endpoint}`);
    }, fallback, context || `POST ${endpoint}`);
    return result ?? fallback;
  }

  // Safe PUT request
  static async put<T>(
    endpoint: string,
    data?: any,
    options?: any,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    const result = await safeAsync(async () => {
      const response = await api.put<T>(endpoint, data, options);
      if (response.ok) {
        return response.data;
      }
      throw new Error(`API Error: ${response.status} - ${endpoint}`);
    }, fallback, context || `PUT ${endpoint}`);
    return result ?? fallback;
  }

  // Safe DELETE request
  static async delete<T>(
    endpoint: string,
    options?: any,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    const result = await safeAsync(async () => {
      const response = await api.del<T>(endpoint, options);
      if (response.ok) {
        return response.data;
      }
      throw new Error(`API Error: ${response.status} - ${endpoint}`);
    }, fallback, context || `DELETE ${endpoint}`);
    return result ?? fallback;
  }

  // Safe PATCH request
  static async patch<T>(
    endpoint: string,
    data?: any,
    options?: any,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    const result = await safeAsync(async () => {
      const response = await api.patch<T>(endpoint, data, options);
      if (response.ok) {
        return response.data;
      }
      throw new Error(`API Error: ${response.status} - ${endpoint}`);
    }, fallback, context || `PATCH ${endpoint}`);
    return result ?? fallback;
  }

  // Bulk safe API calls - execute multiple requests and return results
  static async bulkRequest<T>(
    requests: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      endpoint: string;
      data?: any;
      options?: any;
      fallback?: T;
      context?: string;
    }>
  ): Promise<(T | undefined)[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'GET':
          return this.get(req.endpoint, req.options, req.fallback, req.context);
        case 'POST':
          return this.post(req.endpoint, req.data, req.options, req.fallback, req.context);
        case 'PUT':
          return this.put(req.endpoint, req.data, req.options, req.fallback, req.context);
        case 'DELETE':
          return this.delete(req.endpoint, req.options, req.fallback, req.context);
        case 'PATCH':
          return this.patch(req.endpoint, req.data, req.options, req.fallback, req.context);
        default:
          return Promise.resolve(req.fallback);
      }
    });

    // Use Promise.allSettled to ensure no request failure affects others
    const results = await Promise.allSettled(promises);
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn('Bulk request failed:', result.reason);
        return undefined;
      }
    });
  }

  // Retry mechanism for critical API calls
  static async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context: string = 'Retry Request'
  ): Promise<T | undefined> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        console.warn(`${context} - Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    // All attempts failed
    handleApiError(lastError, `${context} (${maxRetries} attempts)`);
    return undefined;
  }

  // Health check for API availability
  static async healthCheck(): Promise<boolean> {
    return await safeAsync(async () => {
      const response = await api.get('/api/health', { timeout: 5000 });
      return response.ok;
    }, false, 'API Health Check') || false;
  }
}

// Convenience exports
export const safeGet = SafeAPI.get.bind(SafeAPI);
export const safePost = SafeAPI.post.bind(SafeAPI);
export const safePut = SafeAPI.put.bind(SafeAPI);
export const safeDelete = SafeAPI.delete.bind(SafeAPI);
export const safePatch = SafeAPI.patch.bind(SafeAPI);
export const bulkRequest = SafeAPI.bulkRequest.bind(SafeAPI);
export const retryRequest = SafeAPI.retryRequest.bind(SafeAPI);
export const apiHealthCheck = SafeAPI.healthCheck.bind(SafeAPI);
