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
  },

  reactStrictMode: false,
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Performance optimizations
  experimental: {
    // Keep experimental features minimal for Render compatibility
  },
  // Ensure certain ESM-only packages are transpiled for SSR compatibility
  transpilePackages: ['lucide-react', '@radix-ui/react-icons'],
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Skip TypeScript checking during build for faster production builds
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // Skip ESLint during build for faster production builds  
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // Bundle analyzer and optimization - simplified to avoid build issues
  webpack: (config, { dev, isServer }) => {
    // Fix path resolution for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    
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