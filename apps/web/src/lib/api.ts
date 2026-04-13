// Central typed API client for WatchLLM
// All calls go to the Cloudflare Worker at NEXT_PUBLIC_API_URL
// Auth is cookie-based (Better Auth session)

import type {
  AgentRow,
  ApiKeyRow,
  ApiResponse,
  ProjectRow,
  SimRunRow,
  SimulationRow,
  TraceGraph,
  AttackCategory,
} from '@watchllm/types';

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.watchllm.dev').replace(/\/$/, '');
const CANONICAL_AUTH_BASE = 'https://api.watchllm.dev';

function getAuthBase(): string {
  if (typeof window === 'undefined') {
    return BASE;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return BASE;
  }

  // Prevent OAuth state mismatches caused by workers.dev/API domain mixing.
  return CANONICAL_AUTH_BASE;
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return res.json() as Promise<ApiResponse<T>>;
}

// ---------- Auth ----------

export const auth = {
  /** Redirect to GitHub OAuth */
  loginWithGitHub() {
    const authBase = getAuthBase();
    const callbackURL = '/dashboard';

    // Use top-level redirect to avoid extension/adblock fetch blocking.
    window.location.href = `${authBase}/api/v1/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(callbackURL)}`;
  },

  async getSession(): Promise<{ user: { id: string; email: string; name?: string; image?: string } | null }> {
    const authBase = getAuthBase();
    const res = await fetch(`${authBase}/api/v1/auth/get-session`, {
      credentials: 'include',
    });
    if (!res.ok) return { user: null };
    const data = (await res.json()) as { user?: { id: string; email: string; name?: string; image?: string } };
    return { user: data.user ?? null };
  },

  async signOut(): Promise<void> {
    const authBase = getAuthBase();
    await fetch(`${authBase}/api/v1/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// ---------- Projects ----------

export const projects = {
  list(): Promise<ApiResponse<ProjectRow[]>> {
    return request<ProjectRow[]>('/api/v1/projects');
  },
  get(id: string): Promise<ApiResponse<ProjectRow>> {
    return request<ProjectRow>(`/api/v1/projects/${id}`);
  },
  create(name: string): Promise<ApiResponse<ProjectRow>> {
    return request<ProjectRow>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return request<{ deleted: boolean }>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------- Agents ----------

export const agents = {
  list(project_id: string): Promise<ApiResponse<AgentRow[]>> {
    return request<AgentRow[]>(`/api/v1/agents?project_id=${project_id}`);
  },
  get(id: string): Promise<ApiResponse<AgentRow>> {
    return request<AgentRow>(`/api/v1/agents/${id}`);
  },
  create(data: {
    project_id: string;
    name: string;
    endpoint_url?: string;
    framework?: 'langchain' | 'crewai' | 'openai' | 'autogen' | 'custom';
  }): Promise<ApiResponse<AgentRow>> {
    return request<AgentRow>('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return request<{ deleted: boolean }>(`/api/v1/agents/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------- Simulations ----------

export type SimulationDetail = {
  simulation: SimulationRow;
  runs: SimRunRow[];
};

export const simulations = {
  list(): Promise<ApiResponse<SimulationRow[]>> {
    return request<SimulationRow[]>('/api/v1/simulations');
  },
  get(id: string): Promise<ApiResponse<SimulationDetail>> {
    return request<SimulationDetail>(`/api/v1/simulations/${id}`);
  },
  create(data: {
    agent_id: string;
    categories: AttackCategory[];
    threshold?: string;
  }): Promise<ApiResponse<SimulationRow>> {
    return request<SimulationRow>('/api/v1/simulations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  replay(id: string): Promise<ApiResponse<TraceGraph[]>> {
    return request<TraceGraph[]>(`/api/v1/simulations/${id}/replay`);
  },
  fork(
    id: string,
    data: { fork_from_node: string; new_input: unknown }
  ): Promise<ApiResponse<SimulationRow>> {
    return request<SimulationRow>(`/api/v1/simulations/${id}/fork`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ---------- API Keys ----------

export type ApiKeyListItem = Pick<
  ApiKeyRow,
  'id' | 'key_prefix' | 'name' | 'expires_at' | 'last_used_at' | 'created_at'
>;

export type CreateKeyResponse = {
  id: string;
  full_key: string;
  prefix: string;
  name: string | null;
  created_at: number;
};

export const apiKeys = {
  list(): Promise<ApiResponse<ApiKeyListItem[]>> {
    return request<ApiKeyListItem[]>('/api/v1/keys');
  },
  create(name?: string): Promise<ApiResponse<CreateKeyResponse>> {
    return request<CreateKeyResponse>('/api/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  revoke(id: string): Promise<ApiResponse<{ revoked: boolean }>> {
    return request<{ revoked: boolean }>(`/api/v1/keys/${id}`, {
      method: 'DELETE',
    });
  },
};

// ---------- Billing ----------

export type CheckoutResponse = {
  provider: 'stripe' | 'dodo';
  checkout_url?: string;
  dodo_checkout_id?: string;
  credit_purchase_url?: string;
  credits_granted?: number;
  amount?: number;
  currency?: string;
};

export type SubscriptionStatus = {
  provider: 'stripe' | 'dodo';
  tier: string;
  status: 'active' | 'cancelled' | 'past_due' | 'free';
  current_period_end?: number;
  credits_balance?: number;
};

export type CreditsStatus = {
  tier: string;
  credits_balance: number;
  credited_this_month: number;
  debited_this_month: number;
};

export type UsageStatus = {
  simulation_runs: number;
  replay_storage_bytes: number;
};

export const billing = {
  checkout(tier: 'pro' | 'team'): Promise<ApiResponse<CheckoutResponse>> {
    return request<CheckoutResponse>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  },
  subscription(): Promise<ApiResponse<SubscriptionStatus>> {
    return request<SubscriptionStatus>('/api/v1/billing/subscription');
  },
  credits(): Promise<ApiResponse<CreditsStatus>> {
    return request<CreditsStatus>('/api/v1/billing/credits');
  },
  usage(): Promise<ApiResponse<UsageStatus>> {
    return request<UsageStatus>('/api/v1/billing/usage');
  },
};
