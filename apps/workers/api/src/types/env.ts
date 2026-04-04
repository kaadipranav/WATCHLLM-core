import type { D1Database, KVNamespace, Queue, R2Bucket } from '@cloudflare/workers-types';
import type { SimulationQueueMessage } from '@watchllm/types';

export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  TRACES: R2Bucket;
  KV: KVNamespace;
  SIMULATION_QUEUE: Queue<SimulationQueueMessage>;

  // Secrets (injected via Doppler -> wrangler secret put)
  BETTER_AUTH_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  // Payment provider toggle
  PAYMENT_PROVIDER: 'stripe' | 'razorpay';

  // Stripe (used when PAYMENT_PROVIDER=stripe)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Razorpay (used when PAYMENT_PROVIDER=razorpay)
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RAZORPAY_PLAN_PRO: string;
  RAZORPAY_PLAN_TEAM: string;

  SENTRY_DSN: string;
  CF_ACCOUNT_ID: string;

  // Vars
  ENVIRONMENT: string;
}
