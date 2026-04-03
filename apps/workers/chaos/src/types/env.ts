import type { Ai, D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  TRACES: R2Bucket;
  KV: KVNamespace;
  AI: Ai;
  SENTRY_DSN: string;
  ENVIRONMENT: string;
}
