import type { UserId } from '@watchllm/types';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
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

function readSessionToken(
  c: Context<{
    Bindings: Env;
    Variables: AuthVariables;
  }>,
): string | null {
  const authToken = readBearerToken(c.req.header('Authorization'));
  const headerToken = c.req.header('X-Session-Token');
  const cookieToken =
    getCookie(c, 'session_token') ??
    getCookie(c, '__Secure-better-auth.session_token') ??
    getCookie(c, 'better-auth.session_token') ??
    getCookie(c, 'auth_session');

  return authToken ?? headerToken ?? cookieToken ?? null;
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
  const token = readSessionToken(c);
  if (!token) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const session = await c.env.DB.prepare(
    `SELECT s.user_id AS user_id, u.tier AS tier
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?
     LIMIT 1`,
  )
    .bind(token, now)
    .first<SessionAuthRow>();

  if (!session) {
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

    if (!betterAuthIdentity) {
      return c.json(err('Unauthorized', 401), 401);
    }

    let appUser = await c.env.DB.prepare(
      `SELECT id, tier
       FROM users
       WHERE email = ?
       LIMIT 1`,
    )
      .bind(betterAuthIdentity.email)
      .first<AppUserRow>();

    if (!appUser) {
      const appUserId = generateUserId();
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, github_username, tier, created_at)
         VALUES (?, ?, ?, 'free', ?)`,
      )
        .bind(appUserId, betterAuthIdentity.email, betterAuthIdentity.name, now)
        .run()
        .catch(() => null);

      appUser = await c.env.DB.prepare(
        `SELECT id, tier
         FROM users
         WHERE email = ?
         LIMIT 1`,
      )
        .bind(betterAuthIdentity.email)
        .first<AppUserRow>();
    }

    if (!appUser) {
      return c.json(err('Unauthorized', 401), 401);
    }

    c.set('userId', appUser.id as UserId);
    c.set('userTier', normalizeTier(appUser.tier));
    c.set('authMethod', 'session');
    return next();
  }

  c.set('userId', session.user_id as UserId);
  c.set('userTier', normalizeTier(session.tier));
  c.set('authMethod', 'session');

  return next();
};
