import bcrypt from 'bcryptjs';
import type { UserId } from '@watchllm/types';
import type { MiddlewareHandler } from 'hono';
import { err } from '../lib/response';
import type { Env } from '../types/env';
import { normalizeTier, type AuthVariables } from './auth-types';

interface ApiKeyAuthRow {
  id: string;
  user_id: string;
  key_hash: string;
  tier: string;
}

function buildPrefixCandidates(rawKey: string): string[] {
  const prefixes = [8, 12, 16]
    .map((length) => rawKey.slice(0, length))
    .filter((value) => value.length > 0);

  return Array.from(new Set(prefixes));
}

export const apiKeyMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const rawApiKey = c.req.header('X-WatchLLM-Api-Key');
  if (!rawApiKey) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const prefixCandidates = buildPrefixCandidates(rawApiKey);
  if (prefixCandidates.length === 0) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const placeholders = prefixCandidates.map(() => '?').join(', ');
  const matchingRows = await c.env.DB.prepare(
    `SELECT k.id AS id, k.user_id AS user_id, k.key_hash AS key_hash, u.tier AS tier
     FROM api_keys k
     INNER JOIN users u ON u.id = k.user_id
     WHERE k.key_prefix IN (${placeholders})
       AND k.revoked_at IS NULL
       AND (k.expires_at IS NULL OR k.expires_at > ?)`,
  )
    .bind(...prefixCandidates, now)
    .all<ApiKeyAuthRow>();

  const rows = matchingRows.results ?? [];

  let validKeyRow: ApiKeyAuthRow | null = null;
  for (const row of rows) {
    const isMatch = await bcrypt.compare(rawApiKey, row.key_hash);
    if (isMatch) {
      validKeyRow = row;
      break;
    }
  }

  if (!validKeyRow) {
    return c.json(err('Unauthorized', 401), 401);
  }

  await c.env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
    .bind(now, validKeyRow.id)
    .run();

  c.set('userId', validKeyRow.user_id as UserId);
  c.set('userTier', normalizeTier(validKeyRow.tier));
  c.set('authMethod', 'api_key');

  return next();
};
