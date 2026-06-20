// `vi.mock` is hoisted above these imports by vitest, so the route under test
// receives the stubbed `getCurrentUser`.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/realtime/session/route';

import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

const { getCurrentUserMock } = vi.hoisted(() => ({ getCurrentUserMock: vi.fn() }));

vi.mock('@/lib/auth', () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock('@/i18n/locale', () => ({ getUserLocale: vi.fn(async () => 'en') }));

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

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OPENAI_API_KEY;
});

describe('POST /api/realtime/session role guard', () => {
  it('returns 401 when there is no session', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('returns 403 for a basic user', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['user']));
    const response = await POST();
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('REALTIME_VOICE_FORBIDDEN');
  });

  it('lets an elevated user past the guard (then fails only on the missing API key)', async () => {
    getCurrentUserMock.mockResolvedValueOnce(userWithRoles(['pro']));
    const response = await POST();
    // Past the 401/403 guard → reaches the OPENAI_API_KEY check (500).
    expect(response.status).toBe(500);
  });
});
