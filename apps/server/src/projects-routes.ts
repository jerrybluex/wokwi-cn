/**
 * projects-routes.ts — CRUD for the user's saved sketches.
 *
 *   POST   /api/projects              create
 *   GET    /api/projects              list own projects
 *   GET    /api/projects/:id          read own
 *   PUT    /api/projects/:id          update (autosave target)
 *   DELETE /api/projects/:id          delete own
 *   POST   /api/projects/:id/share    enable share (generate shareId)
 *   DELETE /api/projects/:id/share    disable share
 *   GET    /p/:shareId                public read — no auth
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { prisma } from './db.js';

const projectInput = z.object({
  name: z.string().min(1).max(80).default('Untitled'),
  code: z.string().max(200_000).default(''),
  wiring: z.string().max(500_000).default(''),
});

function genShareId(): string {
  // 10 chars of base64url — 60 bits, plenty of headroom.
  return randomBytes(8).toString('base64url').slice(0, 10);
}

async function genUniqueShareId(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = genShareId();
    const existing = await prisma.project.findUnique({ where: { shareId: id } });
    if (!existing) return id;
  }
  // Astronomically unlikely.
  return genShareId() + Date.now().toString(36).slice(-3);
}

function userIdOf(req: FastifyRequest): string | null {
  const u = req.user as { sub?: string } | undefined;
  return u?.sub ?? null;
}

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // ── list own projects ──
  app.get(
    '/api/projects',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const projects = await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          shareId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return reply.send({ projects });
    },
  );

  // ── create ──
  app.post(
    '/api/projects',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const parsed = projectInput.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_input', details: parsed.error.format() });
      }
      const project = await prisma.project.create({
        data: { ...parsed.data, userId },
      });
      return reply.code(201).send({ project });
    },
  );

  // ── read own ──
  app.get<{ Params: { id: string } }>(
    '/api/projects/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!project) return reply.code(404).send({ error: 'not_found' });
      if (project.userId !== userId) return reply.code(403).send({ error: 'forbidden' });
      return reply.send({ project });
    },
  );

  // ── update own ──
  app.put<{ Params: { id: string } }>(
    '/api/projects/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.code(404).send({ error: 'not_found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'forbidden' });
      const parsed = projectInput.partial().safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_input', details: parsed.error.format() });
      }
      // Build a sparse data object — only include keys the caller actually
      // sent. Prisma's update treats missing keys as "leave alone", but
      // zod's partial() returns undefined for missing fields, which some
      // Prisma clients honour as "reset to default" — we don't want that.
      const body = (req.body ?? {}) as Record<string, unknown>;
      const data: { name?: string; code?: string; wiring?: string } = {};
      if ('name' in body && typeof body.name === 'string') data.name = body.name;
      if ('code' in body && typeof body.code === 'string') data.code = body.code;
      if ('wiring' in body && typeof body.wiring === 'string') data.wiring = body.wiring;
      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ error: 'no_fields_to_update' });
      }
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data,
      });
      return reply.send({ project });
    },
  );

  // ── delete own ──
  app.delete<{ Params: { id: string } }>(
    '/api/projects/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.code(404).send({ error: 'not_found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'forbidden' });
      await prisma.project.delete({ where: { id: req.params.id } });
      return reply.send({ ok: true });
    },
  );

  // ── enable share ──
  app.post<{ Params: { id: string } }>(
    '/api/projects/:id/share',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.code(404).send({ error: 'not_found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'forbidden' });
      const shareId = existing.shareId ?? (await genUniqueShareId());
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: { shareId },
        select: { id: true, shareId: true, name: true },
      });
      return reply.send({ project });
    },
  );

  // ── fork a shared project ──
  app.post<{ Body: { shareId: string } }>(
    '/api/projects/fork',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const { shareId } = req.body as { shareId?: unknown };
      if (typeof shareId !== 'string' || !shareId) {
        return reply.code(400).send({ error: 'shareId_required' });
      }
      const source = await prisma.project.findUnique({ where: { shareId } });
      if (!source) return reply.code(404).send({ error: 'source_not_found' });
      const project = await prisma.project.create({
        data: {
          name: `${source.name}（副本）`,
          code: source.code,
          wiring: source.wiring,
          userId,
        },
      });
      return reply.code(201).send({ project });
    },
  );

  // ── disable share ──
  app.delete<{ Params: { id: string } }>(
    '/api/projects/:id/share',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = userIdOf(req);
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!existing) return reply.code(404).send({ error: 'not_found' });
      if (existing.userId !== userId) return reply.code(403).send({ error: 'forbidden' });
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: { shareId: null },
        select: { id: true, shareId: true, name: true },
      });
      return reply.send({ project });
    },
  );
}

/**
 * Public share view — no auth required.
 * Mounted at /p/:shareId, distinct from /api/* so it lives outside the
 * JSON API surface.
 */
export async function publicShareRoute(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { shareId: string } }>('/p/:shareId', async (req, reply) => {
    const project = await prisma.project.findUnique({
      where: { shareId: req.params.shareId },
      select: {
        id: true,
        name: true,
        code: true,
        wiring: true,
        updatedAt: true,
        shareId: true,
      },
    });
    if (!project) return reply.code(404).send({ error: 'not_found' });
    return reply.send({ project });
  });
}

export { projectInput, genShareId, genUniqueShareId };
