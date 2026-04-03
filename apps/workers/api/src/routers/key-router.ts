import type { ApiKeyRow, KeyId } from '@watchllm/types';
import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { generateKeyId } from '../lib/id';
import { err, ok } from '../lib/response';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { sessionMiddleware } from '../middleware/session';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

const createKeySchema = z.object({
  name: z.string().max(64).optional(),
});

type ApiKeyListItem = Pick<
  ApiKeyRow,
  'id' | 'key_prefix' | 'name' | 'expires_at' | 'last_used_at' | 'created_at'
>;

type CreateKeyResponse = {
  id: KeyId;
  full_key: string;
  prefix: string;
  name: string | null;
  created_at: number;
};

export const keyRouter = new Hono<{
  Bindings: Env;
  Variables: RequestVariables;
}>();

keyRouter.use('*', sessionMiddleware);
keyRouter.use('*', rateLimitMiddleware);

keyRouter.post('/', async (c) => {
  const rawBody: unknown = await c.req.json().catch(() => ({}));
  const parsed = createKeySchema.safeParse(rawBody);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return c.json(err(message, 400), 400);
  }

  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const keyId = generateKeyId();
  const prefix = nanoid(8);
  const secret = nanoid(32);
  const fullKey = `wllm_${prefix}_${secret}`;
  const keyHash = await bcrypt.hash(fullKey, 10);
  const createdAt = Math.floor(Date.now() / 1000);
  const name = parsed.data.name ?? null;

  await c.env.DB.prepare(
    `INSERT INTO api_keys (
       id,
       user_id,
       key_prefix,
       key_hash,
       name,
       expires_at,
       revoked_at,
       last_used_at,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(keyId, userId, prefix, keyHash, name, null, null, null, createdAt)
    .run();

  const response: CreateKeyResponse = {
    id: keyId,
    full_key: fullKey,
    prefix,
    name,
    created_at: createdAt,
  };

  return c.json(ok(response), 201);
});

keyRouter.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const result = await c.env.DB.prepare(
    `SELECT id, key_prefix, name, expires_at, last_used_at, created_at
     FROM api_keys
     WHERE user_id = ?
       AND revoked_at IS NULL
     ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<ApiKeyListItem>();

  return c.json(ok(result.results ?? []), 200);
});

keyRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const keyId = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id
     FROM api_keys
     WHERE id = ?
       AND user_id = ?
       AND revoked_at IS NULL
     LIMIT 1`
  )
    .bind(keyId, userId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json(err('API key not found', 404), 404);
  }

  const revokedAt = Math.floor(Date.now() / 1000);
  await c.env.DB.prepare(
    `UPDATE api_keys
     SET revoked_at = ?
     WHERE id = ?
       AND user_id = ?
       AND revoked_at IS NULL`
  )
    .bind(revokedAt, keyId, userId)
    .run();

  return c.json(ok({ revoked: true }), 200);
});