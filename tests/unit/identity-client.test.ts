import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isSessionValid } from '@/lib/identity-client';

const { mockClient } = vi.hoisted(() => ({
  mockClient: { hasValidSession: vi.fn() },
}));

vi.mock('@cesco_valle/identity-auth-sdk/user', () => ({
  createUserAuthClient: () => mockClient,
}));

beforeEach(() => {
  process.env.IDENTITY_URL = 'http://identity.test';
});

describe('isSessionValid', () => {
  it('returns true when identity-service confirms the session', async () => {
    mockClient.hasValidSession.mockResolvedValueOnce(true);
    await expect(isSessionValid('identity_service_session=abc')).resolves.toBe(true);
  });

  it('returns false when the session is invalid/revoked (401)', async () => {
    mockClient.hasValidSession.mockResolvedValueOnce(false);
    await expect(isSessionValid('identity_service_session=stale')).resolves.toBe(false);
  });

  it('fails closed when identity-service is unreachable', async () => {
    mockClient.hasValidSession.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(isSessionValid('identity_service_session=abc')).resolves.toBe(false);
  });
});
