import type {
  AgentRow,
  ApiKeyRow,
  ProjectRow,
  SimRunRow,
  SimulationRow,
  TraceGraph,
} from '@watchllm/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.watchllm.dev/api/v1';

type ApiEnvelope<T> = {
  data: T;
  error: { message: string; code: number } | null;
};

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    tier?: 'free' | 'pro' | 'team';
  };
  expires_at?: number;
}

export class ApiRequestError extends Error {
  public readonly code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
  }
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const envelope = await parseEnvelope<T>(response);

  if (!response.ok || envelope?.error) {
    const message = envelope?.error?.message ?? `Request failed with status ${response.status}`;
    const code = envelope?.error?.code ?? response.status;
    throw new ApiRequestError(message, code);
  }

  if (!envelope) {
    throw new ApiRequestError('Invalid API response', 500);
  }

  return envelope.data;
}

function requestServer<T>(path: string, cookieHeader: string): Promise<T> {
  return request<T>(path, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
}

export const api = {
  auth: {
    session: () => request<AuthSession | null>('/auth/session'),
    sessionServer: (cookieHeader: string) => requestServer<AuthSession | null>('/auth/session', cookieHeader),
  },
  simulations: {
    list: () => request<SimulationRow[]>('/simulations'),
    get: (id: string) => request<SimulationRow & { runs: SimRunRow[] }>(`/simulations/${id}`),
    replay: (id: string) => request<TraceGraph[]>(`/simulations/${id}/replay`),
    fork: (id: string, body: { fork_from_node: string; new_input: unknown }) =>
      request<SimulationRow>(`/simulations/${id}/fork`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  projects: {
    list: () => request<ProjectRow[]>('/projects'),
    create: (name: string) =>
      request<ProjectRow>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
  },
  agents: {
    list: (projectId: string) => request<AgentRow[]>(`/agents?project_id=${encodeURIComponent(projectId)}`),
  },
  keys: {
    list: () => request<ApiKeyRow[]>('/keys'),
    create: (name?: string) =>
      request<{ id: string; full_key: string; key_prefix: string; created_at: number }>('/keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    revoke: (id: string) => request<{ revoked: boolean }>(`/keys/${id}`, { method: 'DELETE' }),
  },
};