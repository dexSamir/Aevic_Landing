> Captain auth, reset, team updates and media code: [implementation and activation blockers](docs/CAPTAIN_IMPLEMENTATION.md). Production remains blocked pending existing database/storage credentials and safe grants. No migrations or deployment.

> Current backend: [original production integration](docs/ORIGINAL_PRODUCTION_INTEGRATION.md). The running application reads existing `public.teams`; earlier normalized-schema, migration, claiming and staging instructions below are historical and must not be executed for this integration.

# AEVIC Esports — Competitive Legacy

AEVIC's PUBG Mobile tournament and team-operations platform: React frontend, Hono on Netlify Functions, and Supabase PostgreSQL/Auth/Storage/Realtime.

## Commands

```bash
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run preview
```

Set `PUBLIC_SITE_URL` to the canonical production origin during builds to emit absolute canonical, OpenGraph, sitemap, and robots URLs. Netlify production builds fail when it is missing. Stable public index routes are statically prerendered; dynamic profile/detail metadata still needs API-aware SSR or edge rendering. Run `npm run package:check` before preparing a release archive. Credential rotation and archive rules are documented in [SECURITY.md](SECURITY.md).

## Product areas

- Public tournament discovery, detail, leaderboard, regulations and authentication
- Team approval, tournament entry, check-in, room-release state, roster, history, messages, sharecards and settings
- Admin tournament configuration, approvals, slots/check-in, round results, announcements and moderation review; bulk approvals, timed sanctions and platform policy editing remain unavailable

## Current data and security state

Development and production use the same API adapter and Hono backend. There is no selectable mock mode or fallback. With no explicit server configuration, local API requests return SERVER_NOT_CONFIGURED (503). Six migrations define the isolated `aevic` schema, RLS and transactional competition operations. Server-managed Auth, team data, registrations, check-in, timed room access, official results, disputes, media and notifications are implemented.

Read [backend setup and release gates](docs/BACKEND_SETUP.md) for local Supabase, environment names, migrations, email templates, tests and remaining limitations. No remote database migration or deployment has been performed; live staging validation and credential rotation are still required.

See [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [ARCHITECTURE.md](ARCHITECTURE.md) for the implemented product contract.

See [feature integration inventory](docs/FEATURE_INTEGRATION_INVENTORY.md) and [implementation and verification report](docs/INTEGRATION_REPORT.md). Component and browser HTTP fixtures are test-only, not evidence of a live backend.
