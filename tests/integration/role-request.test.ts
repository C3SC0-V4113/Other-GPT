import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/account/role-request/route';

import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

const { getCurrentUserMock, mockSendEmail } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn<() => Promise<ProjectAuthResponse | null>>(),
  mockSendEmail:
    vi.fn<
      (payload: {
        from: string;
        to: string;
        subject: string;
        text: string;
      }) => Promise<{ id: string }>
    >(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('@/lib/email', () => ({
  getEmailClient: vi.fn(() => ({
    emails: { send: mockSendEmail },
  })),
}));
vi.mock('server-only', () => ({}));

function userWithRoles(codes: string[]): ProjectAuthResponse {
  return {
    user: {
      id: 'u1',
      email: 'a@b.com',
      displayName: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    project: { id: 'p1', slug: 'other-gpt', name: 'Other GPT' },
    membership: {
      id: 'm1',
      status: 'ACTIVE',
      roles: codes.map((c) => ({ id: c, code: c, name: c })),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/account/role-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.ROLE_REQUEST_FROM_EMAIL;
  delete process.env.ROLE_REQUEST_TO_EMAIL;

  process.env.RESEND_API_KEY = 're_abc123';
  process.env.ROLE_REQUEST_FROM_EMAIL = 'noreply@example.com';
  process.env.ROLE_REQUEST_TO_EMAIL = 'admin@example.com';
});

describe('POST /api/account/role-request', () => {
  it('returns 401 when there is no session', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(401);
  });

  it('returns 409 for an elevated user', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['pro']));
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('ALREADY_ELEVATED');
  });

  it('returns 409 for an admin user', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['admin']));
    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(409);
  });

  it('sends an email for a basic user and returns 200', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));
    mockSendEmail.mockResolvedValueOnce({ id: 'email_1' });

    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const callArg = mockSendEmail.mock.calls[0][0];
    expect(callArg.to).toBe('admin@example.com');
    expect(callArg.from).toBe('noreply@example.com');
    expect(callArg.subject).toContain('a@b.com');
    expect(callArg.text).toContain('User email: a@b.com');
    expect(callArg.text).toContain('User ID: u1');
    expect(callArg.text).toContain('Current roles: user (user)');
  });

  it('includes the justification in the email body', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));
    mockSendEmail.mockResolvedValueOnce({ id: 'email_2' });

    const response = await POST(jsonRequest({ message: 'I need image generation.' }));
    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0][0].text).toContain('I need image generation.');
  });

  it('returns 503 when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('SERVICE_MISCONFIGURED');
  });

  it('returns 503 when ROLE_REQUEST_FROM_EMAIL is missing', async () => {
    delete process.env.ROLE_REQUEST_FROM_EMAIL;
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('SERVICE_MISCONFIGURED');
  });

  it('returns 503 when ROLE_REQUEST_TO_EMAIL is missing', async () => {
    delete process.env.ROLE_REQUEST_TO_EMAIL;
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('SERVICE_MISCONFIGURED');
  });

  it('returns 502 when Resend fails', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));
    mockSendEmail.mockRejectedValueOnce(new Error('Resend API error'));

    const response = await POST(jsonRequest({}));
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe('EMAIL_SEND_FAILED');
  });

  it('returns 400 for invalid message type', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const response = await POST(jsonRequest({ message: 42 }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for overly long message', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const response = await POST(jsonRequest({ message: 'x'.repeat(2001) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for invalid JSON body', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));

    const request = new Request('http://localhost/api/account/role-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
