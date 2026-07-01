/**
 * projects-routes.test.ts — CRUD + share + public read.
 *
 * Test setup reuses the dev sqlite file; each test creates a fresh user
 * and cleans up the project + user records in afterEach.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { buildServer } from './server.js';
import { prisma } from './db.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const TEST_PASSWORD = 'correct-horse-battery-staple';
const createdUserIds: string[] = [];

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

async function cleanup(): Promise<void> {
  if (createdUserIds.length === 0) return;
  const ids = createdUserIds.splice(0);
  // Delete in cascade order: tokens, projects, users
  await prisma.emailToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.project.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function registerAndLogin(label: string): Promise<{
  email: string;
  cookie: string;
  userId: string;
}> {
  const email = uniqueEmail(label);
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
  return { email, cookie: cookieStr.split(';')[0], userId: user!.id };
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  await cleanup();
});

describe('POST /api/projects', () => {
  it('creates a project and returns it with default name', async () => {
    const { cookie, userId } = await registerAndLogin('create');
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'My Blink', code: 'void setup() {}', wiring: '{}' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.project.name).toBe('My Blink');
    expect(body.project.userId).toBe(userId);
    expect(body.project.shareId).toBeNull();
  });

  it('rejects when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an empty name with 400', async () => {
    const { cookie } = await registerAndLogin('empty-name');
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/projects', () => {
  it('lists the caller\'s projects, newest first', async () => {
    const { cookie } = await registerAndLogin('list');
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'A' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'B' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const list = res.json().projects;
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('B'); // newest first
  });
});

describe('GET /api/projects/:id', () => {
  it('returns the project when owned', async () => {
    const { cookie } = await registerAndLogin('get');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'P' },
    });
    const id = create.json().project.id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/projects/${id}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().project.name).toBe('P');
  });

  it('returns 403 when accessed by another user', async () => {
    const owner = await registerAndLogin('owner');
    const other = await registerAndLogin('other');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: owner.cookie },
      payload: { name: 'Mine' },
    });
    const id = create.json().project.id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/projects/${id}`,
      headers: { cookie: other.cookie },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PUT /api/projects/:id', () => {
  it('updates the code and leaves other fields alone (autosave path)', async () => {
    const { cookie } = await registerAndLogin('autosave');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'Auto', code: 'old', wiring: '{"parts":[]}' },
    });
    const id = create.json().project.id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/projects/${id}`,
      headers: { cookie },
      payload: { code: 'new' },
    });
    expect(res.statusCode).toBe(200);
    const reloaded = await app.inject({
      method: 'GET',
      url: `/api/projects/${id}`,
      headers: { cookie },
    });
    const project = reloaded.json().project;
    expect(project.code).toBe('new');
    expect(project.wiring).toBe('{"parts":[]}'); // not touched
    expect(project.name).toBe('Auto'); // not touched
  });

  it('accepts a full update (all three fields)', async () => {
    const { cookie } = await registerAndLogin('autosave-full');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'A', code: '', wiring: '' },
    });
    const id = create.json().project.id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/projects/${id}`,
      headers: { cookie },
      payload: { name: 'B', code: 'void loop() {}', wiring: '{"x":1}' },
    });
    expect(res.statusCode).toBe(200);
    const project = res.json().project;
    expect(project.name).toBe('B');
    expect(project.code).toBe('void loop() {}');
    expect(project.wiring).toBe('{"x":1}');
  });
});

describe('DELETE /api/projects/:id', () => {
  it('removes the project', async () => {
    const { cookie } = await registerAndLogin('del');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'tmp' },
    });
    const id = create.json().project.id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(200);
    const reloaded = await app.inject({
      method: 'GET',
      url: `/api/projects/${id}`,
      headers: { cookie },
    });
    expect(reloaded.statusCode).toBe(404);
  });
});

describe('POST /api/projects/:id/share', () => {
  it('mints a shareId and exposes it', async () => {
    const { cookie } = await registerAndLogin('share-on');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'shared' },
    });
    const id = create.json().project.id;
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const shareId = res.json().project.shareId;
    expect(shareId).toMatch(/^[a-zA-Z0-9_-]{10,13}$/);
  });

  it('keeps the same shareId when re-shared', async () => {
    const { cookie } = await registerAndLogin('share-once');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 's' },
    });
    const id = create.json().project.id;
    const a = await app.inject({
      method: 'POST',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    const b = await app.inject({
      method: 'POST',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    expect(a.json().project.shareId).toBe(b.json().project.shareId);
  });
});

describe('DELETE /api/projects/:id/share', () => {
  it('clears the shareId', async () => {
    const { cookie } = await registerAndLogin('share-off');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'x' },
    });
    const id = create.json().project.id;
    await app.inject({
      method: 'POST',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    const off = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    expect(off.json().project.shareId).toBeNull();
  });
});

describe('GET /p/:shareId (public)', () => {
  it('returns the project without authentication', async () => {
    const { cookie } = await registerAndLogin('public');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'demo', code: '// hello', wiring: '{}' },
    });
    const id = create.json().project.id;
    const share = await app.inject({
      method: 'POST',
      url: `/api/projects/${id}/share`,
      headers: { cookie },
    });
    const shareId = share.json().project.shareId;
    const res = await app.inject({ method: 'GET', url: `/p/${shareId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().project.code).toBe('// hello');
  });

  it('returns 404 for unknown shareId', async () => {
    const res = await app.inject({ method: 'GET', url: '/p/does-not-exist' });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for an unshared project (no shareId)', async () => {
    const { cookie } = await registerAndLogin('unshared');
    const create = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie },
      payload: { name: 'private' },
    });
    const id = create.json().project.id;
    // Don't share it — try to read it via a guessed shareId
    const res = await app.inject({ method: 'GET', url: `/p/${id}` });
    expect(res.statusCode).toBe(404);
  });
});
