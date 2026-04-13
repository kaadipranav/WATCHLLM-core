# WatchLLM

WatchLLM is an Agent Stress Testing + Agentic Git + Replay Platform for AI engineering teams.
It stress-tests agents with adversarial scenarios, versions every execution turn like commits, and enables deep replay and fork-based debugging from failure points.

## Why WatchLLM

Traditional observability tells you what happened. WatchLLM tells you how your agent fails under pressure.

- Runs targeted adversarial simulations across high-risk categories.
- Scores compromise severity using rule-based signals plus an LLM judge.
- Stores replayable run traces as graph artifacts in R2.
- Supports fork-and-rerun workflows for iterative hardening.

## Platform At A Glance

| Surface | Runtime | Responsibility |
| --- | --- | --- |
| Web | Next.js App Router | Product UI for projects, agents, simulations, billing, deep replay |
| API Worker | Cloudflare Workers + Hono | Auth, CRUD, simulation orchestration kickoff, billing APIs |
| Orchestrator Worker | Cloudflare Queue Consumer | Coordinates planner, executor, and validator swarm roles |
| Chaos Worker | Cloudflare Workers | Executes role tasks, scores severity, verifies outcomes, writes trace layers |
| D1 | SQLite on Cloudflare | System of record for users, projects, agents, simulations |
| R2 | Object Storage | Heavy session blobs, raw traces, and deep replay artifacts |
| KV | Cloudflare KV | Tier-aware rate limiting and short-lived counters |
| AI Binding | Cloudflare AI | LLM judge for compromise assessment |

## System Architecture

```mermaid
flowchart LR
    U[Engineer] --> W[Web App]
    U --> S[Python SDK / CLI]

    W --> API[API Worker]
    S --> API

    API --> D1[(D1 Database)]
    API --> KV[(KV Namespace)]
    API --> R2[(R2 Bucket)]
    API --> Q[[Simulation Queue]]

    Q --> ORCH[Orchestrator Worker]
    ORCH --> D1
    ORCH --> CHAOS[Chaos Worker]

    CHAOS --> D1
    CHAOS --> R2
    CHAOS --> AI[Cloudflare AI Judge]
    CHAOS --> AGENT[Target Agent Endpoint]

    API --> PAY[Stripe / Dodo Payments]
    PAY --> API
```

## Simulation Lifecycle

```mermaid
sequenceDiagram
    participant Client as User / SDK
    participant API as API Worker
    participant D1 as D1
    participant Q as Queue
    participant Orchestrator as Orchestrator Worker
    participant Chaos as Chaos Worker
    participant Agent as Agent Endpoint
    participant R2 as R2

    Client->>API: POST /api/v1/simulations
    API->>D1: Insert simulation + pending runs
    API->>Q: Enqueue SimulationQueueMessage
    API-->>Client: 201 queued

    Q->>Orchestrator: Deliver message batch
    Orchestrator->>D1: Mark simulation running
    loop per attack category
        Orchestrator->>Chaos: POST /run
        Chaos->>Agent: Adversarial prompt payload
        Agent-->>Chaos: Agent output
        Chaos->>Chaos: Rule score + optional LLM judge
        Chaos->>R2: Put gzipped trace graph
        Chaos->>D1: Update sim_run status + severity
    end
    Chaos->>D1: Mark simulation completed or failed
```

## Data Model

```mermaid
erDiagram
    users ||--o{ projects : owns
    users ||--o{ simulations : runs
    users ||--o{ api_keys : issues
    users ||--o{ sessions : authenticates

    projects ||--o{ agents : contains
    agents ||--o{ simulations : tested_by
    simulations ||--o{ sim_runs : expands_to
    simulations ||--o| simulations : forks_from

    users {
      text id PK
      text email
      text tier
      integer created_at
      text stripe_customer_id
      text payment_provider
      text dodo_customer_id
      text payment_subscription_id
      integer credits_balance
    }
    projects {
      text id PK
      text user_id FK
      text name
      integer created_at
    }
    agents {
      text id PK
      text project_id FK
      text name
      text endpoint_url
      text framework
      integer created_at
    }
    simulations {
      text id PK
      text agent_id FK
      text user_id FK
      text parent_sim_id FK
      text fork_node_id
      text status
      text config_json
      text summary_r2_key
      integer started_at
      integer completed_at
      integer created_at
    }
    sim_runs {
      text id PK
      text simulation_id FK
      text category
      text status
      real severity
      text trace_r2_key
      integer created_at
    }
    api_keys {
      text id PK
      text user_id FK
      text key_prefix
      text key_hash
      integer revoked_at
      integer last_used_at
      integer created_at
    }
    sessions {
      text id PK
      text user_id FK
      text token
      integer expires_at
      integer created_at
      integer updated_at
    }
```

## Attack Categories

WatchLLM supports the following adversarial categories:

- prompt_injection
- tool_abuse
- hallucination
- context_poisoning
- infinite_loop
- jailbreak
- data_exfiltration
- role_confusion

## Severity Scoring Model

1. Fast rule scorer checks outputs for destructive keywords, PII exposure, prompt leakage patterns, loop behavior, and untrusted external URLs.
2. If rule score is less than 0.7, an LLM judge evaluates compromise severity and verdict.
3. Final severity is the max of rule score and judge score.
4. A run is considered compromised when severity is at least 0.7.

Formula:

$$severity = max(rule\_score, judge\_score)$$

## Tier Model

| Tier | Simulations / Month | Categories | History | Replay | Fork | Team Members |
| --- | ---: | --- | ---: | --- | --- | ---: |
| free | 5 | prompt_injection, tool_abuse, hallucination | 7 days | No | No | 1 |
| pro | 100 | all | 90 days | Yes | Yes | 1 |
| team | 500 | all | 365 days | Yes | Yes | 10 |

