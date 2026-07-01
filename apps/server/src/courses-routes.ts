/**
 * courses-routes.ts — Course listing, detail, and progress sync.
 *
 * Endpoints:
 *   GET  /api/courses                    — list all courses (MVP: just led-blink)
 *   GET  /api/courses/:slug              — course detail (all steps, no answers)
 *   GET  /api/courses/:slug/progress     — current user's progress
 *   POST /api/courses/:slug/progress     — sync progress { stepIdx, completed }
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './db.js';
import { ledBlinkCourse } from './courses/led-blink.js';

// Registry — add more courses here as they are added.
const COURSE_REGISTRY: Record<string, typeof ledBlinkCourse> = {
  'led-blink': ledBlinkCourse,
};

const progressSyncSchema = z.object({
  stepIdx: z.number().int().min(0),
  completed: z.boolean().optional().default(false),
});

export async function coursesRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /api/courses — list ──────────────────────────────────────
  app.get('/api/courses', async () => {
    return {
      courses: Object.values(COURSE_REGISTRY).map((c) => ({
        slug: c.slug,
        title: c.title,
        description: c.description,
        stepCount: c.steps.length,
      })),
    };
  });

  // ── GET /api/courses/:slug — detail ─────────────────────────────
  app.get(
    '/api/courses/:slug',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const slug = (req.params as { slug: string }).slug;
      const course = COURSE_REGISTRY[slug];
      if (!course) return reply.code(404).send({ error: 'course_not_found' });

      // Get user's progress (if any)
      const userId = (req.user as { sub: string } | undefined)?.sub;
      let stepIdx = 0;
      if (userId) {
        const row = await prisma.courseProgress.findUnique({
          where: { userId_courseSlug: { userId, courseSlug: slug } },
        });
        if (row) stepIdx = row.stepIdx;
      }

      return {
        course: {
          slug: course.slug,
          title: course.title,
          description: course.description,
          steps: course.steps.map((s, i) => ({
            title: s.title,
            context: s.context,
            taskCode: s.taskCode,
            taskWiring: s.taskWiring,
            stepIndex: i,
          })),
          currentStepIdx: stepIdx,
        },
      };
    },
  );

  // ── GET /api/courses/:slug/progress ─────────────────────────────
  app.get(
    '/api/courses/:slug/progress',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as { sub: string } | undefined)?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });
      const slug = (req.params as { slug: string }).slug;
      if (!COURSE_REGISTRY[slug]) return reply.code(404).send({ error: 'course_not_found' });

      const row = await prisma.courseProgress.findUnique({
        where: { userId_courseSlug: { userId, courseSlug: slug } },
      });
      return {
        stepIdx: row?.stepIdx ?? 0,
        completed: !!row?.completedAt,
      };
    },
  );

  // ── POST /api/courses/:slug/progress — sync ──────────────────────
  app.post(
    '/api/courses/:slug/progress',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as { sub: string } | undefined)?.sub;
      if (!userId) return reply.code(401).send({ error: 'unauthenticated' });

      const slug = (req.params as { slug: string }).slug;
      const course = COURSE_REGISTRY[slug];
      if (!course) return reply.code(404).send({ error: 'course_not_found' });

      const parsed = progressSyncSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_input' });

      const { stepIdx, completed } = parsed.data;
      // clamp to valid range
      const safeIdx = Math.min(stepIdx, course.steps.length - 1);

      await prisma.courseProgress.upsert({
        where: { userId_courseSlug: { userId, courseSlug: slug } },
        create: {
          userId,
          courseSlug: slug,
          stepIdx: safeIdx,
          completedAt: completed ? new Date() : null,
        },
        update: {
          stepIdx: safeIdx,
          completedAt: completed ? new Date() : null,
        },
      });

      return { ok: true, stepIdx: safeIdx };
    },
  );
}