import { describe, expect, it } from 'vitest';

import { canGenerateImages, getRoleCodes, isBasicUser } from '@/lib/roles';

import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

function userWithRoles(codes: string[] | null): ProjectAuthResponse {
  return {
    user: {
      id: 'u1',
      email: 'a@b.com',
      displayName: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    project: { id: 'p1', slug: 'other-gpt', name: 'Other GPT' },
    membership:
      codes === null
        ? null
        : {
            id: 'm1',
            status: 'ACTIVE',
            roles: codes.map((code) => ({ id: code, code, name: code })),
          },
  };
}

describe('getRoleCodes', () => {
  it('returns the membership role codes, or empty when there is no membership', () => {
    expect(getRoleCodes(userWithRoles(['user', 'pro']))).toEqual(['user', 'pro']);
    expect(getRoleCodes(userWithRoles(null))).toEqual([]);
  });
});

describe('isBasicUser', () => {
  it('is true for only the basic role, an empty set, or no membership', () => {
    expect(isBasicUser(userWithRoles(['user']))).toBe(true);
    expect(isBasicUser(userWithRoles([]))).toBe(true);
    expect(isBasicUser(userWithRoles(null))).toBe(true);
  });

  it('is false when an elevated role is present', () => {
    expect(isBasicUser(userWithRoles(['pro']))).toBe(false);
    expect(isBasicUser(userWithRoles(['admin']))).toBe(false);
    expect(isBasicUser(userWithRoles(['user', 'pro']))).toBe(false);
  });
});

describe('canGenerateImages', () => {
  it('requires an elevated role (pro/admin)', () => {
    expect(canGenerateImages(userWithRoles(['user']))).toBe(false);
    expect(canGenerateImages(userWithRoles(null))).toBe(false);
    expect(canGenerateImages(userWithRoles(['pro']))).toBe(true);
    expect(canGenerateImages(userWithRoles(['admin']))).toBe(true);
    expect(canGenerateImages(userWithRoles(['user', 'admin']))).toBe(true);
  });
});
