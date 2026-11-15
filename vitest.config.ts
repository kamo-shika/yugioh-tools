import {defineConfig} from 'vitest/config';

// ユニットテストは src/ の *.test.ts(x)。e2e/ は Playwright で別に動かす
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
