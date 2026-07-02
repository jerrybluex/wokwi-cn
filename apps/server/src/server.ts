import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { WOKWI_API_VERSION } from '@wokwi/shared';
import { authRoutes, meRoute } from './auth-routes.js';
import { projectRoutes, publicShareRoute } from './projects-routes.js';
import { aiRoutes } from './ai-routes.js';
import { coursesRoutes } from './courses-routes.js';

const SESSION_COOKIE = 'wokwi_session';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-jwt-secret-replace-in-production';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.register(cookie);
  await app.register(jwt, {
    secret: JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });

  // Decorate app with authenticate — checks session cookie OR Authorization header
  app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthenticated' });
    }
  });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
    service: 'wokwi-server',
    version: WOKWI_API_VERSION,
  }));

  // D6 — auth + me
  await authRoutes(app);
  await meRoute(app);

  // D7 — project CRUD + share
  await projectRoutes(app);
  await publicShareRoute(app);

  // D8 — AI tutor
  await aiRoutes(app);

  // D9 — course player
  await coursesRoutes(app);

  return app;
}

// Re-declare augment for `app.authenticate`
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
