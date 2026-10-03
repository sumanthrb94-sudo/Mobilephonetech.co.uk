import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Admin flows mount real preview cards and can exceed Vitest's 5s default
    // while the full jsdom suite is running concurrently. Keep a bounded
    // timeout rather than turning a valid interaction test into a flake.
    testTimeout: 15_000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // .kilo can contain a full, nested checkout of this repository. It is
    // tooling state, not source, and must never make Vitest run every test
    // twice (or execute a stale branch's tests).
    exclude: ['.kilo/**', '**/node_modules/**'],
    alias: {
      // Prevent real Supabase client from hitting network in tests
      // Individual test files can override with vi.mock() for finer control
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/utils/**/*.ts',
        'src/context/**/*.tsx',
        'src/hooks/**/*.ts',
        'api/**/*.ts',
      ],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        '.kilo/**',
        '**/node_modules/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
