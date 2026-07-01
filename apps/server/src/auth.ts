/**
 * auth.ts — password hashing, token minting, email token lifecycle, and
 * the small helpers that the /api/auth/* routes wrap.
 *
 *   hashPassword(plain)        -> Argon2id hash
 *   verifyPassword(hash, plain)-> boolean
 *   signSession(userId)        -> JWT string
 *   verifySession(jwt)         -> userId or null
 *   issueEmailToken(userId, purpose, ttlHours)
 *   consumeEmailToken(token, purpose) -> userId or null
 *   setSessionCookie(reply, jwt) / clearSessionCookie(reply)
 */
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import { prisma } from './db.js';

const SESSION_COOKIE = 'wokwi_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const EMAIL_TOKEN_TTL_HOURS = 24;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

export function generateEmailToken(): string {
  // 32 bytes → 43 char base64url. Plenty of entropy.
  return randomBytes(32).toString('base64url');
}

export async function issueEmailToken(
  userId: string,
  purpose: 'verify' | 'reset',
  ttlHours = EMAIL_TOKEN_TTL_HOURS,
): Promise<string> {
  const token = generateEmailToken();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await prisma.emailToken.create({
    data: { userId, token, purpose, expiresAt },
  });
  return token;
}

/**
 * Returns the userId for a valid token. Invalidates the token by setting
 * usedAt so it can't be replayed.
 */
export async function consumeEmailToken(
  token: string,
  purpose: 'verify' | 'reset',
): Promise<string | null> {
  const row = await prisma.emailToken.findUnique({ where: { token } });
  if (!row) return null;
  if (row.purpose !== purpose) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  await prisma.emailToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row.userId;
}

export function setSessionCookie(reply: FastifyReply, jwt: string): void {
  reply.setCookie(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS, EMAIL_TOKEN_TTL_HOURS };
