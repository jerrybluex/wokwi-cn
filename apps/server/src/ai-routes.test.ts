import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import { prisma } from './db.js';

let app: FastifyInstance;
const createdUserIds: string[] = [];

async function registerAndLogin(label: string): Promise<string> {
  const email = `chatctx-${label}-${Date.now()}@test.local`;
  await app.inject({
    method: 'POST', url: '/api/auth/register',
    payload: { email, password: 'test-pass-123' },
  });
  const user = await prisma.user.findUnique({ where: { email } });
  createdUserIds.push(user!.id);
  const login = await app.inject({
    method: 'POST', url: '/api/auth/login',
    payload: { email, password: 'test-pass-123' },
  });
  const setCookie = login.headers['set-cookie'];
  return (Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie)).split(';')[0];
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await prisma.emailToken.deleteMany({ where: { userId: id } });
    await prisma.project.deleteMany({ where: { userId: id } });
    await prisma.user.deleteMany({ where: { id } });
  }
});

const DEFAULT_STATE = {
  code: 'void setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); delay(500); digitalWrite(13, LOW); delay(500); }',
  errors: [] as string[],
  wirings: [{ id: 'w1', from: { part: 'uno', pin: 'D13' }, to: { part: 'led1', pin: 'A' } }],
  parts: [
    { id: 'uno', type: 'arduino-uno', x: 50, y: 50 },
    { id: 'led1', type: 'led', x: 200, y: 100 },
  ],
};

describe('POST /api/ai/chat-context', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      payload: { studentMessage: 'LED 不亮', projectState: DEFAULT_STATE },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects empty studentMessage with 400', async () => {
    const cookie = await registerAndLogin('empty-msg');
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      headers: { cookie },
      payload: { studentMessage: '', projectState: DEFAULT_STATE },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_input');
  });

  it('rejects missing projectState with 400', async () => {
    const cookie = await registerAndLogin('missing-state');
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      headers: { cookie },
      payload: { studentMessage: 'LED 不亮' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns fallback reply when DEEPSEEK_API_KEY is not set', async () => {
    const cookie = await registerAndLogin('no-apikey');
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      headers: { cookie },
      payload: { studentMessage: 'LED 不亮', projectState: DEFAULT_STATE },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('answer');
    expect(body.answer).toContain('AI 助教暂时不可用');
    expect(body).toHaveProperty('suggestions');
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  it('returns fallback reply when projectState.errors has compilation errors', async () => {
    const cookie = await registerAndLogin('with-errors');
    const stateWithErrors = {
      ...DEFAULT_STATE,
      errors: ["error: 'digitalWrite' was not declared in this scope"],
    };
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      headers: { cookie },
      payload: { studentMessage: '代码报错', projectState: stateWithErrors },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.answer).toContain('AI 助教暂时不可用');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const cookie = await registerAndLogin('rate-limit');
    // Seed 20 AiCall rows directly so checkRateLimit() sees the limit hit
    const user = await prisma.user.findFirst({ where: { email: { contains: 'rate-limit' } } });
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        prisma.aiCall.create({ data: { userId: user!.id, taskType: 'chat', tokensIn: 1, tokensOut: 1 } }),
      ),
    );
    const res = await app.inject({
      method: 'POST', url: '/api/ai/chat-context',
      headers: { cookie },
      payload: { studentMessage: 'over limit', projectState: DEFAULT_STATE },
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe('rate_limit_exceeded');
  });
});

/**
 * Hint prompt quality checks.
 * Ensures the hint system prompt has:
 *  - plain-language constraint
 *  - guiding-first structure (先问再答)
 *  - technical term glossing (推挽 etc.)
 *  - encouraging tone
 *  - minimum length
 */

// Required keywords — if these appear in the prompt, the quality bars are met
const HINT_REQUIRED_KEYWORDS = [
  '白话',
  '先问',
  '再答',
  '推挽',
  '阳极',
  '阴极',
  '不是直接报答案', // replaces old "别急"
];

describe('SYSTEM_PROMPTS.hint quality checks', () => {
  // We import the actual prompt from the compiled route file so the test
  // reflects real code, not a hard-coded string.
  it('hint prompt contains all required quality keywords', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    const hint = prompts.hint;
    expect(typeof hint).toBe('string');
    for (const kw of HINT_REQUIRED_KEYWORDS) {
      expect(hint, `hint prompt should mention "${kw}"`).toContain(kw);
    }
  });

  it('hint prompt is longer than explain/error (more guidance = longer)', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    const { explain, error, hint } = prompts;
    // H1 example was ~280 tokens; optimized hint should be ≥ 400 chars
    expect(hint.length).toBeGreaterThan(400);
    expect(hint.length).toBeGreaterThan(explain.length);
    expect(hint.length).toBeGreaterThan(error.length);
  });

  it('explain and error prompts are present and non-empty', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    expect(prompts.explain.length).toBeGreaterThan(50);
    expect(prompts.error.length).toBeGreaterThan(50);
    expect(prompts.hint.length).toBeGreaterThan(50);
  });
});
