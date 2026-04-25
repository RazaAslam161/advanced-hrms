/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '^\\.{1,2}/(.*\\/)?env(\\.ts)?$': '<rootDir>/src/test/__mocks__/env.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx', '!src/**/*.test.{ts,tsx}', '!src/test/**'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      statements: 25,
      lines: 25,
      functions: 20,
      branches: 12,
    },
  },
  testTimeout: 30000,
};
