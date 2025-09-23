#!/usr/bin/env node

/**
 * Pre-deployment Test Script
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 [TEST] Running pre-deployment tests...\n');

let testsPassed = 0;
let testsTotal = 0;

function test(name, condition) {
  testsTotal++;
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ [FAIL] ${name}`);
  }
}

// Test 1: Package.json validation
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  test('Package.json exists and is valid', true);
  test('Package.json has npm engines specified', pkg.engines && pkg.engines.npm);
  test('Package.json has render-build script', pkg.scripts && pkg.scripts['render-build']);
  test('Package.json has render-start script', pkg.scripts && pkg.scripts['render-start']);
} catch (error) {
  test('Package.json exists and is valid', false);
}

// Test 2: Critical files existence
const criticalFiles = [
  'index.js',
  'config/db.js',
  'config/cloudinary.js',
  'utils/processManager.js',
  'middlewares/error.js',
  '.env.render'
];

criticalFiles.forEach(file => {
  const filePath = join(__dirname, file);
  test(`Critical file exists: ${file}`, existsSync(filePath));
});

// Test 3: Environment variables template
try {
  const envTemplate = readFileSync(join(__dirname, '.env.render'), 'utf8');
  test('.env.render contains NODE_ENV', envTemplate.includes('NODE_ENV=production'));
  test('.env.render contains NODE_OPTIONS', envTemplate.includes('NODE_OPTIONS='));
  test('.env.render contains PORT', envTemplate.includes('PORT='));
} catch (error) {
  test('.env.render file readable', false);
}

// Test 4: Dependencies check
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  const requiredDeps = [
    'express', 'mongoose', 'cors', 'helmet', 'jsonwebtoken', 
    'bcryptjs', 'cloudinary', 'multer', 'express-rate-limit'
  ];
  
  requiredDeps.forEach(dep => {
    test(`Dependency exists: ${dep}`, pkg.dependencies && pkg.dependencies[dep]);
  });
} catch (error) {
  test('Dependencies check', false);
}

// Test 5: Routes structure
const routesDir = join(__dirname, 'routes');
const expectedRoutes = [
  'auth.routes.js',
  'products.routes.js',
  'orders.routes.js',
  'admin.routes.js'
];

expectedRoutes.forEach(route => {
  const routePath = join(routesDir, route);
  test(`Route file exists: ${route}`, existsSync(routePath));
});

// Test 6: Models structure
const modelsDir = join(__dirname, 'models');
test('Models directory exists', existsSync(modelsDir));

// Test 7: Process Manager validation
try {
  const processManagerPath = join(__dirname, 'utils/processManager.js');
  const processManagerCode = readFileSync(processManagerPath, 'utf8');
  test('ProcessManager contains memory monitoring', processManagerCode.includes('startMemoryMonitoring'));
  test('ProcessManager contains error handling', processManagerCode.includes('setupProcessListeners'));
  test('ProcessManager contains graceful shutdown', processManagerCode.includes('gracefulShutdown'));
} catch (error) {
  test('ProcessManager validation', false);
}

// Results
console.log('\n' + '='.repeat(50));
console.log(`📊 [RESULTS] Tests: ${testsPassed}/${testsTotal} passed`);

if (testsPassed === testsTotal) {
  console.log('🎉 [SUCCESS] All tests passed! Backend is ready for deployment.');
  console.log('\n📋 [NEXT STEPS]:');
  console.log('1. Push your code to GitHub');
  console.log('2. Create new Web Service on Render');
  console.log('3. Set environment variables in Render dashboard');
  console.log('4. Deploy and monitor the logs');
  console.log('\n🔗 [USEFUL COMMANDS]:');
  console.log('npm run render-build  # Test build process');
  console.log('npm run render-start  # Test start process');
  process.exit(0);
} else {
  console.log(`❌ [FAILURE] ${testsTotal - testsPassed} tests failed. Please fix issues before deployment.`);
  process.exit(1);
}
