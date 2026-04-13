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

function parseOrigin(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

// Backward-compatible bridge for legacy GET-based clients.
authRouter.get('/sign-in/social', async (c) => {
  const provider = c.req.query('provider');
  const rawCallbackURL = c.req.query('callbackURL');
  const callbackURL = normalizeCallbackURL(rawCallbackURL);
  const disableRedirect = c.req.query('disableRedirect') === 'true';

  const fallbackOrigin =
    c.env.ENVIRONMENT === 'development' ? 'http://localhost:3000' : 'https://watchllm.dev';
  const origin =
    c.req.header('origin') ??
    parseOrigin(c.req.header('referer')) ??
    parseOrigin(rawCallbackURL) ??
    fallbackOrigin;
  const referer = c.req.header('referer') ?? `${origin}/`;

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
      Origin: origin,
      Referer: referer,
      ...(c.req.header('cookie') ? { cookie: c.req.header('cookie') as string } : {}),
    },
    body,
  });

  const response = await auth.handler(request);

  // When invoked as a top-level browser navigation, convert the Better Auth
  // JSON redirect payload into an actual HTTP redirect.
  const contentType = response.headers.get('content-type') ?? '';
  if (response.ok && contentType.includes('application/json')) {
    const payload = await response
      .clone()
      .json()
      .catch(() => null) as { redirect?: boolean; url?: string } | null;

    if (payload?.redirect === true && typeof payload.url === 'string' && payload.url.length > 0) {
      const headers = new Headers(response.headers);
      headers.set('Location', payload.url);
      return new Response(null, {
        status: 302,
        headers,
      });
    }
  }

  return response;
});

authRouter.all('*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});