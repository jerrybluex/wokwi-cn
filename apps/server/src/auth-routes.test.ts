/**
 * auth-routes.test.ts — end-to-end happy path + edge cases.
 *
 * Tests run against the dev sqlite file (the one Prisma migrated). Each
 * test uses a unique email address and the afterEach hook cleans up any
 * rows it created, so the suite is safe to re-run in dev.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { buildServer } from './server.js';
import { prisma } from './db.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const createdUserIds: string[] = [];
const TEST_PASSWORD = 'correct-horse-battery-staple';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function cleanup(): Promise<void> {
  if (createdUserIds.length === 0) return;
  const ids = createdUserIds.splice(0);
  // Delete in order: tokens (cascade), projects (cascade), users
  await prisma.emailToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.project.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await cleanup();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201 with a verification message', async () => {
    const email = uniqueEmail('reg');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD, name: 'Test' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(email);
    expect(body.user.emailVerified).toBe(false);
    expect(body.message).toMatch(/验证链接/);
    // Persist the user so afterEach can clean it up.
    const u = await prisma.user.findUnique({ where: { email } });
    expect(u).toBeTruthy();
    createdUserIds.push(u!.id);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('dup');
    const first = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    createdUserIds.push((await prisma.user.findUnique({ where: { email } }))!.id);
    const second = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
  });

  it('rejects an invalid email with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a short password with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: uniqueEmail('short'), password: 'abc' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('sets a session cookie and returns the user on success', async () => {
    const email = uniqueEmail('login');
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    createdUserIds.push((await prisma.user.findUnique({ where: { email } }))!.id);
    expect(reg.statusCode).toBe(201);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
    const cookie = res.headers['set-cookie'];
    expect(cookie).toBeTruthy();
    const cookieStr = Array.isArray(cookie) ? cookie.join(';') : String(cookie);
    expect(cookieStr).toMatch(/wokwi_session=/);
  });

  it('returns 401 on wrong password', async () => {
    const email = uniqueEmail('wrongpw');
    // register first (response not needed — we're testing wrong password)
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    createdUserIds.push((await prisma.user.findUnique({ where: { email } }))!.id);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'definitely-wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 on unknown email (no enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: uniqueEmail('ghost'), password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/verify', () => {
  it('flips emailVerified to true with a valid token', async () => {
    const email = uniqueEmail('verify');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    createdUserIds.push(user!.id);
    const tokenRow = await prisma.emailToken.findFirst({
      where: { userId: user!.id, purpose: 'verify' },
    });
    expect(tokenRow).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: `/api/auth/verify?token=${tokenRow!.token}`,
    });
    expect(res.statusCode).toBe(200);
    const reloaded = await prisma.user.findUnique({ where: { id: user!.id } });
    expect(reloaded!.emailVerified).toBe(true);
  });

  it('refuses a token that has already been used', async () => {
    const email = uniqueEmail('verify-twice');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    createdUserIds.push(user!.id);
    const tokenRow = await prisma.emailToken.findFirst({
      where: { userId: user!.id, purpose: 'verify' },
    });
    const first = await app.inject({ method: 'GET', url: `/api/auth/verify?token=${tokenRow!.token}` });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({ method: 'GET', url: `/api/auth/verify?token=${tokenRow!.token}` });
    expect(second.statusCode).toBe(400);
  });
});

describe('GET /api/me', () => {
  it('returns the current user when authenticated', async () => {
    const email = uniqueEmail('me');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    createdUserIds.push(user!.id);
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    });
    const cookie = login.headers['set-cookie'];
    const cookieStr = Array.isArray(cookie) ? cookie.join('; ') : String(cookie);
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieStr.split(';')[0] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('forgot / reset password', () => {
  it('lets a user reset a forgotten password end-to-end', async () => {
    const email = uniqueEmail('forgot');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    createdUserIds.push(user!.id);

    const forgot = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot',
      payload: { email },
    });
    expect(forgot.statusCode).toBe(200);

    const tokenRow = await prisma.emailToken.findFirst({
      where: { userId: user!.id, purpose: 'reset' },
    });
    expect(tokenRow).toBeTruthy();

    const newPassword = 'rotated-' + Math.random().toString(36).slice(2, 10);
    const reset = await app.inject({
      method: 'POST',
      url: '/api/auth/reset',
      payload: { token: tokenRow!.token, password: newPassword },
    });
    expect(reset.statusCode).toBe(200);

    // Old password should now fail
    const oldLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    });
    expect(oldLogin.statusCode).toBe(401);

    // New password should work
    const newLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: newPassword },
    });
    expect(newLogin.statusCode).toBe(200);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const email = uniqueEmail('logout');
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: TEST_PASSWORD },
    });
    const user = await prisma.user.findUnique({ where: { email } });
    createdUserIds.push(user!.id);
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: TEST_PASSWORD },
    });
    const setCookie = login.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
    const sessionCookie = cookieStr.split(';')[0];

    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: sessionCookie },
    });
    expect(logout.statusCode).toBe(200);
    const clear = logout.headers['set-cookie'];
    const clearStr = Array.isArray(clear) ? clear.join('; ') : String(clear);
    expect(clearStr).toMatch(/wokwi_session=;/);
  });
});
