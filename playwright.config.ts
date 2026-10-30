import { defineConfig, devices } from '@playwright/test';

// Runs against the web export served by server.js (build it first: `npm run e2e` does).
const PORT = 8092;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: [
    {
      command: 'node server.js',
      env: { PORT: String(PORT), NODE_ENV: 'production' },
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: false,
    },
  ],
});
