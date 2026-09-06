# AEVIC Esports — Competitive Legacy

Frontend implementation of AEVIC's PUBG Mobile tournament and team-operations platform.

## Commands

```bash
npm install
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
- Admin tournament configuration, approvals, slots/check-in, round results, announcements, blacklist and policy settings

## Current data and security state

The app uses a clearly isolated fictional mock adapter. Client route guards demonstrate navigation architecture but do not replace backend authorization. Authentication, role enforcement, team ownership, secure room credentials, persistence, uploads, audit logs, email and push delivery require production services. The service worker excludes API, auth, room, credential, message and admin requests from caching.

See [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [ARCHITECTURE.md](ARCHITECTURE.md) for the implemented product contract.
