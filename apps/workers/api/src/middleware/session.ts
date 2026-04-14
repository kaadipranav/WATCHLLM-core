import type { UserId } from '@watchllm/types';
import type { Context, MiddlewareHandler } from 'hono';
import { createAuth } from '../lib/auth';
import { generateUserId } from '../lib/id';
import { err } from '../lib/response';
import type { Env } from '../types/env';
import { normalizeTier, type AuthVariables } from './auth-types';

function readBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const parts = authorizationHeader.split(' ');
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
}

function readHeaderSessionToken(
  c: Context<{
    Bindings: Env;
    Variables: AuthVariables;
  }>,
): string | null {
  const authToken = readBearerToken(c.req.header('Authorization'));
  const headerToken = c.req.header('X-Session-Token');
  return authToken ?? headerToken ?? null;
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) {
    return parsed;
  }

  for (const segment of cookieHeader.split(';')) {
    const separator = segment.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = segment.slice(0, separator).trim();
    const rawValue = segment.slice(separator + 1).trim();
    if (!key || rawValue.length === 0) {
      continue;
    }

    try {
      parsed[key] = decodeURIComponent(rawValue);
    } catch {
      parsed[key] = rawValue;
    }
  }

  return parsed;
}

function extractLegacyCookieToken(parsedCookies: Record<string, string>): string | null {
  return parsedCookies.session_token ?? parsedCookies.auth_session ?? null;
}

function hasBetterAuthSessionCookie(parsedCookies: Record<string, string>): boolean {
  return (
    typeof parsedCookies['__Secure-better-auth.session_token'] === 'string' ||
    typeof parsedCookies['better-auth.session_token'] === 'string'
  );
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

async function resolveBetterAuthIdentityFromCookies(
  c: Context<{
    Bindings: Env;
    Variables: AuthVariables;
  }>,
  cookieHeader: string,
): Promise<BetterAuthIdentityRow | null> {
  const fallbackOrigin = c.env.ENVIRONMENT === 'development' ? 'http://localhost:3000' : 'https://watchllm.dev';
  const origin = c.req.header('origin') ?? parseOrigin(c.req.header('referer')) ?? fallbackOrigin;
  const referer = c.req.header('referer') ?? `${origin}/`;
  const authBase = c.env.ENVIRONMENT === 'development' ? 'http://localhost:8787' : 'https://api.watchllm.dev';

  const auth = createAuth(c.env);
  const request = new Request(`${authBase}/api/v1/auth/get-session`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Referer: referer,
      cookie: cookieHeader,
    },
  });

  const response = await auth.handler(request);
  if (!response.ok) {
    return null;
  }

  const payload = (await response
    .json()
    .catch(() => null)) as { user?: { email?: string; name?: string | null } } | null;

  const email = payload?.user?.email;
  if (typeof email !== 'string' || email.length === 0) {
    return null;
  }

  const nameValue = payload?.user?.name;
  const normalizedName = typeof nameValue === 'string' && nameValue.length > 0 ? nameValue : null;

  return {
    email,
    name: normalizedName,
  };
}

async function resolveOrCreateAppUser(
  c: Context<{
    Bindings: Env;
    Variables: AuthVariables;
  }>,
  identity: BetterAuthIdentityRow,
  nowUnix: number,
): Promise<AppUserRow | null> {
  let appUser = await c.env.DB.prepare(
    `SELECT id, tier
       FROM users
       WHERE email = ?
       LIMIT 1`,
  )
    .bind(identity.email)
    .first<AppUserRow>();

  if (!appUser) {
    const appUserId = generateUserId();
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, github_username, tier, created_at)
         VALUES (?, ?, ?, 'free', ?)`,
    )
      .bind(appUserId, identity.email, identity.name, nowUnix)
      .run()
      .catch(() => null);

    appUser = await c.env.DB.prepare(
      `SELECT id, tier
         FROM users
         WHERE email = ?
         LIMIT 1`,
    )
      .bind(identity.email)
      .first<AppUserRow>();
  }

  return appUser;
}

interface SessionAuthRow {
  user_id: string;
  tier: string;
}

interface BetterAuthIdentityRow {
  email: string;
  name: string | null;
}

interface AppUserRow {
  id: string;
  tier: string;
}

export const sessionMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const cookieHeader = c.req.header('cookie') ?? c.req.header('Cookie');
  const parsedCookies = parseCookieHeader(cookieHeader);
  const token = readHeaderSessionToken(c) ?? extractLegacyCookieToken(parsedCookies);

  const now = Math.floor(Date.now() / 1000);

  if (token) {
    const session = await c.env.DB.prepare(
      `SELECT s.user_id AS user_id, u.tier AS tier
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?
       LIMIT 1`,
    )
      .bind(token, now)
      .first<SessionAuthRow>();

    if (session) {
      c.set('userId', session.user_id as UserId);
      c.set('userTier', normalizeTier(session.tier));
      c.set('authMethod', 'session');
      return next();
    }

    const nowIso = new Date().toISOString();
    const betterAuthIdentity = await c.env.DB.prepare(
      `SELECT u.email AS email, u.name AS name
         FROM session s
         INNER JOIN user u ON u.id = s.userId
         WHERE s.token = ? AND s.expiresAt > ?
         LIMIT 1`,
    )
      .bind(token, nowIso)
      .first<BetterAuthIdentityRow>();

    if (betterAuthIdentity) {
      const appUser = await resolveOrCreateAppUser(c, betterAuthIdentity, now);
      if (!appUser) {
        return c.json(err('Unauthorized', 401), 401);
      }

      c.set('userId', appUser.id as UserId);
      c.set('userTier', normalizeTier(appUser.tier));
      c.set('authMethod', 'session');
      return next();
    }

    return c.json(err('Unauthorized', 401), 401);
  }

  if (cookieHeader && hasBetterAuthSessionCookie(parsedCookies)) {
    const betterAuthIdentity = await resolveBetterAuthIdentityFromCookies(c, cookieHeader);
    if (!betterAuthIdentity) {
      return c.json(err('Unauthorized', 401), 401);
    }

    const appUser = await resolveOrCreateAppUser(c, betterAuthIdentity, now);
    if (!appUser) {
      return c.json(err('Unauthorized', 401), 401);
    }

    c.set('userId', appUser.id as UserId);
    c.set('userTier', normalizeTier(appUser.tier));
    c.set('authMethod', 'session');
    return next();
  }

  return c.json(err('Unauthorized', 401), 401);
};
