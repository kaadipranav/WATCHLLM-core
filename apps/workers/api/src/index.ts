import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { err, ok } from './lib/response';
import { agentRouter } from './routers/agent-router';
import { authRouter } from './routers/auth-router';
import billingRouter from './routers/billing-router';
import { keyRouter } from './routers/key-router';
import { projectRouter } from './routers/project-router';
import simulationRouter from './routers/simulation-router';
import webhookRouter from './routers/webhook-router';
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
const api = new Hono<{ Bindings: Env }>();

// Auth routes
api.route('/auth', authRouter);

// Projects
api.route('/projects', projectRouter);

// Agents
api.route('/agents', agentRouter);

// Simulations
api.route('/simulations', simulationRouter);

// API Keys
api.route('/keys', keyRouter);

// Billing
api.route('/billing', billingRouter);

// Webhooks
api.route('/webhooks', webhookRouter);

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
