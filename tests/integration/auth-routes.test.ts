import { ApiError } from '@cesco_valle/identity-auth-sdk/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ toString: (): string => 'identity_service_session=abc' })),
}));

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    checkEmail: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

// Keep the real toErrorResponse / applySetCookies / PROJECT_SLUG; stub the client.
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof AuthModule>();
  return { ...actual, getAuthClient: () => mockClient };
});

import { POST as emailCheckPOST } from '@/app/api/auth/email-check/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { POST as registerPOST } from '@/app/api/auth/register/route';

import type * as AuthModule from '@/lib/auth';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/email-check', () => {
  it('returns the nextStep from identity-service', async () => {
    mockClient.checkEmail.mockResolvedValueOnce({
      email: 'a@b.com',
      exists: false,
      nextStep: 'REGISTER',
    });
    const response = await emailCheckPOST(jsonRequest({ email: 'a@b.com' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ nextStep: 'REGISTER' });
  });

  it('rejects a body without an email', async () => {
    const response = await emailCheckPOST(jsonRequest({}));
    expect(response.status).toBe(400);
    expect(mockClient.checkEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('relays the Set-Cookie on success', async () => {
    mockClient.login.mockResolvedValueOnce({
      data: { user: { email: 'a@b.com' } },
      setCookie: ['identity_service_session=tok; Path=/; HttpOnly'],
    });
    const response = await loginPOST(jsonRequest({ email: 'a@b.com', password: 'secret' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('identity_service_session=tok');
  });

  it('maps INVALID_CREDENTIALS to a 401 with its code', async () => {
    mockClient.login.mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'bad', null));
    const response = await loginPOST(jsonRequest({ email: 'a@b.com', password: 'nope' }));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('INVALID_CREDENTIALS');
  });

  it('maps an unreachable identity-service to a 502', async () => {
    mockClient.login.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const response = await loginPOST(jsonRequest({ email: 'a@b.com', password: 'secret' }));
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe('IDENTITY_UNREACHABLE');
  });
});

describe('POST /api/auth/register', () => {
  it('returns 201 and relays the Set-Cookie on success', async () => {
    mockClient.register.mockResolvedValueOnce({
      data: { user: { email: 'a@b.com' } },
      setCookie: ['identity_service_session=tok; Path=/; HttpOnly'],
    });
    const response = await registerPOST(jsonRequest({ email: 'a@b.com', password: 'longenough' }));
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('identity_service_session=tok');
  });

  it('maps EMAIL_ALREADY_EXISTS to a 409', async () => {
    mockClient.register.mockRejectedValueOnce(
      new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'dup', null)
    );
    const response = await registerPOST(jsonRequest({ email: 'a@b.com', password: 'longenough' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 and relays the cookie-clearing Set-Cookie', async () => {
    mockClient.logout.mockResolvedValueOnce({
      data: undefined,
      setCookie: ['identity_service_session=; Path=/; Max-Age=0'],
    });
    const response = await logoutPOST();
    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
