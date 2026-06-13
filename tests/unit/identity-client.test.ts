import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWithIdentityTimeout, isSessionValid } from '@/lib/identity-client';

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

describe('fetchWithIdentityTimeout', () => {
  it('passes an AbortSignal to identity-service requests', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(null, { status: 204 });
    });
    globalThis.fetch = fetchMock;

    try {
      await expect(
        fetchWithIdentityTimeout('http://identity.test/session')
      ).resolves.toBeInstanceOf(Response);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
