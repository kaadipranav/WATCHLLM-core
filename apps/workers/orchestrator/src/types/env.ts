import type { D1Database, Fetcher, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  TRACES: R2Bucket;
  KV: KVNamespace;
  CHAOS_WORKER: Fetcher;
  ENVIRONMENT: string;
}
