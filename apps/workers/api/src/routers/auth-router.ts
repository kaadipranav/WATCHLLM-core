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

function normalizeCallbackURL(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
}

// Backward-compatible bridge for legacy GET-based clients.
authRouter.get('/sign-in/social', async (c) => {
  const provider = c.req.query('provider');
  const callbackURL = normalizeCallbackURL(c.req.query('callbackURL'));
  const disableRedirect = c.req.query('disableRedirect') === 'true';

  const body = JSON.stringify({
    provider,
    callbackURL,
    disableRedirect,
  });

  const auth = createAuth(c.env);
  const request = new Request(c.req.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(c.req.header('cookie') ? { cookie: c.req.header('cookie') as string } : {}),
    },
    body,
  });

  return auth.handler(request);
});

authRouter.all('*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});