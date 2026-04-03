import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { agentRouter } from './routers/agent-router';
import { authRouter } from './routers/auth-router';
import { keyRouter } from './routers/key-router';
import { projectRouter } from './routers/project-router';
import { err, ok } from './lib/response';
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

// API v1 routes
app.route('/api/v1/auth', authRouter);
app.route('/api/v1/keys', keyRouter);
app.route('/api/v1/projects', projectRouter);
app.route('/api/v1/agents', agentRouter);

// Simulations (Phase 3)
app.use('/api/v1/simulations/*', rateLimitMiddleware);
app.use('/api/v1/simulations', rateLimitMiddleware);
app.all('/api/v1/simulations/*', (c) => c.json(err('Not implemented', 501), 501));
app.all('/api/v1/simulations', (c) => c.json(err('Not implemented', 501), 501));

// Webhooks (Phase 6)
app.use('/api/v1/webhooks/*', rateLimitMiddleware);
app.use('/api/v1/webhooks', rateLimitMiddleware);
app.all('/api/v1/webhooks/*', (c) => c.json(err('Not implemented', 501), 501));
app.all('/api/v1/webhooks', (c) => c.json(err('Not implemented', 501), 501));

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
