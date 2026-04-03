import type { Tier, UserId } from '@watchllm/types';
import { createMiddleware } from 'hono/factory';
import { createAuth } from '../lib/auth';
import { generateUserId } from '../lib/id';
import { err } from '../lib/response';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

type UserTierRow = {
  id: UserId;
  tier: Tier;
};

async function getUserByEmail(env: Env, email: string): Promise<UserTierRow | null> {
  return env.DB.prepare('SELECT id, tier FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<UserTierRow>();
}

export const sessionMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: RequestVariables;
}>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const email = session?.user?.email;

  if (!email) {
    return c.json(err('Unauthorized', 401), 401);
  }

  let user = await getUserByEmail(c.env, email);

  if (!user) {
    const now = Math.floor(Date.now() / 1000);
    const userId = generateUserId();

    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO users (
         id, email, github_username, tier, created_at, stripe_customer_id
       ) VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, email, null, 'free', now, null)
      .run();

    user = await getUserByEmail(c.env, email);
  }

  if (!user) {
    return c.json(err('Unauthorized', 401), 401);
  }

  c.set('userId', user.id);
  c.set('userTier', user.tier);

  await next();
  return;
});