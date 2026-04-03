import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  TRACES: R2Bucket;
  KV: KVNamespace;

  // Secrets (injected via Doppler -> wrangler secret put)
  BETTER_AUTH_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SENTRY_DSN: string;
  CF_ACCOUNT_ID: string;

  // Vars
  ENVIRONMENT: string;
}
