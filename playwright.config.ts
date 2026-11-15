import {defineConfig, devices} from '@playwright/test';

const PORT = 4180;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/yugioh-tools/`,
    trace: 'off',
    launchOptions: process.env.PW_CHROMIUM_PATH ? {executablePath: process.env.PW_CHROMIUM_PATH} : {},
  },
  // メインの使い方（スマホ横置き）と縦置きの両方で確かめる
  projects: [
    {name: 'Android 横置き', use: {...devices['Pixel 7 landscape']}},
    {name: '小さいスマホ 横置き', use: {...devices['Pixel 7 landscape'], viewport: {width: 667, height: 375}}},
    {name: 'Android 縦置き', use: {...devices['Pixel 7']}},
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/yugioh-tools/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
