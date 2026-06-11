import { startMockIdentityServer } from './mock-identity-server';

export const MOCK_IDENTITY_PORT = 4555;

/**
 * Starts the mock identity-service before the e2e run and returns a teardown that
 * stops it. The Next dev server (Playwright `webServer`) points `IDENTITY_URL` at
 * this mock so the BFF auth flow is exercised without a real backend.
 */
export default function globalSetup(): () => Promise<void> {
  const server = startMockIdentityServer(MOCK_IDENTITY_PORT);

  return () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
}
