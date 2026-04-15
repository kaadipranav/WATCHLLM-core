// Central typed API client for WatchLLM
// Uses NEXT_PUBLIC_API_URL locally, but normalizes to api.watchllm.dev in production
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
const CANONICAL_API_BASE = 'https://api.watchllm.dev';

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

function getApiBase(): string {
  if (typeof window === 'undefined') {
    return BASE;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return BASE;
  }

  // Keep all authenticated requests on the same domain as Better Auth cookies.
  return CANONICAL_API_BASE;
}

function getAuthBase(): string {
  return getApiBase();
}

function getAuthCallbackURL(): string {
  if (typeof window === 'undefined') {
    return 'https://watchllm.dev/dashboard';
  }
  return `${window.location.origin}/dashboard`;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  const error = record.error;
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  if (error && typeof error === 'object') {
    const nested = (error as Record<string, unknown>).message;
    if (typeof nested === 'string' && nested.length > 0) {
      return nested;
    }
  }

  return null;
}

async function getAuthErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || 'Authentication failed';
  try {
    const json = (await response.json()) as unknown;
    return extractErrorMessage(json) ?? fallback;
  } catch {
    return fallback;
  }
}

function getAuthNetworkErrorMessage(error: unknown): string {
  const fallback = 'Unable to reach the authentication service. Please try again.';
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  if (message.toLowerCase().includes('failed to fetch')) {
    return fallback;
  }

  return message;
}

function loginWithSocialProvider(provider: 'github' | 'google'): void {
  if (typeof window === 'undefined') {
    return;
  }

  const authBase = getAuthBase();
  const callbackURL = getAuthCallbackURL();
  window.location.href = `${authBase}/api/v1/auth/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(callbackURL)}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${getApiBase()}${path}`, {
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
    loginWithSocialProvider('github');
  },

  /** Redirect to Google OAuth */
  loginWithGoogle() {
    loginWithSocialProvider('google');
  },

  async signInWithEmail(email: string, password: string): Promise<AuthActionResult> {
    const authBase = getAuthBase();
    const callbackURL = getAuthCallbackURL();

    try {
      const response = await fetch(`${authBase}/api/v1/auth/sign-in/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          callbackURL,
        }),
      });

      if (!response.ok) {
        return { ok: false, error: await getAuthErrorMessage(response) };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: getAuthNetworkErrorMessage(error) };
    }
  },

  async signUpWithEmail(name: string, email: string, password: string): Promise<AuthActionResult> {
    const authBase = getAuthBase();
    const callbackURL = getAuthCallbackURL();

    try {
      const response = await fetch(`${authBase}/api/v1/auth/sign-up/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          callbackURL,
        }),
      });

      if (!response.ok) {
        return { ok: false, error: await getAuthErrorMessage(response) };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: getAuthNetworkErrorMessage(error) };
    }
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
