/* Custom Next.js server with process-level error handlers and memory optimization */
const next = require('next');
const http = require('http');
const { getMemoryOptimizer } = require('./lib/memoryOptimizer');

// Initialize memory optimizer
const memoryOptimizer = getMemoryOptimizer();

// Process-level guards: never let the process exit on unexpected errors
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  const stats = memoryOptimizer.getMemoryStats();
  console.log('[Memory] Current usage:', stats);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason);
  const stats = memoryOptimizer.getMemoryStats();
  console.log('[Memory] Current usage:', stats);
});

// Memory pressure handling
process.on('SIGTERM', () => {
  console.log('[SIGTERM] Received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SIGINT] Received, shutting down gracefully');  
  process.exit(0);
});

const port = process.env.PORT || 3000;
const dev = false; // run production build

// Next.js app with memory optimization
const app = next({ 
  dev,
  // Reduce memory usage in production
  conf: {
    distDir: '.next',
    compress: true,
    // Limit concurrent builds to reduce memory pressure
    generateBuildId: async () => {
      return 'build-' + Date.now();
    }
  }
});

const handle = app.getRequestHandler();

async function start() {
  try {
    console.log('[Server] Preparing Next.js app...');
    console.log('[Memory] Initial usage:', memoryOptimizer.getMemoryStats());
    
    await app.prepare();
    
    console.log('[Server] Next.js app prepared, starting HTTP server...');
    console.log('[Memory] After prepare:', memoryOptimizer.getMemoryStats());
    
    const server = http.createServer(async (req, res) => {
      try {
        // Add request timeout to prevent memory leaks from hanging requests
        req.setTimeout(30000, () => {
          console.log('[Timeout] Request timeout for', req.url);
          if (!res.headersSent) {
            res.statusCode = 408;
            res.end('Request Timeout');
          }
        });
        
        await handle(req, res);
      } catch (err) {
        console.error('[requestHandlerError]', err);
        console.log('[Memory] After error:', memoryOptimizer.getMemoryStats());
        try {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        } catch (sendErr) {
          console.error('[responseSendError]', sendErr);
        }
      }
    });
    
    // Server configuration for memory optimization
    server.maxConnections = 100; // Limit concurrent connections
    server.timeout = 30000; // 30 seconds timeout
    server.keepAliveTimeout = 5000; // 5 seconds keep-alive
    server.headersTimeout = 10000; // 10 seconds headers timeout
    
    server.on('error', (err) => {
      console.error('[serverError]', err);
      logMemoryUsage();
    });
    
    server.on('connection', (socket) => {
      // Prevent socket timeout issues
      socket.setTimeout(30000);
    });
    
    server.listen(port, () => {
      console.log(`[Server] Ready on http://localhost:${port}`);
      console.log('[Server] Memory-optimized configuration loaded');
      console.log('[Memory] Server ready:', memoryOptimizer.getMemoryStats());
    });
    
  } catch (err) {
    console.error('[serverStartError]', err);
    console.log('[Memory] Server error:', memoryOptimizer.getMemoryStats());
    process.exit(1);
  }
}

start();
