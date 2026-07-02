import { buildServer } from './server.js';
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  } catch (err) {
    console.warn('[sentry] init failed, skipping:', err);
  }
} else {
  console.info('[sentry] SENTRY_DSN not set — error tracking disabled');
}

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '127.0.0.1';

async function main() {
  const app = await buildServer();

  // Sentry Fastify error handler
  if (SENTRY_DSN) {
    app.setErrorHandler((err, req, reply) => {
      Sentry.captureException(err, { extra: { url: req.url, method: req.method } });
      app.log.error(err);
      reply.code(500).send({ error: 'internal_server_error' });
    });
  }

  // graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down`);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'shutdown error');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err, 'listen failed');
    process.exit(1);
  }
}

main();
