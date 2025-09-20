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
      // Allow API-served absolute image URLs (production)
      {
        protocol: 'https',
        hostname: 'construction-marketplace.onrender.com',
      },
    ],
  },

  reactStrictMode: true,
  
  // Performance optimizations (avoid optimizePackageImports due to SSR/prerender issues with some icon libs)
  experimental: {
    optimizeCss: true,
    // optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Ensure certain ESM-only packages are transpiled for SSR compatibility
  transpilePackages: ['lucide-react', '@radix-ui/react-icons'],
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Bundle analyzer and optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };
    }
    return config;
  },
  
  async rewrites() {
    return [
      { source: '/:locale/icon.svg', destination: '/icon.svg' },
      // Serve SVG favicon for /favicon.ico requests
      { source: '/favicon.ico', destination: '/favicon.svg' },
      // Fix Vercel Insights path when locale prefixes are present (e.g., /ar/_vercel/insights/...)
      { source: '/:locale/_vercel/insights/:path*', destination: '/_vercel/insights/:path*' },
      // Proxy API calls through the same origin to avoid cross-site CORS/cookie issues in production
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig