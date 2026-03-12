import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/metering/**/*.ts'],
      exclude: ['lib/metering/**/*.test.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});


