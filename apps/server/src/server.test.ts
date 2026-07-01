import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with ok status + service metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('wokwi-server');
    expect(body.version).toBe('0.1.0');
    expect(typeof body.time).toBe('string');
    // 时间戳应是合法 ISO string
    expect(() => new Date(body.time).toISOString()).not.toThrow();
  });
});
