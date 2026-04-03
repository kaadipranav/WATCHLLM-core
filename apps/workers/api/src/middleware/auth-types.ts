import type { Tier, UserId } from '@watchllm/types';

export type AuthMethod = 'session' | 'api_key';

export interface AuthVariables {
  userId: UserId;
  userTier: Tier;
  authMethod: AuthMethod;
}

export function normalizeTier(value: string): Tier {
  if (value === 'pro' || value === 'team') {
    return value;
  }
  return 'free';
}
