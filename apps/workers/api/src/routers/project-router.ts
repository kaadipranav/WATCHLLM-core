import type { ProjectRow } from '@watchllm/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateProjectId } from '../lib/id';
import { err, ok } from '../lib/response';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { sessionMiddleware } from '../middleware/session';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export const projectRouter = new Hono<{
  Bindings: Env;
  Variables: RequestVariables;
}>();

projectRouter.use('*', sessionMiddleware);
projectRouter.use('*', rateLimitMiddleware);

projectRouter.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const result = await c.env.DB.prepare(
    `SELECT id, user_id, name, created_at
     FROM projects
     WHERE user_id = ?
     ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<ProjectRow>();

  return c.json(ok(result.results ?? []), 200);
});

projectRouter.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const rawBody: unknown = await c.req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(rawBody);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return c.json(err(message, 400), 400);
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const project: ProjectRow = {
    id: generateProjectId(),
    user_id: userId,
    name: parsed.data.name,
    created_at: createdAt,
  };

  await c.env.DB.prepare(
    'INSERT INTO projects (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(project.id, project.user_id, project.name, project.created_at)
    .run();

  return c.json(ok(project), 201);
});

projectRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const projectId = c.req.param('id');
  const project = await c.env.DB.prepare(
    `SELECT id, user_id, name, created_at
     FROM projects
     WHERE id = ?
       AND user_id = ?
     LIMIT 1`
  )
    .bind(projectId, userId)
    .first<ProjectRow>();

  if (!project) {
    return c.json(err('Project not found', 404), 404);
  }

  return c.json(ok(project), 200);
});

projectRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const projectId = c.req.param('id');
  const project = await c.env.DB.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1'
  )
    .bind(projectId, userId)
    .first<{ id: string }>();

  if (!project) {
    return c.json(err('Project not found', 404), 404);
  }

  await c.env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
    .bind(projectId, userId)
    .run();

  return c.json(ok({ deleted: true }), 200);
});