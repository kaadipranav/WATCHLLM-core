import type { MessageBatch } from '@cloudflare/workers-types';
import type { SimulationQueueMessage } from '@watchllm/types';
import type { Env } from './types/env';

export default {
  async queue(batch: MessageBatch<SimulationQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { simulation_id: simulationId, categories } = message.body;

      await env.DB.prepare(
        `UPDATE simulations
         SET status = 'running', started_at = ?
         WHERE id = ? AND status = 'queued'`,
      )
        .bind(Math.floor(Date.now() / 1000), simulationId)
        .run();

      for (const category of categories) {
        const run = await env.DB.prepare(
          `SELECT id
           FROM sim_runs
           WHERE simulation_id = ? AND category = ?
           ORDER BY created_at ASC
           LIMIT 1`,
        )
          .bind(simulationId, category)
          .first<{ id: string }>();

        if (!run) {
          continue;
        }

        const response = await env.CHAOS_WORKER.fetch('https://chaos/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            run_id: run.id,
            simulation_id: message.body.simulation_id,
            agent_id: message.body.agent_id,
            category,
          }),
        });

        if (!response.ok) {
          throw new Error(`Chaos worker failed for run ${run.id} with status ${response.status}`);
        }
      }
    }
  },
};
