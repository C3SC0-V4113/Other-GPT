import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/auth-shared';
import { isSessionValid } from '@/lib/identity-client';

import type { NextRequest } from 'next/server';

/**
 * Authoritative auth gate (Next.js 16 Proxy, formerly Middleware, runs on the
 * Node runtime). On every matched navigation it validates the session against
 * identity-service, so an admin-revoked (or expired) session is bounced to
 * `/login` on the next navigation rather than lingering until a page/data check.
 *
 * A missing cookie short-circuits to `/login` without a network call; a present
 * cookie is verified (`GET /auth/session`). The Server Component
 * (`getCurrentUser`) and data routes (`requireSession`) remain authoritative too.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const hasCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const cookieHeader = request.headers.get('cookie') ?? '';

  if (hasCookie && (await isSessionValid(cookieHeader))) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except the login pages, API routes (which guard themselves),
  // Next internals, and metadata files.
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
