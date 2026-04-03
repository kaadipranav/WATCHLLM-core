import type { Tier } from '@watchllm/types';
import { createMiddleware } from 'hono/factory';
import { err } from '../lib/response';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

const RATE_LIMITS: Record<Tier, number> = {
  free: 60,
  pro: 600,
  team: 2000,
};

export const rateLimitMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: RequestVariables;
}>(async (c, next) => {
  const tier = c.get('userTier') ?? 'free';
  const forwardedFor =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'anonymous';
  const userId = c.get('userId') ?? (`anon_${forwardedFor}` as const);
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `rl:${userId}:${hour}`;

  const current = await c.env.KV.get(key);
  const parsed = current === null ? 0 : Number.parseInt(current, 10);
  const count = Number.isNaN(parsed) ? 0 : parsed;
  const limit = RATE_LIMITS[tier];

  if (count >= limit) {
    return c.json(err('Rate limit exceeded', 429), 429);
  }

  await c.env.KV.put(key, String(count + 1), { expirationTtl: 7200 });

  await next();
  return;
});