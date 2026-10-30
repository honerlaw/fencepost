import { defineConfig, devices } from '@playwright/test';

// Runs against the web export served by server.js (build it first: `npm run e2e` does).
const PORT = 8092;
const FULL_STACK_PORT = 8093;
const STUB_PORT = 8791;

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
    // Full-stack scenario: a fake OpenRouter and a second server that talks to it.
    {
      command: 'node scripts/stub-openrouter.mjs',
      env: { STUB_PORT: String(STUB_PORT), STUB_FIRST_DELAY_MS: '300', STUB_CHUNK_DELAY_MS: '5' },
      port: STUB_PORT,
      reuseExistingServer: false,
    },
    {
      command: 'node server.js',
      env: {
        PORT: String(FULL_STACK_PORT),
        NODE_ENV: 'production',
        OPENROUTER_BASE_URL: `http://127.0.0.1:${STUB_PORT}/api/v1`,
        OPENROUTER_API_KEY: 'e2e-stub-key',
        CARD_MODEL: 'stub/model',
      },
      url: `http://localhost:${FULL_STACK_PORT}/api/health`,
      reuseExistingServer: false,
    },
  ],
});
