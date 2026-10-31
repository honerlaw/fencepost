import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/game/**', 'src/cards/**', 'src/server/**', 'src/store/**', 'src/lib/**'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/*.web.ts', '**/*.native.ts', '**/types.ts'],
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'reports/coverage',
      // Measured floors. Raise them as coverage improves; never lower them.
      thresholds: { statements: 90, branches: 84, functions: 87, lines: 93 },
    },
  },
});
