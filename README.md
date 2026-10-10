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

### Google login (prepared, disabled by default)

This integration uses the existing PostgreSQL account IDs and session implementation.
It does not use Supabase Auth, Firebase, or Google Cloud Identity Platform. Google’s
[setup codelab](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button)
states that the Google Cloud account/project is free; the basic OIDC flow requires no
additional paid identity product. Existing Netlify execution and database quotas still
apply. This is not a guarantee of unlimited free hosting. Request only `openid email profile`.

Before rollout (requires explicit operator approval):

1. Review `supabase/migrations/20261010184901_google_account_identity.sql`. It adds
   private Google identity/one-use flow tables, RLS, unique subject/account constraints,
   and grants matching existing server session writers. It does not alter existing rows.
   If already applied, verify schema, ownership, grants and migration history; do not
   rerun this non-idempotent migration. Otherwise apply it only through a separately
   approved database rollout. No migration runs on startup or during the build.
2. Create a Google OAuth **Web application** client. Configure consent branding,
   support contacts, home/privacy/terms URLs, audience and test users as applicable.
   Use separate test and production projects. Follow Google's
   [production policies](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)
   for domain ownership and brand verification. Testing-mode audience restrictions are
   provider settings, not a paid subscription; check the console before opening access.
3. Add the exact authorized redirect URI:
   `https://aevic-demo.netlify.app/api/auth/google/callback`.
   It must equal `PUBLIC_SITE_URL` plus `/api/auth/google/callback`.
   For a separate local client use `http://localhost:8888/api/auth/google/callback`
   if that is the configured local site origin. No browser Google SDK or JavaScript
   origin registration is needed by this server authorization-code implementation.
4. Set **server-side Netlify Functions** variables `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and keep `AEVIC_GOOGLE_ENABLED=false` for the first release.
   Keep the existing `PUBLIC_SITE_URL`, `AEVIC_DATABASE_URL`, connection port,
   `AEVIC_SESSION_SECRET`, email delivery configuration and `AEVIC_SESSION_MODE=legacy`.
   No new frontend secret or VITE variable is required. Deploy only after approval.
   Verify `/api/auth/google/status` returns `200` with `{"enabled":false}`, the Google
   button is hidden, and existing password login, sessions, MFA and logout still work.
   Keep Google activation separate from this disabled-feature deployment.
5. In a separately approved test environment, verify with a real Google test account: cancellation, linked login, matching-email
   password/MFA proof, new-team form completion, existing email verification, logout,
   expiry and browser back/replay. Repeat rotating-token checks in a separate test
   environment before any future session-mode rollout. Production Google activation
   requires separate explicit approval after these checks; keep session mode `legacy`.

The flow validates RS256 signatures using Google's fixed JWKS endpoint, issuer,
audience, authorized party, expiry, nonce and verified email, with S256 PKCE and a
browser-bound one-use state. The stable `sub` owns the association. Matching email
alone cannot link an existing account: the existing password and enabled MFA are
required. Linked login also requires enabled MFA. Google does not change AEVIC email
verification state or roles. Admin login remains its existing separate flow.

An HttpOnly SameSite=Lax cookie binds the ten-minute continuation; Google credentials
and tokens are never put in localStorage or frontend URLs. New identities are associated
inside the existing registration transaction only after form validation. Registration
still requires an AEVIC password and the normal verification email. Database constraints
reject competing associations; a failed transaction does not consume the continuation.
Expired flows are cleaned at the next OAuth start. Turning `AEVIC_GOOGLE_ENABLED=false`
hides the entry point and disables completion without affecting existing AEVIC sessions.

Local security tests use signed fixture tokens and mocked PostgreSQL/provider boundaries;
reviewed database execution and a real-provider browser test remain rollout checks.
Reference: [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect).
