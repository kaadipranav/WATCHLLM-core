# Changelog

All notable changes to WatchLLM are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Full dashboard UI: Projects, Agents, Simulations, API Keys, Billing pages
- Landing page with live terminal animation cycling all 8 attack categories
- ⌘K command palette with keyboard navigation across all dashboard pages
- Simulation detail page with severity bars, per-run trace graph viewer
- Tier-gate modals for Pro/Team features (replay, fork)
- Auto-polling simulation status every 5s while status is `running`
- API key create with show-once reveal UX and copy-to-clipboard
- Billing page with live subscription status and checkout flow
- GitHub Actions CI: typecheck (web + API worker) + Next.js static export build
- `SECURITY.md` with coordinated disclosure policy
- `CONTRIBUTING.md` with internal development guide

### Fixed
- TypeScript build error: `NAV` items typed as discriminated union causing `item.exact` access failure on Cloudflare Pages
- Invalid CSS property `line: 0` on button style in projects page
- `generateStaticParams()` added to `/dashboard/simulations/[id]` for `output: 'export'` compatibility
- Terminal animation closure bug causing undefined `.color` access in strict mode

### Changed
- Design tokens aligned to `copilot-instructions.md` spec: accent `#00C896`, bg `#080808`, danger `#ff4444`, border-radius max 8px, transitions 150ms ease
- Fonts switched from Space Grotesk + IBM Plex Mono → Inter + JetBrains Mono (Geist-equivalent, available in Next.js 14.2.x)
- `globals.css` font import removed (Google Fonts `@import`); fonts now loaded via `next/font/google` with CSS variable injection

---

## [0.2.0] — 2026-04-11

### Added
- Backend: full simulation lifecycle API (create, queue, orchestrate, run attacks, score, store to R2)
- 8 attack categories implemented in Chaos worker
- Fork-and-replay endpoint (Pro/Team tier)
- Better Auth integration with GitHub OAuth
- Stripe + Razorpay billing with tier management
- Cloudflare D1 schema with migrations
- R2 trace graph storage (gzip JSON)

---

## [0.1.0] — 2026-03-15

### Added
- Initial monorepo scaffold: `apps/web`, `apps/workers/api`, `packages/types`
- Landing page with waitlist
- Basic Hono API worker structure
- D1 initial schema migration
