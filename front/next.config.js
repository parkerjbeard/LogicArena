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
  
  // Configure webpack for better optimization with Bun compatibility
  webpack: (config, { dev, isServer }) => {
    // Fix Monaco Editor initialization
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // Add webpack plugin to define globals for Monaco
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          'global': 'globalThis',
        })
      );
    }
    
    // Bun-specific optimizations
    if (!dev) {
      // Use Bun's native capabilities where possible
      config.resolve = {
        ...config.resolve,
        // Prefer .ts files over .js for Bun's better TypeScript handling
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        // Speed up module resolution
        symlinks: false,
        // Cache module resolutions
        cache: true,
      };
    }

    // Production optimizations
    if (!dev && !isServer) {
      // Enable tree shaking and dead code elimination
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        // More aggressive chunk splitting for better caching
        splitChunks: {
          chunks: 'all',
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          minSize: 20000,
          cacheGroups: {
            // Split vendor code
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Split common code
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Separate large libraries
            monaco: {
              test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
              name: 'monaco',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
              chunks: 'async',
            },
            // Separate UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|@heroicons|lucide-react|framer-motion)[\\/]/,
              name: 'ui',
              priority: 15,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Framework chunks
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'framework',
              priority: 25,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
        // More aggressive minification
        minimizer: config.optimization.minimizer.map(plugin => {
          if (plugin.constructor.name === 'TerserPlugin') {
            plugin.options.terserOptions = {
              ...plugin.options.terserOptions,
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
              },
            };
          }
          return plugin;
        }),
      };
    }

    // Ignore unnecessary files
    config.module.rules.push({
      test: /\.(md|test\.tsx?|spec\.tsx?)$/,
      loader: 'ignore-loader',
    });

    // Optimize for Bun's module resolution
    config.resolve.preferRelative = true;

    return config;
  },

  // Experimental features for better performance with Bun
  experimental: {
    // Enable modern JavaScript output
    // optimizeCss: true, // Disabled - requires critters package
    // Enable server components tree shaking
    serverComponentsExternalPackages: ['monaco-editor', '@monaco-editor/react'],
    // Optimize bundle size with module imports
    optimizePackageImports: ['lucide-react', 'framer-motion', '@heroicons/react', 'lodash'],
    // Use Webpack's persistent caching
    webpackBuildWorker: true,
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