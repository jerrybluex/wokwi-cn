/**
 * /api/auth/* — registration, login, logout, email verification, password
 * reset. Email delivery is stubbed: every verify / reset URL is logged to
 * the server console, which is the MVP contract from devplan § 4 Day 6.
 *
 * Endpoints:
 *   POST /api/auth/register   { email, password, name? }
 *   POST /api/auth/login      { email, password }
 *   POST /api/auth/logout
 *   GET  /api/auth/verify?token=...   (also accepts POST for link clicks)
 *   POST /api/auth/forgot     { email }
 *   POST /api/auth/reset      { token, password }
 *   GET  /api/me
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from './db.js';
import {
  hashPassword,
  verifyPassword,
  issueEmailToken,
  consumeEmailToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieName,
} from './auth.js';

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

const emailSchema = z.string().email().max(254).toLowerCase().trim();
const passwordSchema = z.string().min(8).max(128);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(80).optional(),
});
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

function logEmailLink(kind: 'verify' | 'reset', token: string): void {
  const path = kind === 'verify' ? '/api/auth/verify' : '/api/auth/reset';
  const url = `${WEB_ORIGIN}${path}?token=${encodeURIComponent(token)}`;
  // eslint-disable-next-line no-console
  console.log(`[auth:email] ${kind} URL: ${url}`);
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ───────── register ─────────
  app.post('/api/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_input', details: parsed.error.format() });
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: 'email_in_use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null },
    });

    const token = await issueEmailToken(user.id, 'verify');
    logEmailLink('verify', token);

    return reply.code(201).send({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
      message: '注册成功,验证链接已发到控制台 (开发环境)',
    });
  });

  // ───────── verify email ─────────
  app.get('/api/auth/verify', async (req, reply) => {
    const token = (req.query as { token?: string }).token;
    if (!token) return reply.code(400).send({ error: 'missing_token' });
    const userId = await consumeEmailToken(token, 'verify');
    if (!userId) return reply.code(400).send({ error: 'invalid_or_expired_token' });
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    return reply.send({ ok: true, message: '邮箱已验证' });
  });

  // ───────── login ─────────
  app.post('/api/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_input' });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: 'invalid_credentials' });
    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return reply.code(401).send({ error: 'invalid_credentials' });
    const jwt = await reply.jwtSign({ sub: user.id, email: user.email });
    setSessionCookie(reply, jwt);
    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
    });
  });

  // ───────── logout ─────────
  app.post('/api/auth/logout', async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  // ───────── forgot (issue reset token) ─────────
  app.post('/api/auth/forgot', async (req, reply) => {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await issueEmailToken(user.id, 'reset');
      logEmailLink('reset', token);
    }
    // Don't leak whether the email exists.
    return reply.send({ ok: true, message: '若该邮箱已注册,重置链接已生成 (查看控制台)' });
  });

  // ───────── reset (consume token + set new password) ─────────
  app.post('/api/auth/reset', async (req, reply) => {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });
    const { token, password } = parsed.data;
    const userId = await consumeEmailToken(token, 'reset');
    if (!userId) return reply.code(400).send({ error: 'invalid_or_expired_token' });
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return reply.send({ ok: true, message: '密码已重置' });
  });
}

// ───────── /api/me — requires session cookie ─────────
export async function meRoute(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/me',
    { onRequest: [app.authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req.user as { sub: string } | undefined)?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, emailVerified: true, createdAt: true },
      });
      if (!user) return reply.code(401).send({ error: 'unauthenticated' });
      return reply.send({ user });
    },
  );
}

// re-export for tests
export {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  getSessionCookieName,
};
