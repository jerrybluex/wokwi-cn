/**
 * apps/server/test/setup.ts
 * Loads dotenv before any test file runs.
 * DATABASE_URL must be set at import time — Prisma reads it once at module load.
 * Path: apps/server/.env (resolved relative to this file).
 *
 * Prisma 6 SQLite requires absolute paths for file: URLs.
 * We resolve relative paths to absolute before setting DATABASE_URL.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

config({ path: resolve(__dirname, '../.env') });

// Resolve relative SQLite URLs to absolute (Prisma 6 requires this)
const rawUrl = process.env.DATABASE_URL ?? '';
if (rawUrl.startsWith('file:./') || rawUrl.startsWith('file:prisma/')) {
  const relativePath = rawUrl.replace(/^file:/, '');
  const absolutePath = resolve(__dirname, '..', relativePath);
  if (existsSync(absolutePath)) {
    process.env.DATABASE_URL = `file:${absolutePath}`;
  }
}
