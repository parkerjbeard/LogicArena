#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * 
 * This script helps analyze the Next.js bundle size and identify optimization opportunities.
 * Run with: npm run analyze
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting bundle analysis...\n');

// Check if @next/bundle-analyzer is installed
try {
  require.resolve('@next/bundle-analyzer');
} catch (e) {
  console.log('📦 Installing @next/bundle-analyzer...');
  execSync('npm install --save-dev @next/bundle-analyzer', { stdio: 'inherit' });
}

// Create a temporary next.config.js with bundle analyzer enabled
const originalConfig = fs.readFileSync(path.join(__dirname, '../next.config.js'), 'utf8');
const analyzerConfig = `
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true,
});

${originalConfig.replace('module.exports = nextConfig', 'module.exports = withBundleAnalyzer(nextConfig)')}
`;

// Write temporary config
fs.writeFileSync(path.join(__dirname, '../next.config.js'), analyzerConfig);

try {
  // Build with analyzer
  console.log('🏗️  Building with bundle analyzer...\n');
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} finally {
  // Restore original config
  fs.writeFileSync(path.join(__dirname, '../next.config.js'), originalConfig);
  console.log('\n✅ Bundle analysis complete! Check the opened browser windows for details.');
}