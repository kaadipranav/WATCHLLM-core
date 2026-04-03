import {
  ALL_ATTACK_CATEGORIES,
  TIER_LIMITS,
  type AttackCategory,
  type SimulationConfig,
  type SimulationQueueMessage,
  type SimulationRow,
  type SimRunRow,
  type TraceGraph,
} from '@watchllm/types';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { generateRunId, generateSimulationId } from '../lib/id';
import { err, ok } from '../lib/response';
import { apiKeyMiddleware } from '../middleware/api-key';
import type { AuthVariables } from '../middleware/auth-types';
import { sessionMiddleware } from '../middleware/session';
import type { Env } from '../types/env';

interface RouterEnv {
  Bindings: Env;
  Variables: AuthVariables;
}

interface AgentOwnershipRow {
  id: string;
}

interface CountRow {
  total: number | string;
}

interface SimulationRunKeyRow {
  trace_r2_key: string | null;
}

interface SimulationRunLookupRow {
  id: string;
  category: string;
  trace_r2_key: string | null;
}

const attackCategoryEnum = z.enum(
  ALL_ATTACK_CATEGORIES as [AttackCategory, ...AttackCategory[]],
);

const createSimulationSchema = z.object({
  agent_id: z.string(),
  categories: z.array(attackCategoryEnum).min(1),
  threshold: z.string().optional(),
});

const forkSchema = z.object({
  fork_from_node: z.string(),
  new_input: z.unknown(),
});

const simulationRouter = new Hono<RouterEnv>();

// Tries session first, falls back to API key.
const flexAuth: MiddlewareHandler<RouterEnv> = async (c, next) => {
  const hasApiKey = c.req.header('X-WatchLLM-Api-Key');
  if (hasApiKey) {
    return apiKeyMiddleware(c, next);
  }
  return sessionMiddleware(c, next);
};

simulationRouter.use('*', flexAuth);

function monthStartUnix(now: Date): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

function parseSimulationConfig(configJson: string): SimulationConfig {
  try {
    const parsed = JSON.parse(configJson) as unknown;
    if (typeof parsed === 'object' && parsed !== null && 'categories' in parsed) {
      const categories = (parsed as { categories?: unknown }).categories;
      const threshold = (parsed as { threshold?: unknown }).threshold;
      if (Array.isArray(categories)) {
        const validCategories = categories.filter((category): category is AttackCategory =>
          typeof category === 'string' &&
          (ALL_ATTACK_CATEGORIES as string[]).includes(category),
        );

        return {
          categories: validCategories,
          threshold: typeof threshold === 'string' ? threshold : null,
        };
      }
    }
  } catch {
    // Fallback to safe defaults if malformed JSON sneaks in.
  }

  return { categories: [], threshold: null };
}

function normalizeSimulationRow(row: {
  id: string;
  agent_id: string;
  user_id: string;
  parent_sim_id: string | null;
  fork_node_id: string | null;
  status: string;
  config_json: string;
  summary_r2_key: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
}): SimulationRow {
  return {
    id: row.id as SimulationRow['id'],
    agent_id: row.agent_id as SimulationRow['agent_id'],
    user_id: row.user_id as SimulationRow['user_id'],
    parent_sim_id: row.parent_sim_id as SimulationRow['parent_sim_id'],
    fork_node_id: row.fork_node_id,
    status: row.status as SimulationRow['status'],
    config_json: row.config_json,
    summary_r2_key: row.summary_r2_key,
    started_at: row.started_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}

function normalizeSimRunRow(row: {
  id: string;
  simulation_id: string;
  category: string;
  status: string;
  severity: number | null;
  trace_r2_key: string | null;
  created_at: number;
}): SimRunRow {
  return {
    id: row.id as SimRunRow['id'],
    simulation_id: row.simulation_id as SimRunRow['simulation_id'],
    category: row.category as AttackCategory,
    status: row.status as SimRunRow['status'],
    severity: row.severity,
    trace_r2_key: row.trace_r2_key,
    created_at: row.created_at,
  };
}

async function gunzipToText(buffer: ArrayBuffer): Promise<string> {
  const decompressionStream = new DecompressionStream('gzip');
  const decompressed = new Blob([buffer]).stream().pipeThrough(decompressionStream);
  return new Response(decompressed).text();
}

async function fetchGraphFromR2(env: Env, key: string): Promise<TraceGraph | null> {
  const object = await env.TRACES.get(key);
  if (!object) {
    return null;
  }

  const arrayBuffer = await object.arrayBuffer();
  const payload = await gunzipToText(arrayBuffer);
  const parsed = JSON.parse(payload) as unknown;

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  return parsed as TraceGraph;
}

function upgradeRequired(feature: 'graph_replay' | 'fork_replay') {
  return {
    data: null,
    error: {
      message: 'Upgrade required for this feature',
      code: 403,
      upgrade_required: true,
      feature,
    },
  };
}

simulationRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsedBody = createSimulationSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(err('Invalid request body', 400), 400);
  }

  const userId = c.get('userId');
  const userTier = c.get('userTier');

  const ownership = await c.env.DB.prepare(
    `SELECT a.id AS id
     FROM agents a
     INNER JOIN projects p ON p.id = a.project_id
     WHERE a.id = ? AND p.user_id = ?
     LIMIT 1`,
  )
    .bind(parsedBody.data.agent_id, userId)
    .first<AgentOwnershipRow>();

  if (!ownership) {
    return c.json(err('Agent not found', 404), 404);
  }

  const monthStart = monthStartUnix(new Date());
  const simulationCount = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total
     FROM simulations
     WHERE user_id = ? AND created_at >= ?`,
  )
    .bind(userId, monthStart)
    .first<CountRow>();

  const currentCount = Number(simulationCount?.total ?? 0);
  const tierLimits = TIER_LIMITS[userTier];
  if (currentCount >= tierLimits.simulations_per_month) {
    return c.json(err('Simulation limit reached for your tier', 403), 403);
  }

  const requestedCategories = parsedBody.data.categories;
  if (tierLimits.categories !== 'all') {
    if (requestedCategories.length > tierLimits.categories.length) {
      return c.json(err('Selected categories are not allowed for your tier', 403), 403);
    }

    const allowed = new Set(tierLimits.categories);
    const hasDisallowed = requestedCategories.some((category) => !allowed.has(category));
    if (hasDisallowed) {
      return c.json(err('Selected categories are not allowed for your tier', 403), 403);
    }
  }

  const categories = Array.from(new Set(requestedCategories));
  const now = Math.floor(Date.now() / 1000);
  const simulationId = generateSimulationId();
  const config: SimulationConfig = {
    categories,
    threshold: parsedBody.data.threshold ?? null,
  };

  const runInserts = categories.map((category) => {
    const runId = generateRunId();
    return c.env.DB.prepare(
      `INSERT INTO sim_runs (
        id, simulation_id, category, status, severity, trace_r2_key, created_at
      ) VALUES (?, ?, ?, 'pending', NULL, NULL, ?)`,
    ).bind(runId, simulationId, category, now);
  });

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO simulations (
        id, agent_id, user_id, parent_sim_id, fork_node_id, status,
        config_json, summary_r2_key, started_at, completed_at, created_at
      ) VALUES (?, ?, ?, NULL, NULL, 'queued', ?, NULL, NULL, NULL, ?)`,
    ).bind(simulationId, parsedBody.data.agent_id, userId, JSON.stringify(config), now),
    ...runInserts,
  ]);

  const queueMessage: SimulationQueueMessage = {
    simulation_id: simulationId,
    agent_id: parsedBody.data.agent_id as SimulationQueueMessage['agent_id'],
    user_id: userId,
    categories,
    config_json: JSON.stringify(config),
  };

  await c.env.SIMULATION_QUEUE.send(queueMessage);

  const simulation: SimulationRow = {
    id: simulationId,
    agent_id: parsedBody.data.agent_id as SimulationRow['agent_id'],
    user_id: userId,
    parent_sim_id: null,
    fork_node_id: null,
    status: 'queued',
    config_json: JSON.stringify(config),
    summary_r2_key: null,
    started_at: null,
    completed_at: null,
    created_at: now,
  };

  return c.json(ok(simulation), 201);
});

simulationRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = await c.env.DB.prepare(
    `SELECT id, agent_id, user_id, parent_sim_id, fork_node_id, status,
            config_json, summary_r2_key, started_at, completed_at, created_at
     FROM simulations
     WHERE user_id = ?
     ORDER BY created_at DESC`,
  )
    .bind(userId)
    .all<{
      id: string;
      agent_id: string;
      user_id: string;
      parent_sim_id: string | null;
      fork_node_id: string | null;
      status: string;
      config_json: string;
      summary_r2_key: string | null;
      started_at: number | null;
      completed_at: number | null;
      created_at: number;
    }>();

  const simulations = (rows.results ?? []).map(normalizeSimulationRow);
  return c.json(ok(simulations), 200);
});

simulationRouter.get('/:id', async (c) => {
  const simulationId = c.req.param('id');
  const userId = c.get('userId');

  const simulation = await c.env.DB.prepare(
    `SELECT id, agent_id, user_id, parent_sim_id, fork_node_id, status,
            config_json, summary_r2_key, started_at, completed_at, created_at
     FROM simulations
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
  )
    .bind(simulationId, userId)
    .first<{
      id: string;
      agent_id: string;
      user_id: string;
      parent_sim_id: string | null;
      fork_node_id: string | null;
      status: string;
      config_json: string;
      summary_r2_key: string | null;
      started_at: number | null;
      completed_at: number | null;
      created_at: number;
    }>();

  if (!simulation) {
    return c.json(err('Simulation not found', 404), 404);
  }

  const runs = await c.env.DB.prepare(
    `SELECT id, simulation_id, category, status, severity, trace_r2_key, created_at
     FROM sim_runs
     WHERE simulation_id = ?
     ORDER BY created_at ASC`,
  )
    .bind(simulationId)
    .all<{
      id: string;
      simulation_id: string;
      category: string;
      status: string;
      severity: number | null;
      trace_r2_key: string | null;
      created_at: number;
    }>();

  return c.json(
    ok({
      simulation: normalizeSimulationRow(simulation),
      runs: (runs.results ?? []).map(normalizeSimRunRow),
    }),
    200,
  );
});

simulationRouter.get('/:id/replay', async (c) => {
  const userTier = c.get('userTier');
  if (!TIER_LIMITS[userTier].graph_replay) {
    return c.json(upgradeRequired('graph_replay'), 403);
  }

  const simulationId = c.req.param('id');
  const userId = c.get('userId');

  const simulation = await c.env.DB.prepare(
    'SELECT id FROM simulations WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(simulationId, userId)
    .first<{ id: string }>();

  if (!simulation) {
    return c.json(err('Simulation not found', 404), 404);
  }

  const runKeys = await c.env.DB.prepare(
    `SELECT trace_r2_key
     FROM sim_runs
     WHERE simulation_id = ? AND trace_r2_key IS NOT NULL`,
  )
    .bind(simulationId)
    .all<SimulationRunKeyRow>();

  const traceGraphs: TraceGraph[] = [];
  for (const run of runKeys.results ?? []) {
    if (!run.trace_r2_key) {
      continue;
    }

    const graph = await fetchGraphFromR2(c.env, run.trace_r2_key);
    if (graph) {
      traceGraphs.push(graph);
    }
  }

  return c.json(ok(traceGraphs), 200);
});

simulationRouter.post('/:id/fork', async (c) => {
  const userTier = c.get('userTier');
  if (!TIER_LIMITS[userTier].fork_replay) {
    return c.json(upgradeRequired('fork_replay'), 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsedBody = forkSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(err('Invalid request body', 400), 400);
  }

  const simulationId = c.req.param('id');
  const userId = c.get('userId');

  const originalSimulation = await c.env.DB.prepare(
    `SELECT id, agent_id, user_id, parent_sim_id, fork_node_id, status,
            config_json, summary_r2_key, started_at, completed_at, created_at
     FROM simulations
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
  )
    .bind(simulationId, userId)
    .first<{
      id: string;
      agent_id: string;
      user_id: string;
      parent_sim_id: string | null;
      fork_node_id: string | null;
      status: string;
      config_json: string;
      summary_r2_key: string | null;
      started_at: number | null;
      completed_at: number | null;
      created_at: number;
    }>();

  if (!originalSimulation) {
    return c.json(err('Simulation not found', 404), 404);
  }

  const runRows = await c.env.DB.prepare(
    `SELECT id, category, trace_r2_key
     FROM sim_runs
     WHERE simulation_id = ? AND trace_r2_key IS NOT NULL
     ORDER BY created_at ASC`,
  )
    .bind(simulationId)
    .all<SimulationRunLookupRow>();

  let matchedGraph: TraceGraph | null = null;
  for (const run of runRows.results ?? []) {
    if (!run.trace_r2_key) {
      continue;
    }

    const graph = await fetchGraphFromR2(c.env, run.trace_r2_key);
    if (!graph) {
      continue;
    }

    const hasNode = graph.nodes.some((node) => node.id === parsedBody.data.fork_from_node);
    if (hasNode) {
      matchedGraph = graph;
      break;
    }
  }

  if (!matchedGraph) {
    return c.json(err('Fork node not found in simulation trace', 404), 404);
  }

  const originalConfig = parseSimulationConfig(originalSimulation.config_json);
  const forkCategory = matchedGraph.category;

  const newSimulationId = generateSimulationId();
  const newRunId = generateRunId();
  const now = Math.floor(Date.now() / 1000);

  const forkConfig: SimulationConfig = {
    categories: [forkCategory],
    threshold: originalConfig.threshold,
    fork: {
      parent_sim_id: originalSimulation.id as SimulationRow['id'],
      fork_from_node: parsedBody.data.fork_from_node,
      new_input: parsedBody.data.new_input,
    },
  };

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO simulations (
        id, agent_id, user_id, parent_sim_id, fork_node_id, status,
        config_json, summary_r2_key, started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 'queued', ?, NULL, NULL, NULL, ?)`,
    ).bind(
      newSimulationId,
      originalSimulation.agent_id,
      userId,
      originalSimulation.id,
      parsedBody.data.fork_from_node,
      JSON.stringify(forkConfig),
      now,
    ),
    c.env.DB.prepare(
      `INSERT INTO sim_runs (
        id, simulation_id, category, status, severity, trace_r2_key, created_at
      ) VALUES (?, ?, ?, 'pending', NULL, NULL, ?)`,
    ).bind(newRunId, newSimulationId, forkCategory, now),
  ]);

  const queueMessage: SimulationQueueMessage = {
    simulation_id: newSimulationId,
    agent_id: originalSimulation.agent_id as SimulationQueueMessage['agent_id'],
    user_id: userId,
    categories: [forkCategory],
    config_json: JSON.stringify(forkConfig),
  };

  await c.env.SIMULATION_QUEUE.send(queueMessage);

  const createdSimulation: SimulationRow = {
    id: newSimulationId,
    agent_id: originalSimulation.agent_id as SimulationRow['agent_id'],
    user_id: userId,
    parent_sim_id: originalSimulation.id as SimulationRow['parent_sim_id'],
    fork_node_id: parsedBody.data.fork_from_node,
    status: 'queued',
    config_json: JSON.stringify(forkConfig),
    summary_r2_key: null,
    started_at: null,
    completed_at: null,
    created_at: now,
  };

  return c.json(ok(createdSimulation), 201);
});

export default simulationRouter;
