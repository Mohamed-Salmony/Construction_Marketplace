/**
 * Memory Optimizer for Render deployment
 * Handles memory leaks, cleanup, and monitoring for 512MB limit
 */

class MemoryOptimizer {
  constructor() {
    this.memoryThreshold = 350 * 1024 * 1024; // 350MB threshold on 512MB limit
    this.cleanupInterval = null;
    this.monitoringInterval = null;
    this.requestCount = 0;
    this.lastCleanup = Date.now();
    
    this.init();
  }

  init() {
    // Start memory monitoring
    this.startMemoryMonitoring();
    
    // Setup periodic cleanup
    this.setupPeriodicCleanup();
    
    // Handle browser environment
    if (typeof window !== 'undefined') {
      this.setupBrowserOptimizations();
    }
  }

  startMemoryMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 15000); // Check every 15 seconds
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    
    console.log(`[Memory] Heap: ${this.formatBytes(heapUsed)} / RSS: ${this.formatBytes(usage.rss)}`);
    
    // Force cleanup if approaching threshold
    if (heapUsed > this.memoryThreshold) {
      console.log('[Memory] High usage detected, forcing cleanup');
      this.forceCleanup();
    }
    
    // Log warning if very high
    if (heapUsed > 400 * 1024 * 1024) {
      console.warn('[Memory] CRITICAL: Memory usage very high!');
    }
  }

  forceCleanup() {
    try {
      // Clear require cache for non-essential modules
      this.clearRequireCache();
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        console.log('[GC] Forced garbage collection completed');
      }
      
      this.lastCleanup = Date.now();
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    }
  }

  clearRequireCache() {
    // Only clear non-essential cached modules
    const modulesToClear = [];
    
    for (const id in require.cache) {
      // Don't clear core modules or framework modules
      if (id.includes('node_modules') && 
          !id.includes('next') && 
          !id.includes('react') &&
          !id.includes('@radix-ui') &&
          !id.includes('lucide-react')) {
        modulesToClear.push(id);
      }
    }
    
    // Clear selected modules (limit to prevent issues)
    modulesToClear.slice(0, 10).forEach(id => {
      try {
        delete require.cache[id];
      } catch (e) {
        // Ignore errors
      }
    });
    
    if (modulesToClear.length > 0) {
      console.log(`[Cache] Cleared ${Math.min(10, modulesToClear.length)} cached modules`);
    }
  }

  setupPeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.requestCount++;
      
      // Cleanup every 100 requests or every 2 minutes
      if (this.requestCount % 100 === 0 || 
          (Date.now() - this.lastCleanup) > 120000) {
        this.forceCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  setupBrowserOptimizations() {
    if (typeof window === 'undefined') return;
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
    
    // Limit localStorage size
    this.limitLocalStorage();
    
    // Setup intersection observer cleanup
    this.setupIntersectionObserverCleanup();
  }

  limitLocalStorage() {
    try {
      const maxSize = 2 * 1024 * 1024; // 2MB limit for localStorage
      const currentSize = JSON.stringify(localStorage).length;
      
      if (currentSize > maxSize) {
        console.log('[Storage] localStorage size exceeded, cleaning up');
        
        // Keep only essential items
        const essentials = ['theme', 'cart', 'wishlist'];
        const backup = {};
        
        essentials.forEach(key => {
          if (localStorage.getItem(key)) {
            backup[key] = localStorage.getItem(key);
          }
        });
        
        localStorage.clear();
        
        Object.keys(backup).forEach(key => {
          localStorage.setItem(key, backup[key]);
        });
      }
    } catch (error) {
      console.error('[Storage] Error managing localStorage:', error);
    }
  }

  setupIntersectionObserverCleanup() {
    // Track and cleanup intersection observers
    const originalObserve = IntersectionObserver.prototype.observe;
    const observers = new Set();
    
    IntersectionObserver.prototype.observe = function(element) {
      observers.add(this);
      return originalObserve.call(this, element);
    };
    
    // Periodic cleanup of disconnected observers
    setInterval(() => {
      let cleaned = 0;
      observers.forEach(observer => {
        try {
          // Test if observer is still connected
          observer.takeRecords();
        } catch (e) {
          observer.disconnect();
          observers.delete(observer);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        console.log(`[Observers] Cleaned up ${cleaned} disconnected observers`);
      }
    }, 60000); // Every minute
  }

  formatBytes(bytes) {
    return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
  }

  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    console.log('[MemoryOptimizer] Cleanup completed');
  }

  // Public method to trigger cleanup
  triggerCleanup() {
    this.forceCleanup();
  }

  // Get memory stats
  getMemoryStats() {
    if (typeof process === 'undefined') return null;
    
    const usage = process.memoryUsage();
    return {
      heapUsed: this.formatBytes(usage.heapUsed),
      heapTotal: this.formatBytes(usage.heapTotal),
      rss: this.formatBytes(usage.rss),
      external: this.formatBytes(usage.external),
      requestCount: this.requestCount
    };
  }
}

// Singleton instance
let memoryOptimizer = null;

function getMemoryOptimizer() {
  if (!memoryOptimizer) {
    memoryOptimizer = new MemoryOptimizer();
  }
  return memoryOptimizer;
}

module.exports = {
  MemoryOptimizer,
  getMemoryOptimizer
};
