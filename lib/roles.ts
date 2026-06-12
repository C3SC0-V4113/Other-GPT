import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

// Roles that unlock capabilities beyond the basic `user` (other-gpt seeds:
// `user`, `pro`, `admin`).
const ELEVATED_ROLE_CODES = new Set(['pro', 'admin']);

/** Role codes of the user's membership for this project (empty if none). */
export function getRoleCodes(user: ProjectAuthResponse): string[] {
  return user.membership?.roles.map((role) => role.code) ?? [];
}

/** True when the user has no elevated role (only the basic `user`, or none). */
export function isBasicUser(user: ProjectAuthResponse): boolean {
  return !getRoleCodes(user).some((code) => ELEVATED_ROLE_CODES.has(code));
}

/** Image generation is reserved for elevated roles (`pro` / `admin`). */
export function canGenerateImages(user: ProjectAuthResponse): boolean {
  return getRoleCodes(user).some((code) => ELEVATED_ROLE_CODES.has(code));
}
