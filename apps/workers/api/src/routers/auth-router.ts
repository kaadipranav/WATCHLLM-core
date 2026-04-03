import { Hono } from 'hono';
import { createAuth } from '../lib/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

export const authRouter = new Hono<{
  Bindings: Env;
  Variables: RequestVariables;
}>();

authRouter.use('*', rateLimitMiddleware);

authRouter.all('*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});