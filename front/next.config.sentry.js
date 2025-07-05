// This file sets up the Next.js configuration with Sentry integration
const { withSentryConfig } = require("@sentry/nextjs");

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
  
  // Optimize images
  images: {
    domains: ['localhost'], // Add any external image domains here
    formats: ['image/avif', 'image/webp'],
  },
  
  // Webpack configuration for performance
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Replace react with preact in production for smaller bundle
      Object.assign(config.resolve.alias, {
        'react/jsx-runtime.js': 'preact/compat/jsx-runtime',
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
      });
    }

    // Add monaco-editor webpack configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Enable tree shaking for lodash
    config.resolve.alias['lodash'] = 'lodash-es';

    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    optimizePackageImports: ['lodash-es', 'lucide-react', '@heroicons/react'],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css|woff|woff2|ttf|otf)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Sentry configuration
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG || "logicarena",
  project: process.env.SENTRY_PROJECT || "frontend",

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',
  
  // Upload source maps during production build
  include: ".next",
  ignore: ["node_modules"],
  
  // Automatically release tracking
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Hide source maps from generated client bundles
  hideSourceMaps: true,
  
  // Disable source map uploading in development
  dryRun: process.env.NODE_ENV !== 'production',
};

// Export config wrapped with Sentry
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);