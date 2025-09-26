#!/usr/bin/env node

/**
 * Enhanced Render Startup Script
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverRoot = join(__dirname, '..');

console.log('🚀 [RENDER-STARTUP] Initializing Construction Marketplace Backend...');

// Validate environment
function validateEnvironment() {
  const requiredVars = ['NODE_ENV', 'MONGO_URI', 'JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ [ERROR] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ [CHECK] Environment variables validated');
}

// Check package.json integrity
function validatePackage() {
  const packagePath = join(serverRoot, 'package.json');
  
  if (!existsSync(packagePath)) {
    console.error('❌ [ERROR] package.json not found');
    process.exit(1);
  }
  
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    console.log(`✅ [CHECK] Package validated: ${pkg.name}@${pkg.version}`);
    return pkg;
  } catch (error) {
    console.error('❌ [ERROR] Invalid package.json:', error.message);
    process.exit(1);
  }
}

// Check critical files
function validateCriticalFiles() {
  const criticalFiles = [
    'index.js',
    'config/db.js',
    'config/cloudinary.js',
    'utils/processManager.js'
  ];
  
  for (const file of criticalFiles) {
    const filePath = join(serverRoot, file);
    if (!existsSync(filePath)) {
      console.error(`❌ [ERROR] Critical file missing: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✅ [CHECK] All critical files present');
}

// Setup process monitoring
function setupMonitoring() {
  let restartCount = 0;
  const maxRestarts = 5;
  const restartWindow = 10 * 60 * 1000; // 10 minutes
  let lastRestart = 0;

  function startServer() {
    const now = Date.now();
    
    // Reset restart count if enough time has passed
    if (now - lastRestart > restartWindow) {
      restartCount = 0;
    }
    
    if (restartCount >= maxRestarts) {
      console.error(`🚨 [FATAL] Too many restarts (${restartCount}), giving up`);
      process.exit(1);
    }
    
    console.log(`🔄 [START] Starting server (attempt ${restartCount + 1}/${maxRestarts})`);
    
    const serverProcess = spawn('node', [
      '--max-old-space-size=400',
      '--expose-gc',
      '--unhandled-rejections=strict',
      'index.js'
    ], {
      cwd: serverRoot,
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    serverProcess.on('exit', (code, signal) => {
      console.log(`🔄 [EXIT] Server exited with code ${code}, signal ${signal}`);
      
      if (code === 0) {
        console.log('✅ [SHUTDOWN] Server shutdown gracefully');
        process.exit(0);
      }
      
      // Restart if not graceful shutdown
      restartCount++;
      lastRestart = Date.now();
      
      console.log(`⚠️  [RESTART] Restarting in 5 seconds... (${restartCount}/${maxRestarts})`);
      setTimeout(startServer, 5000);
    });
    
    serverProcess.on('error', (error) => {
      console.error('❌ [ERROR] Failed to start server:', error);
      restartCount++;
      lastRestart = Date.now();
      
      if (restartCount < maxRestarts) {
        console.log(`⚠️  [RESTART] Restarting in 10 seconds... (${restartCount}/${maxRestarts})`);
        setTimeout(startServer, 10000);
      } else {
        console.error('🚨 [FATAL] Max restart attempts reached');
        process.exit(1);
      }
    });
    
    // Health check ping
    setTimeout(() => {
      import('http').then(({ default: http }) => {
        const port = process.env.PORT || 4000;
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          if (res.statusCode === 200) {
            console.log('💚 [HEALTH] Server is responding to health checks');
          }
        });
        
        req.on('error', (error) => {
          console.warn('⚠️  [WARNING] Health check failed:', error.message);
        });
        
        req.setTimeout(5000);
      });
    }, 30000); // Check after 30 seconds
  }
  
  return startServer;
}

// Graceful shutdown handling
function setupShutdownHandlers() {
  process.on('SIGTERM', () => {
    console.log('🛑 [SHUTDOWN] SIGTERM received, initiating graceful shutdown...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 [SHUTDOWN] SIGINT received, initiating graceful shutdown...');
    process.exit(0);
  });
}

// Main execution
async function main() {
  try {
    console.log('🔍 [INIT] Running pre-flight checks...');
    
    validateEnvironment();
    validatePackage();
    validateCriticalFiles();
    setupShutdownHandlers();
    
    console.log('✅ [INIT] All checks passed, starting server...');
    
    const startServer = setupMonitoring();
    startServer();
    
  } catch (error) {
    console.error('🚨 [FATAL] Startup failed:', error);
    process.exit(1);
  }
}

main();
