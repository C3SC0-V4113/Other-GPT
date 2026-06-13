import { defineConfig, devices } from '@playwright/test';

const appPort = process.env.E2E_PORT ?? '3000';
const baseUrl = `http://127.0.0.1:${appPort}`;
const isCi = Boolean(process.env.CI);

const mockIdentityPort = process.env.E2E_IDENTITY_PORT ?? '4555';
const mockIdentityUrl = `http://127.0.0.1:${mockIdentityPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  // Cap local parallelism: a single dev server (cold Turbopack compiles) saturates
  // under the default worker count, causing page-setup/navigation timeouts.
  workers: isCi ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Starts the mock identity-service for the run; the dev server below targets it.
  globalSetup: './tests/e2e/support/global-setup.ts',
  // The proxy now verifies the session over the network on every navigation
  // (plus the page's own check), so post-login navigations need more headroom
  // than the 5s default — especially under parallel cold Turbopack compiles.
  expect: { timeout: 15_000 },
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
    command: `npm run dev -- --hostname 127.0.0.1 --port ${appPort}`,
    url: baseUrl,
    reuseExistingServer: !isCi,
    timeout: 120_000,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- env var name
    env: { IDENTITY_URL: mockIdentityUrl },
  },
});
