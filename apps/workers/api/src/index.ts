import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { err, ok } from './lib/response';
import simulationRouter from './routers/simulation-router';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const environment = c.env.ENVIRONMENT;
      if (environment === 'development') return origin;
      return 'https://watchllm.dev';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-WatchLLM-Api-Key'],
    credentials: true,
  }),
);

// Health check
app.get('/health', (c) => {
  return c.json(ok({ status: 'ok', env: c.env.ENVIRONMENT }), 200);
});

// API v1 routes (stubs - implemented in later phases)
const api = new Hono<{ Bindings: Env }>();

// Auth routes (Phase 2)
api.all('/auth/*', (c) => c.json(err('Not implemented', 501), 501));

// Projects (Phase 2)
api.all('/projects/*', (c) => c.json(err('Not implemented', 501), 501));
api.all('/projects', (c) => c.json(err('Not implemented', 501), 501));

// Agents (Phase 2)
api.all('/agents/*', (c) => c.json(err('Not implemented', 501), 501));
api.all('/agents', (c) => c.json(err('Not implemented', 501), 501));

// Simulations (Phase 3)
api.route('/simulations', simulationRouter);

// API Keys (Phase 2)
api.all('/keys/*', (c) => c.json(err('Not implemented', 501), 501));
api.all('/keys', (c) => c.json(err('Not implemented', 501), 501));

// Webhooks (Phase 6)
api.all('/webhooks/*', (c) => c.json(err('Not implemented', 501), 501));

app.route('/api/v1', api);

// 404 fallback
app.notFound((c) => {
  return c.json(err('Not found', 404), 404);
});

// Global error handler
app.onError((error, c) => {
  console.error('Unhandled error:', error);
  return c.json(err('Internal server error', 500), 500);
});

export default app;
