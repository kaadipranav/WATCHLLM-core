import type { MessageBatch } from '@cloudflare/workers-types';
import type { Env } from './types/env';

export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    console.log('watchllm-orchestrator not implemented', {
      messages: batch.messages.length,
      environment: env.ENVIRONMENT,
    });
  },
};
