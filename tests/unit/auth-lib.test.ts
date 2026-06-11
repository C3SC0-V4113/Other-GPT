import { ApiError } from '@cesco_valle/identity-auth-sdk/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` is hoisted above these imports by vitest, so the module-under-test
// (`@/lib/auth`) still receives the stubbed client below.
import { getCurrentUser, requireSession, toErrorResponse } from '@/lib/auth';

import type * as Sdk from '@cesco_valle/identity-auth-sdk/user';

// `lib/auth` imports `server-only` and `next/headers`; stub both for node tests.
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ toString: (): string => 'identity_service_session=abc' })),
}));

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    getMe: vi.fn(),
    hasValidSession: vi.fn(),
  },
}));

// Keep the real `ApiError`; only stub the client factory.
vi.mock('@cesco_valle/identity-auth-sdk/user', async (importActual) => {
  const actual = await importActual<typeof Sdk>();
  return { ...actual, createUserAuthClient: () => mockClient };
});

beforeEach(() => {
  process.env.IDENTITY_URL = 'http://identity.test';
});

const USER = {
  user: { id: 'u1', email: 'a@b.com', displayName: null, status: 'ACTIVE', createdAt: '' },
  project: { id: 'p1', slug: 'other-gpt', name: 'Other GPT' },
  membership: null,
};

describe('getCurrentUser', () => {
  it('returns the user when the session is valid', async () => {
    mockClient.getMe.mockResolvedValueOnce(USER);
    await expect(getCurrentUser()).resolves.toEqual(USER);
  });

  it('returns null on a 401 ApiError', async () => {
    mockClient.getMe.mockRejectedValueOnce(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'x', null));
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('rethrows non-401 errors', async () => {
    mockClient.getMe.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'boom', null));
    await expect(getCurrentUser()).rejects.toThrow('boom');
  });
});

describe('requireSession', () => {
  it('returns null (proceed) when the session is valid', async () => {
    mockClient.hasValidSession.mockResolvedValueOnce(true);
    await expect(requireSession()).resolves.toBeNull();
  });

  it('returns 401 when there is no valid session', async () => {
    mockClient.hasValidSession.mockResolvedValueOnce(false);
    const response = await requireSession();
    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' },
    });
  });

  it('fails closed (401) when identity-service is unreachable', async () => {
    mockClient.hasValidSession.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const response = await requireSession();
    expect(response?.status).toBe(401);
  });
});

describe('toErrorResponse', () => {
  it('maps an ApiError to its status and code', async () => {
    const response = toErrorResponse(new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'dup', null));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'dup' },
    });
  });

  it('maps an unknown error to a 502 IDENTITY_UNREACHABLE', async () => {
    const response = toErrorResponse(new Error('socket hang up'));
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe('IDENTITY_UNREACHABLE');
  });
});
