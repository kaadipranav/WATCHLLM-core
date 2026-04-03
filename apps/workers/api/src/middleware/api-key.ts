import type { ApiKeyRow, Tier } from '@watchllm/types';
import bcrypt from 'bcryptjs';
import { createMiddleware } from 'hono/factory';
import { err } from '../lib/response';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

export const apiKeyMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: RequestVariables;
}>(async (c, next) => {
  const header = c.req.header('X-WatchLLM-Api-Key');

  if (!header || !header.startsWith('wllm_')) {
    return c.json(err('Missing or invalid API key', 401), 401);
  }

  const parts = header.slice(5).split('_');
  const prefix = parts[0];

  if (parts.length < 2 || !prefix) {
    return c.json(err('Malformed API key', 401), 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare(
    `SELECT
       ak.id,
       ak.user_id,
       ak.key_prefix,
       ak.key_hash,
       ak.name,
       ak.expires_at,
       ak.revoked_at,
       ak.last_used_at,
       ak.created_at,
       u.tier
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_prefix = ?
       AND ak.revoked_at IS NULL
       AND (ak.expires_at IS NULL OR ak.expires_at > ?)
     LIMIT 1`
  )
    .bind(prefix, now)
    .first<ApiKeyRow & { tier: Tier }>();

  if (!row) {
    return c.json(err('Invalid API key', 401), 401);
  }

  const isValid = await bcrypt.compare(header, row.key_hash);
  if (!isValid) {
    return c.json(err('Invalid API key', 401), 401);
  }

  void c.env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
    .bind(now, row.id)
    .run();

  c.set('userId', row.user_id);
  c.set('userTier', row.tier);

  await next();
  return;
});