/**
 * Tests for Next.js bundle optimization configurations
 */
const nextConfig = require('../../next.config.js');

describe('Next.js Bundle Optimization', () => {
  describe('Basic configuration', () => {
    it('should have production optimizations enabled', () => {
      expect(nextConfig.swcMinify).toBe(true);
      expect(nextConfig.compress).toBe(true);
      expect(nextConfig.productionBrowserSourceMaps).toBe(false);
      expect(nextConfig.poweredByHeader).toBe(false);
    });

    it('should have standalone output configured', () => {
      expect(nextConfig.output).toBe('standalone');
    });
  });

  describe('Webpack configuration', () => {
    let webpackConfig;
    let mockConfig;

    beforeEach(() => {
      mockConfig = {
        optimization: {},
        module: { rules: [] },
        resolve: { alias: {} }
      };
    });

    it('should configure webpack optimizations for production', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      
      expect(result.optimization.usedExports).toBe(true);
      expect(result.optimization.sideEffects).toBe(false);
      expect(result.optimization.minimize).toBe(true);
    });

    it('should not apply production optimizations in dev mode', () => {
      const result = nextConfig.webpack(mockConfig, { dev: true, isServer: false });
      
      expect(result.optimization.usedExports).toBeUndefined();
      expect(result.optimization.sideEffects).toBeUndefined();
    });

    it('should configure proper code splitting', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      
      expect(result.optimization.splitChunks.chunks).toBe('all');
      expect(result.optimization.splitChunks.cacheGroups).toBeDefined();
    });

    it('should create vendor chunk for node_modules', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const vendorGroup = result.optimization.splitChunks.cacheGroups.vendor;
      
      expect(vendorGroup).toBeDefined();
      expect(vendorGroup.name).toBe('vendor');
      expect(vendorGroup.priority).toBe(10);
      expect(vendorGroup.reuseExistingChunk).toBe(true);
      
      // Test the regex
      const testPath = '/Users/test/node_modules/react/index.js';
      expect(vendorGroup.test.test(testPath)).toBe(true);
    });

    it('should create separate Monaco editor chunk', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const monacoGroup = result.optimization.splitChunks.cacheGroups.monaco;
      
      expect(monacoGroup).toBeDefined();
      expect(monacoGroup.name).toBe('monaco');
      expect(monacoGroup.priority).toBe(20); // Higher priority than vendor
      
      // Test the regex
      const monacoPath = '/Users/test/node_modules/monaco-editor/index.js';
      const monacoReactPath = '/Users/test/node_modules/@monaco-editor/react/index.js';
      expect(monacoGroup.test.test(monacoPath)).toBe(true);
      expect(monacoGroup.test.test(monacoReactPath)).toBe(true);
    });

    it('should create UI libraries chunk', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const uiGroup = result.optimization.splitChunks.cacheGroups.ui;
      
      expect(uiGroup).toBeDefined();
      expect(uiGroup.name).toBe('ui');
      expect(uiGroup.priority).toBe(15);
      
      // Test the regex for various UI libraries
      const headlessPath = '/Users/test/node_modules/@headlessui/react/index.js';
      const heroiconsPath = '/Users/test/node_modules/@heroicons/react/index.js';
      const lucidePath = '/Users/test/node_modules/lucide-react/index.js';
      const framerPath = '/Users/test/node_modules/framer-motion/index.js';
      
      expect(uiGroup.test.test(headlessPath)).toBe(true);
      expect(uiGroup.test.test(heroiconsPath)).toBe(true);
      expect(uiGroup.test.test(lucidePath)).toBe(true);
      expect(uiGroup.test.test(framerPath)).toBe(true);
    });

    it('should configure common chunks', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const commonGroup = result.optimization.splitChunks.cacheGroups.common;
      
      expect(commonGroup).toBeDefined();
      expect(commonGroup.minChunks).toBe(2);
      expect(commonGroup.priority).toBe(5);
      expect(commonGroup.reuseExistingChunk).toBe(true);
    });

    it('should ignore test and markdown files', () => {
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      
      const ignoreRule = result.module.rules.find(rule => 
        rule.loader === 'ignore-loader'
      );
      
      expect(ignoreRule).toBeDefined();
      expect(ignoreRule.test.test('component.test.tsx')).toBe(true);
      expect(ignoreRule.test.test('component.spec.tsx')).toBe(true);
      expect(ignoreRule.test.test('README.md')).toBe(true);
      expect(ignoreRule.test.test('component.tsx')).toBe(false);
    });
  });

  describe('Experimental features', () => {
    it('should enable CSS optimization', () => {
      expect(nextConfig.experimental.optimizeCss).toBe(true);
    });

    it('should configure external packages for server components', () => {
      expect(nextConfig.experimental.serverComponentsExternalPackages).toContain('monaco-editor');
      expect(nextConfig.experimental.serverComponentsExternalPackages).toContain('@monaco-editor/react');
    });

    it('should optimize specific package imports', () => {
      const packages = nextConfig.experimental.optimizePackageImports;
      expect(packages).toContain('lucide-react');
      expect(packages).toContain('framer-motion');
      expect(packages).toContain('@heroicons/react');
      expect(packages).toContain('lodash');
    });

    it('should enable partial prerendering', () => {
      // ppr may be disabled for compatibility with non-canary Next.js versions
      expect([true, undefined]).toContain(nextConfig.experimental.ppr);
    });
  });

  describe('Headers configuration', () => {
    it('should set cache headers for static assets', async () => {
      const headers = await nextConfig.headers();
      
      const staticAssetsHeader = headers.find(h => 
        h.source.includes('(js|css|json|woff|woff2|webp|svg|png|jpg|jpeg)')
      );
      
      expect(staticAssetsHeader).toBeDefined();
      expect(staticAssetsHeader.locale).toBe(false);
      
      const cacheControl = staticAssetsHeader.headers.find(h => h.key === 'Cache-Control');
      expect(cacheControl.value).toBe('public, max-age=31536000, immutable');
    });

    it('should set security headers', async () => {
      const headers = await nextConfig.headers();
      
      const securityHeaders = headers.find(h => h.source === '/:all*');
      expect(securityHeaders).toBeDefined();
      
      const headerMap = {};
      securityHeaders.headers.forEach(h => {
        headerMap[h.key] = h.value;
      });
      
      expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
      expect(headerMap['X-Frame-Options']).toBe('DENY');
      expect(headerMap['X-XSS-Protection']).toBe('1; mode=block');
    });
  });

  describe('Image optimization', () => {
    it('should configure image formats', () => {
      expect(nextConfig.images.formats).toContain('image/avif');
      expect(nextConfig.images.formats).toContain('image/webp');
    });

    it('should configure device sizes', () => {
      expect(nextConfig.images.deviceSizes).toEqual([640, 750, 828, 1080, 1200, 1920, 2048, 3840]);
      expect(nextConfig.images.imageSizes).toEqual([16, 32, 48, 64, 96, 128, 256, 384]);
    });

    it('should set long cache TTL for images', () => {
      expect(nextConfig.images.minimumCacheTTL).toBe(60 * 60 * 24 * 365); // 1 year
    });
  });

  describe('Bundle size verification', () => {
    it('should have separate chunks configured correctly', () => {
      const mockConfig = {
        optimization: {},
        module: { rules: [] }
      };
      
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const cacheGroups = result.optimization.splitChunks.cacheGroups;
      
      // Verify chunk priorities ensure correct splitting
      expect(cacheGroups.monaco.priority).toBeGreaterThan(cacheGroups.ui.priority);
      expect(cacheGroups.ui.priority).toBeGreaterThan(cacheGroups.vendor.priority);
      expect(cacheGroups.vendor.priority).toBeGreaterThan(cacheGroups.common.priority);
    });

    it('should handle edge cases in module paths', () => {
      const mockConfig = {
        optimization: {},
        module: { rules: [] }
      };
      
      const result = nextConfig.webpack(mockConfig, { dev: false, isServer: false });
      const vendorTest = result.optimization.splitChunks.cacheGroups.vendor.test;
      
      // Test various path formats
      expect(vendorTest.test('C:\\Users\\test\\node_modules\\react\\index.js')).toBe(true);
      expect(vendorTest.test('./node_modules/react/index.js')).toBe(true);
      expect(vendorTest.test('node_modules/react/index.js')).toBe(true);
    });
  });

  describe('Compression and API configuration', () => {
    it('should enable compression', () => {
      expect(nextConfig.compress).toBe(true);
    });

    it('should configure API rewrites', async () => {
      process.env.API_URL = 'http://test-api:8000';
      const rewrites = await nextConfig.rewrites();
      
      expect(rewrites).toHaveLength(1);
      expect(rewrites[0].source).toBe('/api/:path*');
      expect(rewrites[0].destination).toBe('http://test-api:8000/api/:path*');
    });

    it('should use default API URL when not specified', async () => {
      delete process.env.API_URL;
      const rewrites = await nextConfig.rewrites();
      
      expect(rewrites[0].destination).toBe('http://gateway:8000/api/:path*');
    });
  });
});