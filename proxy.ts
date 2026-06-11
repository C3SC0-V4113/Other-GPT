import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/auth-shared';

import type { NextRequest } from 'next/server';

/**
 * Optimistic auth gate (Next.js 16 Proxy, formerly Middleware). It only checks
 * for the presence of the session cookie — no network call — and redirects to
 * `/login` when it is absent. The authoritative validation happens in the Server
 * Components (`getCurrentUser`) and the data Route Handlers (`requireSession`),
 * per Next's data-security guidance: optimistic here, authoritative in the data
 * layer.
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except the login page, API routes (which guard themselves),
  // Next internals, and metadata files.
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