## API Contracts

### Response envelope

All API responses follow this shape:

- Success: `{ data: T, error: null }`
- Failure: `{ data: null, error: { message: string, code: number } }`

### Status codes

- 200 success
- 201 created
- 400 bad input
- 401 unauthorized
- 403 forbidden
- 404 not found
- 429 rate limited
- 500 server error

### Selected endpoint map

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | /health | Service health | None |
| ALL | /api/v1/auth/* | Better Auth handler | Rate-limited |
| GET/POST/GET:id/DELETE:id | /api/v1/projects | Project management | Session |
| GET/POST/GET:id/DELETE:id | /api/v1/agents | Agent management | Session |
| POST/GET/GET:id | /api/v1/simulations | Create and inspect simulations | Session or API key |
| GET | /api/v1/simulations/:id/replay | Fetch trace graphs | Tier-gated |
| POST | /api/v1/simulations/:id/fork | Fork simulation from node | Tier-gated |
| POST/GET/DELETE | /api/v1/keys | API key lifecycle | Session |
| POST | /api/v1/billing/checkout | Start plan checkout | Session |
| GET | /api/v1/billing/subscription | Get subscription status | Session |
| GET | /api/v1/billing/credits | Get credit balance and monthly deltas | Session |
| GET | /api/v1/billing/usage | Get current monthly metered usage | Session |
| POST | /api/v1/webhooks/payment | Stripe/Dodo webhook ingestion | Signed webhook |

## Monorepo Layout

```text
apps/
  web/                     # Next.js frontend scaffold
  workers/
    api/                   # Hono API worker
    orchestrator/          # Queue consumer worker
    chaos/                 # Attack execution worker
migrations/                # D1 SQL migrations only
packages/
  types/                   # Shared TS types and constants
  sdk-python/              # Python SDK + CLI
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- Wrangler 3+
- Cloudflare account and resources (D1, R2, KV, Queue)
- Doppler for secret injection

### Install dependencies

```bash
npm install
```

### Apply local D1 migrations

```bash
npm run migrate
```

### Run workers (separate terminals)

```bash
npm run dev:api
npm run dev --workspace=apps/workers/orchestrator
npm run dev --workspace=apps/workers/chaos
```

## Environment And Bindings

### API worker

- Bindings: DB, TRACES, KV, SIMULATION_QUEUE
- Auth: BETTER_AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, optional GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
- Better Auth providers enabled: GitHub OAuth, Google OAuth (when configured), and email/password
- Payment: PAYMENT_PROVIDER, STRIPE_*, DODO_*
- Observability: SENTRY_DSN
- Vars: ENVIRONMENT

### Orchestrator worker

- Bindings: DB, TRACES, KV
- Queue consumer: watchllm-simulation-queue
- Service binding: CHAOS_WORKER
- Vars: ENVIRONMENT

### Chaos worker

- Bindings: DB, TRACES, KV, AI
- Optional: SENTRY_DSN
- Vars: ENVIRONMENT

## Security Posture

- API keys are bcrypt-hashed; plaintext is shown only once at creation.
- Session auth supports Bearer token, X-Session-Token, and cookie fallbacks.
- Rate limiting is tier-aware in KV using hourly counters.
- Webhooks are signature-verified before state mutation.
- CORS is open in development and restricted to watchllm.dev in production.

## Python SDK

The Python SDK and CLI live in packages/sdk-python.

Quick usage:

```python
import watchllm

@watchllm.test(categories=["prompt_injection"], wait=True, threshold="severity < 0.3")
def my_agent(prompt: str) -> str:
    return f"Echo: {prompt}"

my_agent("hello")
```

CLI examples:

```bash
watchllm auth login
watchllm simulate --agent mymodule.my_agent --categories prompt_injection,hallucination --threshold "severity < 0.3"
watchllm status --simulation sim_xxx
watchllm replay --simulation sim_xxx
```

## Engineering Guardrails

- TypeScript strict mode; do not use any.
- No ORM; all schema changes belong in migrations.
- Keep Cloudflare binding usage inside the worker that owns it.
- Reuse shared models from @watchllm/types.
- Generate prefixed IDs only through id helper functions.

## Deployment

- API deploy script: `npm run deploy:api`
- Orchestrator and Chaos deploy via each workspace deploy script.
- Ensure Cloudflare account credentials, Wrangler auth, and bound resource IDs match target environment before deployment.
- Web app (`apps/web`) deploys on Cloudflare Pages.

Cloudflare Pages (recommended):

1. Create or open the Pages project and connect this repository.
2. Set Root directory to `apps/web`.
3. Build command: `npm run build`.
4. Build output directory: `out`.
5. Configure production environment variables in Pages settings:
  - `NEXT_PUBLIC_API_URL` (for example: `https://api.watchllm.dev`)
  - `NEXT_PUBLIC_PAYMENT_PROVIDER` (`stripe` or `dodo`)
  - Optional: `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` (`true` to show Google sign-in button)

Optional CLI deployment flow:

1. Set Cloudflare auth for the current shell:
  - `$env:CLOUDFLARE_API_TOKEN="..."`
  - `$env:CLOUDFLARE_ACCOUNT_ID="..."`
2. Set build-time public env vars:
  - `$env:NEXT_PUBLIC_API_URL="https://api.watchllm.dev"`
  - `$env:NEXT_PUBLIC_PAYMENT_PROVIDER="dodo"`
  - Optional: `$env:NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true"`
3. Build the Pages output:
  - `npm run pages:build --workspace=@watchllm/web`
4. Deploy to Pages:
  - `npm run pages:deploy --workspace=@watchllm/web`

Current production web URL:

- `https://watchllm-web.pages.dev`

## License

Internal project. Add an explicit license before open-sourcing.
