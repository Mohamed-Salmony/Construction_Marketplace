/**
 * Optimized Cache System for Products and API calls
 * Prevents memory leaks and reduces API calls
 */

class OptimizedCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached items
    this.maxAge = 5 * 60 * 1000; // 5 minutes TTL
    this.cleanupInterval = null;
    
    this.init();
  }

  init() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  set(key, value, customTTL = null) {
    const ttl = customTTL || this.maxAge;
    const item = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };

    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, item);
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    item.lastAccess = Date.now();
    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    // Remove expired items
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cache] Cleaned ${cleanedCount} expired items`);
    }

    // If still too large, remove oldest items
    if (this.cache.size > this.maxSize * 0.8) { // 80% threshold
      this.evictOldest(Math.floor(this.maxSize * 0.2)); // Remove 20%
    }
  }

  evictOldest(count = 1) {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last access time (oldest first)
    entries.sort((a, b) => {
      const aAccess = a[1].lastAccess || a[1].timestamp;
      const bAccess = b[1].lastAccess || b[1].timestamp;
      return aAccess - bAccess;
    });

    // Remove oldest entries
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    if (count > 1) {
      console.log(`[Cache] Evicted ${count} oldest items`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: `${Math.round((this.cache.size / this.maxSize) * 100)}%`
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// API Cache Manager with specific optimizations
class ApiCacheManager {
  constructor() {
    this.productCache = new OptimizedCache();
    this.categoryCache = new OptimizedCache();
    this.generalCache = new OptimizedCache();
    
    // Set different TTLs for different data types
    this.productCache.maxAge = 10 * 60 * 1000; // 10 minutes for products
    this.categoryCache.maxAge = 30 * 60 * 1000; // 30 minutes for categories
    this.generalCache.maxAge = 5 * 60 * 1000; // 5 minutes for general data
    
    // Limit cache sizes
    this.productCache.maxSize = 50;
    this.categoryCache.maxSize = 20;
    this.generalCache.maxSize = 30;
  }

  // Product caching
  cacheProduct(id, product) {
    this.productCache.set(`product_${id}`, product);
  }

  getProduct(id) {
    return this.productCache.get(`product_${id}`);
  }

  hasProduct(id) {
    return this.productCache.has(`product_${id}`);
  }

  // Category caching
  cacheCategories(categories) {
    this.categoryCache.set('categories', categories, 30 * 60 * 1000); // 30 min
  }

  getCategories() {
    return this.categoryCache.get('categories');
  }

  // General API caching
  cacheApiResponse(url, response, ttl = null) {
    const key = this.hashUrl(url);
    this.generalCache.set(key, response, ttl);
  }

  getApiResponse(url) {
    const key = this.hashUrl(url);
    return this.generalCache.get(key);
  }

  hasApiResponse(url) {
    const key = this.hashUrl(url);
    return this.generalCache.has(key);
  }

  // URL hashing for cache keys
  hashUrl(url) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `api_${hash}`;
  }

  // Cleanup methods
  clearProductCache() {
    this.productCache.clear();
  }

  clearCategoryCache() {
    this.categoryCache.clear();
  }

  clearAllCaches() {
    this.productCache.clear();
    this.categoryCache.clear();
    this.generalCache.clear();
  }

  // Memory-aware cache management
  checkMemoryPressure() {
    const stats = this.getStats();
    const totalItems = stats.products.size + stats.categories.size + stats.general.size;
    
    // If too many items cached, clear oldest cache first
    if (totalItems > 80) {
      console.log('[Cache] Memory pressure detected, clearing general cache');
      this.generalCache.clear();
    }
  }

  getStats() {
    return {
      products: this.productCache.getStats(),
      categories: this.categoryCache.getStats(),
      general: this.generalCache.getStats()
    };
  }

  destroy() {
    this.productCache.destroy();
    this.categoryCache.destroy();
    this.generalCache.destroy();
  }
}

// Singleton instances
let apiCacheManager = null;

function getApiCacheManager() {
  if (!apiCacheManager) {
    apiCacheManager = new ApiCacheManager();
  }
  return apiCacheManager;
}

module.exports = {
  OptimizedCache,
  ApiCacheManager,
  getApiCacheManager
};
