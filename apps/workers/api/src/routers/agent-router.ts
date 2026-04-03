import type { AgentRow, UserId } from '@watchllm/types';
import { Hono } from 'hono';
import { z } from 'zod';
import { generateAgentId } from '../lib/id';
import { err, ok } from '../lib/response';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { sessionMiddleware } from '../middleware/session';
import type { RequestVariables } from '../types/context';
import type { Env } from '../types/env';

const createAgentSchema = z.object({
  project_id: z.string(),
  name: z.string().min(1).max(100),
  endpoint_url: z.string().url().optional(),
  framework: z.enum(['langchain', 'crewai', 'openai', 'autogen', 'custom']).optional(),
});

const listAgentsSchema = z.object({
  project_id: z.string(),
});

async function userOwnsProject(env: Env, projectId: string, userId: UserId): Promise<boolean> {
  const row = await env.DB.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1'
  )
    .bind(projectId, userId)
    .first<{ id: string }>();

  return !!row;
}

export const agentRouter = new Hono<{
  Bindings: Env;
  Variables: RequestVariables;
}>();

agentRouter.use('*', sessionMiddleware);
agentRouter.use('*', rateLimitMiddleware);

agentRouter.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const parsed = listAgentsSchema.safeParse(c.req.query());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid query';
    return c.json(err(message, 400), 400);
  }

  const projectId = parsed.data.project_id;
  const ownsProject = await userOwnsProject(c.env, projectId, userId);
  if (!ownsProject) {
    return c.json(err('Forbidden', 403), 403);
  }

  const result = await c.env.DB.prepare(
    `SELECT a.id, a.project_id, a.name, a.endpoint_url, a.framework, a.created_at
     FROM agents a
     JOIN projects p ON p.id = a.project_id
     WHERE p.id = ?
       AND p.user_id = ?
     ORDER BY a.created_at DESC`
  )
    .bind(projectId, userId)
    .all<AgentRow>();

  return c.json(ok(result.results ?? []), 200);
});

agentRouter.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const rawBody: unknown = await c.req.json().catch(() => null);
  const parsed = createAgentSchema.safeParse(rawBody);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return c.json(err(message, 400), 400);
  }

  const ownsProject = await userOwnsProject(c.env, parsed.data.project_id, userId);
  if (!ownsProject) {
    return c.json(err('Forbidden', 403), 403);
  }

  if (!parsed.data.project_id.startsWith('prj_')) {
    return c.json(err('Invalid project id', 400), 400);
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const agent: AgentRow = {
    id: generateAgentId(),
    project_id: parsed.data.project_id as AgentRow['project_id'],
    name: parsed.data.name,
    endpoint_url: parsed.data.endpoint_url ?? null,
    framework: parsed.data.framework ?? null,
    created_at: createdAt,
  };

  await c.env.DB.prepare(
    `INSERT INTO agents (
       id,
       project_id,
       name,
       endpoint_url,
       framework,
       created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      agent.id,
      agent.project_id,
      agent.name,
      agent.endpoint_url,
      agent.framework,
      agent.created_at
    )
    .run();

  return c.json(ok(agent), 201);
});

agentRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const agentId = c.req.param('id');
  const agent = await c.env.DB.prepare(
    `SELECT a.id, a.project_id, a.name, a.endpoint_url, a.framework, a.created_at
     FROM agents a
     JOIN projects p ON p.id = a.project_id
     WHERE a.id = ?
       AND p.user_id = ?
     LIMIT 1`
  )
    .bind(agentId, userId)
    .first<AgentRow>();

  if (!agent) {
    return c.json(err('Agent not found', 404), 404);
  }

  return c.json(ok(agent), 200);
});

agentRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const agentId = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT a.id
     FROM agents a
     JOIN projects p ON p.id = a.project_id
     WHERE a.id = ?
       AND p.user_id = ?
     LIMIT 1`
  )
    .bind(agentId, userId)
    .first<{ id: string }>();

  if (!existing) {
    return c.json(err('Agent not found', 404), 404);
  }

  await c.env.DB.prepare(
    `DELETE FROM agents
     WHERE id = ?
       AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`
  )
    .bind(agentId, userId)
    .run();

  return c.json(ok({ deleted: true }), 200);
});