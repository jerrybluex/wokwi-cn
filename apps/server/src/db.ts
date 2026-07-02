/**
 * Prisma client singleton. Keeps a single PrismaClient in module scope
 * so the connection pool isn't recreated on hot reload.
 */
import { PrismaClient } from '@prisma/client';

declare global {
   
  var __wokwi_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__wokwi_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__wokwi_prisma = prisma;
}
