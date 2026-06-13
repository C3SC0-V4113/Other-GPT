import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

const SESSION_COOKIE = 'identity_service_session';
const VALID_TOKEN = 'e2e-session';

const MOCK_USER = {
  user: {
    id: 'e2e-user',
    email: 'e2e@example.com',
    displayName: 'E2E User',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  project: { id: 'e2e-project', slug: 'other-gpt', name: 'Other GPT' },
  membership: {
    id: 'e2e-membership',
    status: 'ACTIVE',
    roles: [{ id: 'role-user', code: 'user', name: 'User' }],
  },
};

type MockIdentityUser = typeof MOCK_USER;

const registeredUsers = new Map<string, { password: string; identity: MockIdentityUser }>();
const sessions = new Map<string, MockIdentityUser>([[VALID_TOKEN, MOCK_USER]]);

function createMockIdentity(email: string, displayName?: unknown): MockIdentityUser {
  const normalizedEmail = email.toLowerCase();
  const safeId = Buffer.from(normalizedEmail).toString('base64url');
  const resolvedDisplayName =
    typeof displayName === 'string' && displayName.trim().length > 0
      ? displayName.trim()
      : normalizedEmail.split('@')[0];

  return {
    ...MOCK_USER,
    user: {
      ...MOCK_USER.user,
      id: `e2e-user-${safeId}`,
      email: normalizedEmail,
      displayName: resolvedDisplayName,
    },
    membership: {
      ...MOCK_USER.membership,
      id: `e2e-membership-${safeId}`,
    },
  };
}

function createMockAccess(identity: MockIdentityUser) {
  return {
    project: identity.project,
    access: {
      isMember: true,
      membershipId: identity.membership.id,
      status: 'ACTIVE',
      roles: identity.membership.roles,
      isAdmin: false,
    },
  };
}

function getCookieValue(req: IncomingMessage, cookieName: string): string | null {
  const cookies = (req.headers.cookie ?? '').split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return null;
}

function getSessionIdentity(req: IncomingMessage): MockIdentityUser | null {
  const token = getCookieValue(req, SESSION_COOKIE);
  if (!token) {
    return null;
  }
  return sessions.get(token) ?? null;
}

function createSessionCookie(identity: MockIdentityUser): string {
  const token = `e2e-session-${Buffer.from(identity.user.email).toString('base64url')}`;
  sessions.set(token, identity);
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
}

function isExistingEmail(email: string): boolean {
  return email.startsWith('existing') || registeredUsers.has(email.toLowerCase());
}

function getExistingIdentity(email: string): MockIdentityUser {
  const normalizedEmail = email.toLowerCase();
  return registeredUsers.get(normalizedEmail)?.identity ?? createMockIdentity(normalizedEmail);
}

function hasSession(req: IncomingMessage): boolean {
  return getSessionIdentity(req) !== null;
}

function sendJson(res: ServerResponse, status: number, body: unknown, setCookie?: string): void {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (setCookie) {
    res.setHeader('set-cookie', setCookie);
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const clearedCookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
const base = '/projects/other-gpt/auth';

/**
 * A deterministic stand-in for identity-service used by the e2e suite. It mirrors
 * the handful of `/projects/other-gpt/auth/*` endpoints the user SDK calls, keyed
 * only on the presence of the session cookie.
 */
export function startMockIdentityServer(port: number): Server {
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.listen(port);
  return server;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';

  if (method === 'POST' && pathname === `${base}/register/email-check`) {
    const body = await readJson(req);
    const email = String(body.email ?? '').toLowerCase();
    const isExisting = isExistingEmail(email);
    sendJson(res, 200, { email, exists: isExisting, nextStep: isExisting ? 'LOGIN' : 'REGISTER' });
    return;
  }

  if (method === 'POST' && pathname === `${base}/login`) {
    const body = await readJson(req);
    const email = String(body.email ?? '').toLowerCase();
    const password = String(body.password ?? '');
    const registeredUser = registeredUsers.get(email);
    const hasInvalidPassword =
      password === 'wrongpass' ||
      (registeredUser !== undefined && registeredUser.password !== password);

    if (!isExistingEmail(email) || hasInvalidPassword) {
      sendJson(res, 401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }

    const identity = registeredUser?.identity ?? getExistingIdentity(email);
    sendJson(res, 200, identity, createSessionCookie(identity));
    return;
  }

  if (method === 'POST' && pathname === `${base}/register`) {
    const body = await readJson(req);
    const email = String(body.email ?? '').toLowerCase();
    const password = String(body.password ?? '');
    const identity = createMockIdentity(email, body.displayName);

    registeredUsers.set(email, { password, identity });
    sendJson(res, 201, identity, createSessionCookie(identity));
    return;
  }

  if (method === 'POST' && pathname === `${base}/logout`) {
    res.setHeader('set-cookie', clearedCookie);
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === 'GET' && pathname === `${base}/session`) {
    res.writeHead(hasSession(req) ? 204 : 401);
    res.end();
    return;
  }

  if (method === 'GET' && pathname === `${base}/me`) {
    const identity = getSessionIdentity(req);
    if (identity) {
      sendJson(res, 200, identity);
    } else {
      sendJson(res, 401, {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
      });
    }
    return;
  }

  if (method === 'GET' && pathname === '/projects/other-gpt/me') {
    const identity = getSessionIdentity(req);
    if (identity) {
      sendJson(res, 200, createMockAccess(identity));
    } else {
      sendJson(res, 401, {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
      });
    }
    return;
  }

  sendJson(res, 404, {
    error: { code: 'NOT_FOUND', message: `No mock for ${method} ${pathname}` },
  });
}
