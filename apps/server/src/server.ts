import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { WOKWI_API_VERSION } from '@wokwi/shared';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // D6 实装用户路由之前,先 register 最小中间件
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // 健康检查端点 — D1 stub,后续所有路由加在下面
  app.get('/health', async () => ({
    status: 'ok',
    time: new Date().toISOString(),
    service: 'wokwi-server',
    version: WOKWI_API_VERSION,
  }));

  // D7 实装 share link 公开路由 GET /p/:shareId
  // D6 实装 /api/auth/*, /api/projects/*, /api/courses/*, /api/ai/chat

  return app;
}
