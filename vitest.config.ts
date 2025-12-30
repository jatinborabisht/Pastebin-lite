import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL: process.env.DATABASE_URL || `file:${path.resolve(__dirname, 'test.db')}`,
    },
    // Run test files sequentially to avoid SQLite file locking issues
    fileParallelism: false,
    setupFiles: ['./src/test-setup.ts'],
    // Exclude Playwright E2E tests from vitest
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
