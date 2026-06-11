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

const MOCK_ACCESS = {
  project: MOCK_USER.project,
  access: {
    isMember: true,
    membershipId: MOCK_USER.membership.id,
    status: 'ACTIVE',
    roles: MOCK_USER.membership.roles,
    isAdmin: false,
  },
};

function hasSession(req: IncomingMessage): boolean {
  return (req.headers.cookie ?? '').includes(`${SESSION_COOKIE}=`);
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

const sessionCookie = `${SESSION_COOKIE}=${VALID_TOKEN}; Path=/; HttpOnly; SameSite=Lax`;
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
    const email = String(body.email ?? '');
    const isExisting = email.startsWith('existing');
    sendJson(res, 200, { email, exists: isExisting, nextStep: isExisting ? 'LOGIN' : 'REGISTER' });
    return;
  }

  if (method === 'POST' && pathname === `${base}/login`) {
    const body = await readJson(req);
    if (body.password === 'wrongpass') {
      sendJson(res, 401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }
    sendJson(res, 200, MOCK_USER, sessionCookie);
    return;
  }

  if (method === 'POST' && pathname === `${base}/register`) {
    sendJson(res, 201, MOCK_USER, sessionCookie);
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
    if (hasSession(req)) {
      sendJson(res, 200, MOCK_USER);
    } else {
      sendJson(res, 401, {
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
      });
    }
    return;
  }

  if (method === 'GET' && pathname === '/projects/other-gpt/me') {
    if (hasSession(req)) {
      sendJson(res, 200, MOCK_ACCESS);
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
