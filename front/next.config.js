/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Define env variables to be used in the frontend
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
    WS_URL: process.env.WS_URL || 'ws://localhost:8000',
  },
  
  // Configure CORS headers for API requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL ? `${process.env.API_URL}/api/:path*` : 'http://gateway:8000/api/:path*',
      },
    ];
  },

  // Bundle optimization configuration
  swcMinify: true, // Use SWC for faster minification
  
  // Enable compression for static assets
  compress: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production
  
  // Optimize for faster page loads
  poweredByHeader: false,
  generateEtags: false,
  
  // Configure webpack for better optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking and dead code elimination
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Split vendor code
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Split common code
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
            // Separate large libraries
            monaco: {
              test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
              name: 'monaco',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Separate UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|@heroicons|lucide-react|framer-motion)[\\/]/,
              name: 'ui',
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Replace React with Preact in production for smaller bundle
      // Uncomment if you want to use Preact (requires additional setup)
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   'react': 'preact/compat',
      //   'react-dom': 'preact/compat',
      // };
    }

    // Ignore unnecessary files
    config.module.rules.push({
      test: /\.(md|test\.tsx?|spec\.tsx?)$/,
      loader: 'ignore-loader',
    });

    return config;
  },

  // Experimental features for better performance
  experimental: {
    // Enable modern JavaScript output
    // optimizeCss: true, // Disabled - requires critters package
    // Enable server components tree shaking
    serverComponentsExternalPackages: ['monaco-editor', '@monaco-editor/react'],
    // Optimize bundle size with module imports
    optimizePackageImports: ['lucide-react', 'framer-motion', '@heroicons/react', 'lodash'],
    // Enable partial prerendering for faster initial loads
    // ppr: true, // Disabled - requires Next.js canary version
  },

  // Configure compression headers
  async headers() {
    return [
      {
        source: '/:all*(js|css|json|woff|woff2|webp|svg|png|jpg|jpeg)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*',
        locale: false,
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // TypeScript configuration
  typescript: {
    // Set to true to skip type checking during build (faster builds)
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig