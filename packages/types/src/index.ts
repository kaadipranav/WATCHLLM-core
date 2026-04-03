// --- ID Types ---
// All IDs are nanoid (21 chars) with resource prefix
export type UserId = `usr_${string}`;
export type ProjectId = `prj_${string}`;
export type AgentId = `agt_${string}`;
export type SimulationId = `sim_${string}`;
export type RunId = `run_${string}`;
export type KeyId = `key_${string}`;

// --- Enums ---
export type Tier = 'free' | 'pro' | 'team';

export type SimulationStatus = 'queued' | 'running' | 'completed' | 'failed';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type AttackCategory =
  | 'prompt_injection'
  | 'tool_abuse'
  | 'hallucination'
  | 'context_poisoning'
  | 'infinite_loop'
  | 'jailbreak'
  | 'data_exfiltration'
  | 'role_confusion';

export type NodeType =
  | 'llm_call'
  | 'tool_call'
  | 'decision'
  | 'memory_read'
  | 'memory_write'
  | 'agent_start'
  | 'agent_end';

// --- DB Row Types ---
// These mirror the D1 schema exactly. snake_case columns, Unix timestamps.
export interface UserRow {
  id: UserId;
  email: string;
  github_username: string | null;
  tier: Tier;
  created_at: number;
  stripe_customer_id: string | null;
}

export interface ProjectRow {
  id: ProjectId;
  user_id: UserId;
  name: string;
  created_at: number;
}

export interface AgentRow {
  id: AgentId;
  project_id: ProjectId;
  name: string;
  endpoint_url: string | null;
  framework: string | null;
  created_at: number;
}

export interface SimulationRow {
  id: SimulationId;
  agent_id: AgentId;
  user_id: UserId;
  status: SimulationStatus;
  config_json: string;
  summary_r2_key: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
}

export interface SimRunRow {
  id: RunId;
  simulation_id: SimulationId;
  category: AttackCategory;
  status: RunStatus;
  severity: number | null;
  trace_r2_key: string | null;
  created_at: number;
}

export interface ApiKeyRow {
  id: KeyId;
  user_id: UserId;
  key_prefix: string;
  key_hash: string;
  name: string | null;
  expires_at: number | null;
  revoked_at: number | null;
  last_used_at: number | null;
  created_at: number;
}

// --- API Response Shape ---
// All API responses follow this exact shape. No exceptions.
export type ApiSuccess<T> = { data: T; error: null };
export type ApiError = { data: null; error: { message: string; code: number } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// --- Trace Graph Types ---
export interface TraceNode {
  id: string;
  parent_id: string | null;
  type: NodeType;
  input: unknown;
  output: unknown;
  timestamp: number;
  latency_ms: number;
  tokens_used: number | null;
  cost_usd: number | null;
  metadata: Record<string, unknown>;
}

export interface TraceEdge {
  from: string;
  to: string;
}

export interface TraceGraph {
  run_id: RunId;
  simulation_id: SimulationId;
  agent_id: AgentId;
  category: AttackCategory;
  adversarial_input: string;
  started_at: number;
  ended_at: number;
  nodes: TraceNode[];
  edges: TraceEdge[];
  severity: number;
  compromised: boolean;
  judge_verdict: string;
  suggested_fix: string;
}

// --- Simulation Config ---
export interface SimulationConfig {
  categories: AttackCategory[];
  threshold: string | null;
}

// --- Tier Limits ---
export const TIER_LIMITS: Record<
  Tier,
  {
    simulations_per_month: number;
    categories: AttackCategory[] | 'all';
    history_days: number;
    graph_replay: boolean;
    fork_replay: boolean;
    team_members: number;
  }
> = {
  free: {
    simulations_per_month: 5,
    categories: ['prompt_injection', 'tool_abuse', 'hallucination'],
    history_days: 7,
    graph_replay: false,
    fork_replay: false,
    team_members: 1,
  },
  pro: {
    simulations_per_month: 100,
    categories: 'all',
    history_days: 90,
    graph_replay: true,
    fork_replay: true,
    team_members: 1,
  },
  team: {
    simulations_per_month: 500,
    categories: 'all',
    history_days: 365,
    graph_replay: true,
    fork_replay: true,
    team_members: 10,
  },
};

export const ALL_ATTACK_CATEGORIES: AttackCategory[] = [
  'prompt_injection',
  'tool_abuse',
  'hallucination',
  'context_poisoning',
  'infinite_loop',
  'jailbreak',
  'data_exfiltration',
  'role_confusion',
];
