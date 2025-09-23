/**
 * Advanced Process Manager for Production Stability
 */

export class ProcessManager {
  constructor() {
    this.isShuttingDown = false;
    this.memoryThreshold = 400 * 1024 * 1024; // 400MB
    this.errorCount = 0;
    this.maxErrors = 10;
    this.lastErrorTime = 0;
    this.startTime = Date.now();
    
    this.setupProcessListeners();
    this.startMemoryMonitoring();
    this.setupHealthChecks();
  }

  setupProcessListeners() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 [CRITICAL] Uncaught Exception:', error);
      this.logError(error, 'uncaughtException');
      
      // Don't exit in production, try to recover
      if (process.env.NODE_ENV === 'production') {
        this.handleRecovery('uncaughtException', error);
      } else {
        process.exit(1);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
      this.logError(reason, 'unhandledRejection');
      
      // Don't exit in production, try to recover
      if (process.env.NODE_ENV === 'production') {
        this.handleRecovery('unhandledRejection', reason);
      }
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      console.log('🔄 [INFO] SIGTERM received, starting graceful shutdown...');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT gracefully (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('🔄 [INFO] SIGINT received, starting graceful shutdown...');
      this.gracefulShutdown('SIGINT');
    });

    // Handle warning events
    process.on('warning', (warning) => {
      console.warn('⚠️  [WARNING]', warning.name, warning.message);
      if (warning.stack) console.warn(warning.stack);
    });
  }

  handleRecovery(type, error) {
    this.errorCount++;
    const now = Date.now();
    
    // If too many errors in short time, exit
    if (this.errorCount > this.maxErrors && (now - this.lastErrorTime) < 60000) {
      console.error('🚨 [FATAL] Too many errors, forcing exit...');
      process.exit(1);
    }
    
    this.lastErrorTime = now;
    
    try {
      // Force garbage collection to free memory
      if (global.gc) {
        global.gc();
        console.log('♻️  [RECOVERY] Garbage collection executed');
      }
      
      // Clear require cache for non-critical modules
      this.clearNonCriticalCache();
      
      console.log(`🔧 [RECOVERY] Attempted recovery for ${type}`);
    } catch (recoveryError) {
      console.error('❌ [ERROR] Recovery failed:', recoveryError);
      process.exit(1);
    }
  }

  clearNonCriticalCache() {
    try {
      const moduleIds = Object.keys(require.cache);
      const criticalModules = ['express', 'mongoose', 'cors', 'helmet'];
      
      moduleIds.forEach(moduleId => {
        const isCritical = criticalModules.some(critical => 
          moduleId.includes(critical)
        );
        
        if (!isCritical && !moduleId.includes('node_modules')) {
          delete require.cache[moduleId];
        }
      });
      
      console.log('🧹 [CLEANUP] Non-critical modules cleared from cache');
    } catch (error) {
      console.error('❌ [ERROR] Cache cleanup failed:', error);
    }
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const memoryMB = usage.heapUsed / 1024 / 1024;
      
      // Log memory usage every 5 minutes
      if (Date.now() % (5 * 60 * 1000) < 30000) {
        console.log(`📊 [MEMORY] Heap: ${memoryMB.toFixed(2)}MB / RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB`);
      }
      
      // Force GC if memory is high
      if (usage.heapUsed > this.memoryThreshold && global.gc) {
        console.log('⚠️  [MEMORY] High memory usage, forcing GC...');
        global.gc();
        
        const newUsage = process.memoryUsage();
        const newMemoryMB = newUsage.heapUsed / 1024 / 1024;
        console.log(`♻️  [MEMORY] After GC: ${newMemoryMB.toFixed(2)}MB`);
      }
    }, 30000); // Every 30 seconds
  }

  setupHealthChecks() {
    // Self-health check every minute
    setInterval(() => {
      const uptime = Date.now() - this.startTime;
      const uptimeMinutes = Math.floor(uptime / 60000);
      
      console.log(`💚 [HEALTH] Server alive - Uptime: ${uptimeMinutes}m, Errors: ${this.errorCount}`);
      
      // Reset error count after successful period
      if (uptimeMinutes > 0 && uptimeMinutes % 60 === 0) {
        this.errorCount = Math.max(0, this.errorCount - 1);
        console.log('🔄 [HEALTH] Error count decremented for stability');
      }
    }, 60000); // Every minute
  }

  gracefulShutdown(signal) {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log(`🛑 [SHUTDOWN] Graceful shutdown initiated by ${signal}`);
    
    // Close server gracefully
    if (this.server) {
      this.server.close((err) => {
        if (err) {
          console.error('❌ [ERROR] Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ [SHUTDOWN] Server closed gracefully');
        process.exit(0);
      });
      
      // Force exit after 30 seconds
      setTimeout(() => {
        console.error('⏰ [TIMEOUT] Force exit after shutdown timeout');
        process.exit(1);
      }, 30000);
    } else {
      process.exit(0);
    }
  }

  setServer(server) {
    this.server = server;
  }

  logError(error, type) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      type,
      message: error?.message || String(error),
      stack: error?.stack,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
    
    // In production, you might want to send this to a logging service
    console.error('📝 [ERROR LOG]', JSON.stringify(errorInfo, null, 2));
  }
}

// Singleton instance
export const processManager = new ProcessManager();
