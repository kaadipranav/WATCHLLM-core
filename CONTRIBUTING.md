# Contributing to WatchLLM

WatchLLM is a closed-source product. External contributions are not accepted at this time.

If you are an internal team member, read the engineering context in `.github/copilot-instructions.md` before writing any code.

## Internal Development

### Prerequisites
- Node.js 22+
- npm workspaces
- Doppler CLI (for secret management — never `.env` files in production)
- Wrangler CLI (`npm install -g wrangler`)

### Setup

```bash
git clone git@github.com:watchllm/core.git
cd core
npm install
```

```bash
# Run web dev server (http://localhost:3000)
npm run dev:web

# Run API worker dev server (http://localhost:8787)
npm run dev:api
```

### Engineering Rules (non-negotiable)

1. Read `.github/copilot-instructions.md` — these rules are absolute
2. `strict: true` TypeScript — no `any`, no `!` without null checks
3. Raw D1 SQL only — no ORMs, no query builders
4. All secrets via Doppler — nothing in `.env` or source
5. Zod validation at every API boundary
6. All IDs via `apps/workers/api/src/lib/id.ts` helpers only

### Branch Strategy

- `main` — production, protected, auto-deploys on push
- `dev` — staging environment
- Feature branches: `feat/<name>`, bug fixes: `fix/<name>`

### PR Requirements

- Must pass CI (typecheck + build)
- At least one reviewer approval
- No merge if build fails

### Commit Convention

```
feat: add fork-and-replay UI
fix: correct severity threshold comparison
chore: update wrangler version
```
