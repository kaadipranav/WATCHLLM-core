# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅                 |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues privately via GitHub's Security Advisory feature:

1. Go to **Security → Advisories → Report a vulnerability** in this repository
2. Or email: **security@watchllm.dev**

Include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We will acknowledge your report within **48 hours** and provide a timeline for a fix within **7 days**.

## Scope

In scope:
- `api.watchllm.dev` (Cloudflare Worker API)
- `watchllm.dev` (Cloudflare Pages frontend)
- Authentication flows (Better Auth / GitHub OAuth)
- API key generation and validation
- Billing webhook verification

Out of scope:
- Third-party services (GitHub, Stripe, Cloudflare infrastructure)
- Social engineering attacks
- Rate limiting bypass (report but lower severity)

## Disclosure Policy

We follow coordinated disclosure. We ask that you give us 90 days to fix a vulnerability before public disclosure.

## Hall of Fame

Researchers who responsibly disclose valid vulnerabilities will be credited here (with permission).
