import type { Tier, UserId } from '@watchllm/types';

export type RequestVariables = {
  userId?: UserId;
  userTier?: Tier;
};