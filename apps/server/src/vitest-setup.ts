/**
 * vitest-setup.ts — loads .env before any tests run.
 * Prisma and all DB calls need DATABASE_URL at import time.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

// apps/server/src/vitest-setup.ts → root .env
config({ path: resolve(__dirname, '../../../.env') });