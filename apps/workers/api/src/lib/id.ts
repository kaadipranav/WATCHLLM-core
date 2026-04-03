import { nanoid } from 'nanoid';
import type { AgentId, KeyId, ProjectId, RunId, SimulationId, UserId } from '@watchllm/types';

export const generateUserId = (): UserId => `usr_${nanoid()}` as UserId;
export const generateProjectId = (): ProjectId => `prj_${nanoid()}` as ProjectId;
export const generateAgentId = (): AgentId => `agt_${nanoid()}` as AgentId;
export const generateSimulationId = (): SimulationId => `sim_${nanoid()}` as SimulationId;
export const generateRunId = (): RunId => `run_${nanoid()}` as RunId;
export const generateKeyId = (): KeyId => `key_${nanoid()}` as KeyId;
