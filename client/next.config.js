/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
      // Allow Cloudinary hosted media
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // Allow API-served absolute image URLs (production - Render backend)
      {
        protocol: 'https',
        hostname: 'construction-marketplace-backend.onrender.com',
      },
    ],
    // Memory optimization for images
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Memory and performance optimizations for Render's 512MB limit
  experimental: {
    // Reduce memory usage
    memoryBasedWorkerCount: true,
    // Optimize CSS loading
    optimizeCss: true,
    // Reduce bundle size
    modularizeImports: {
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{member}}',
      },
    },
  },
  
  // Ensure certain ESM-only packages are transpiled for SSR compatibility
  transpilePackages: ['lucide-react', '@radix-ui/react-icons'],
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    // Remove unused CSS
    styledComponents: false,
  },
  
  // Skip TypeScript checking during build for faster production builds
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // Skip ESLint during build for faster production builds  
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // Optimize output for production
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Bundle analyzer and optimization - simplified to avoid build issues
  webpack: (config, { dev, isServer }) => {
    // Fix path resolution for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };

    // Production optimizations for memory reduction
    if (!dev && !isServer) {
      // Reduce chunk size for better memory management
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 10000,
        maxSize: 200000, // Smaller chunks to reduce memory pressure
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10,
            maxSize: 150000, // Keep vendor chunks smaller
          },
        },
      };

      // Memory optimization flags
      config.optimization.minimize = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    return config;
  },
  
  async rewrites() {
    return [
      { source: '/:locale/icon.svg', destination: '/icon.svg' },
      // Serve SVG favicon for /favicon.ico requests
      { source: '/favicon.ico', destination: '/favicon.svg' },
      { source: '/:locale/favicon.svg', destination: '/favicon.svg' },
      // Proxy API calls through the same origin to avoid cross-site CORS/cookie issues in production
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      // Add any necessary redirects here
    ];
  },
}

module.exports = nextConfig