#!/bin/bash

# Render Build Script for Next.js Frontend
echo "🚀 Starting Render build process..."

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production --no-audit --no-fund --silent

# Build the application
echo "🔨 Building Next.js application..."
npm run build

# Verify build success
if [ -d ".next" ]; then
  echo "✅ Build completed successfully!"
  echo "📊 Build information:"
  du -sh .next
  ls -la .next
else
  echo "❌ Build failed - .next directory not found"
  exit 1
fi

echo "🎉 Render build process completed!"
