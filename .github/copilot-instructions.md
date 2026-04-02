# WatchLLM — Copilot Engineering Context

## What We Are Building
WatchLLM is an agent reliability platform. Not a logger. Not a dashboard.
It breaks AI agents on purpose, records execution as a directed graph,
and lets engineers replay and fork from any failure node.

## Stack (memorize this)
- Frontend: Next.js 14 App Router → Cloudflare Pages (apps/web/)
- API: Hono.js on Cloudflare Workers (apps/workers/api/)
- Orchestrator: CF Workers + CF Queue (apps/workers/orchestrator/)
- Chaos: CF Workers (apps/workers/chaos/)
- DB: Cloudflare D1 (SQLite, raw SQL only, no ORM)
- Storage: Cloudflare R2 (gzip JSON trace graphs)
- Cache: Cloudflare KV (rate limiting, session)
- Auth: Better Auth (GitHub OAuth, runs on Workers)
- Payments: Stripe
- Secrets: Doppler only — never in code

## ID Convention (NEVER deviate)
All IDs: nanoid (21 chars) + prefix
usr_ → users
prj_ → projects
agt_ → agents
sim_ → simulations
run_ → sim_runs
key_ → api_keys

Generated ONLY via apps/workers/api/src/lib/id.ts helpers.
Never call nanoid() directly in route handlers.

## API Response Shape (ALWAYS this, NEVER deviate)
Success: { data: T, error: null }
Failure: { data: null, error: { message: string, code: number } }
Helpers: ok(data) and err(message, code) from src/lib/response.ts

## HTTP Status Codes
200 success | 201 created | 400 bad input | 401 unauth
403 forbidden | 404 not found | 429 rate limited | 500 server error

## TypeScript Rules
- strict: true, noImplicitAny: true — no exceptions
- NEVER use `any`. Use `unknown` + type guard if needed.
- No non-null assertions (!) without prior null check
- Zod for ALL request validation at API boundary
- All Worker bindings typed via Env interface in src/types/env.ts

## Database Rules
- Raw D1 SQL only. No ORM. No query builders.
- All SQL in /migrations files ONLY — never inline in application code
- All queries parameterized — never string-concatenated
- Multi-table writes: always use D1 transactions
- Index every foreign key column (already in migrations)
- All DB columns: snake_case
- All timestamps: Unix seconds integer — never ISO strings

## File/Naming Rules
- Files: kebab-case (user-router.ts, chaos-worker.ts)
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- DB columns: snake_case
- Env vars: SCREAMING_SNAKE_CASE

## Security Rules
- API keys: bcrypt hash in D1, never store plaintext, show full key once only
- All webhook endpoints: verify Stripe signature before ANY processing
- CORS: locked to watchllm.dev in production, open in dev
- Rate limiting via KV: key = "rl:{user_id}:{hour}", value = request count
- No secrets in source code ever

## Worker Boundaries (DO NOT cross these)
- api-worker: HTTP routes, auth, D1 reads/writes only
- orchestrator-worker: CF Queue consumer, fans out attack runs
- chaos-worker: single attack run execution, writes to R2 and D1

## Shared Types
All types live in packages/types/src/index.ts
Import as: import type { X } from '@watchllm/types'
Never redefine types that exist there

## Attack Categories (exact strings)
prompt_injection | tool_abuse | hallucination | context_poisoning
infinite_loop | jailbreak | data_exfiltration | role_confusion

## Severity Scoring
- Rule-based first (fast, no LLM): destructive keywords, PII, prompt leak, loops
- If rule flags: severity = max(rule_score, 0.7)
- LLM judge (CF AI llama): { severity: float, verdict: string }
- Final: max(rule_score, judge_score)

## Tier Limits
free:  5 sim/mo, 3 categories, 7d history, no replay, no fork
pro:   100 sim/mo, all categories, 90d, replay ✓, fork ✓
team:  500 sim/mo, all categories, 365d, replay ✓, fork ✓, 10 users

## Design System (frontend)
background: #080808 | surface: #0f0f0f | surface-raised: #161616
border: rgba(255,255,255,0.08) | accent: #00C896
text-primary: #f0f0f0 | text-secondary: #888888
danger: #ff4444 | warning: #f59e0b
Font: Geist. Mono: Geist Mono.
No shadcn. No MUI. No Chakra. Build raw Tailwind.
Max border-radius: 8px (pills: 9999px)
No Framer Motion in Phase 1. CSS transitions 150ms ease only.

## What NOT to build
- Not a general observability platform
- Not LangSmith/Langfuse — no passive monitoring
- No metrics dashboards, no uptime monitoring
- No prompt management
- No ORM ever

## Cardinal Rules (if you violate these, restart)
1. No logic in React components — components render, hooks handle logic
2. No raw SQL outside /migrations
3. No secrets in code
4. No `any` in TypeScript
5. No frontend fetches that bypass the API worker
6. No Cloudflare binding accessed outside the Worker that owns it
7. Never define a type that already exists in @watchllm/types