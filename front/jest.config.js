const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testTimeout: 30000,
  maxWorkers: 1,
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  testPathIgnorePatterns: (() => {
    const base = [
      '/node_modules/',
      '/~/.bun/',
      '/.bun/',
      '/dist/',
      '/.next/',
    ];
    if (process.env.SKIP_WS_TESTS) {
      base.push('/src/lib/__tests__/websocket\\..*test\\.tsx$');
      base.push('/src/lib/__tests__/websocket\\..*test\\.ts$');
    }
    return base;
  })(),
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/~/.bun/',
    '/.bun/',
    '/dist/',
    '/.next/',
  ],
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/~/.bun/',
    '/.bun/',
    '/dist/',
    '/.next/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  haste: {
    forceNodeFilesystemAPI: true,
  },
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|isomorphic-ws)/)',
  ],
  // Prevent process from crashing on OOM by limiting heap per worker
  workerIdleMemoryLimit: '1024MB',
  reporters: [
    'default',
  ],
  verbose: false,
  forceExit: false,
  cache: false,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)