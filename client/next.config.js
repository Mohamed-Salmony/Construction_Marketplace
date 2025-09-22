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
    // Note: optimizeCss disabled due to critters issues in production
    // optimizeCss: true,
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

  // Note: standalone output disabled due to prerendering issues on Render
  // output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Simplified webpack config to avoid build issues on Render
  webpack: (config, { dev, isServer }) => {
    // Fix path resolution for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };

    // Simplified production optimizations
    if (!dev && !isServer) {
      // Basic chunk optimization without complex settings
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
      };
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