import { defineConfig, devices } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:3000';
const isCi = Boolean(process.env.CI);

const mockIdentityUrl = 'http://127.0.0.1:4555';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Starts the mock identity-service for the run; the dev server below targets it.
  globalSetup: './tests/e2e/support/global-setup.ts',
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url: baseUrl,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env var name
    env: { IDENTITY_URL: mockIdentityUrl },
  },
});
