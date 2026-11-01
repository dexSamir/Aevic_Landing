# Direct Google OAuth: controlled activation

## Decision

Use the existing `AEVIC_GOOGLE_PROVIDER=direct` implementation. No new authentication system, account migration or runtime provider change is needed. Local source review and fixture tests support this implementation; live Google credentials, deployed settings, database constraints and end-to-end Google login must still be verified before production activation. No production environment, provider, DNS or database configuration was changed by this task.

## Architecture and focused security review

- `server/config.ts` selects `direct` (default) or `supabase` only when `AEVIC_GOOGLE_ENABLED=true`. Direct requires server-only client credentials. The exact callback is derived from `PUBLIC_SITE_URL`; there is no separate callback override.
- `server/auth/google-routes.ts` initiates a Google authorization-code flow with S256 PKCE and random state/nonce. State is stored as a digest and bound to a separate HttpOnly, SameSite=Lax browser cookie. Production uses Secure `__Host-` cookies. The authorization record expires after ten minutes and is atomically deleted before exchange, preventing callback replay. Changing providers during a pending flow fails closed; users must restart sign-in.
- `server/auth/google-provider.ts` exchanges the code server-side at Google's fixed token endpoint, supplying the client secret, PKCE verifier and exact callback. ID tokens require an RS256 signature using Google's fixed JWKS endpoint, Google issuer, correct audience/authorized party, expiry, issuance-time bound, matching nonce, verified email and nonempty Google subject. Invalid/expired codes cannot establish a session. No secret or provider token is returned to frontend bundles.
- `server/auth/supabase-google.ts` obtains the same Google `identity_data.sub`; direct uses Google's signed `sub`. `google_identities.subject` therefore remains the mapping key across providers, not Supabase's user UUID and not email. Retain the existing OAuth client and database. Existing linked users reuse their accounts even if their email changes. A new subject matching an existing email enters explicit password-based linking; MFA is also enforced. It is never silently linked on verified email alone.
- New-account creation is serialized with registration's advisory lock; identity linking uses the existing transaction, account locks and uniqueness constraints. Live constraints were not inspected. The fixture continuity test verifies no account/identity insert for a linked subject switching providers; it is not a live database migration proof.
- `completeGoogle` preserves the existing homepage (`/`) redirect, including after continuation. It does not use caller-supplied return hints as arbitrary redirects. Frontend `googleOAuthRedirect` only admits Google's fixed authorize endpoint or the original Supabase project endpoint.
- The existing MFA challenge precedes session issuance. `platform-tokens.ts` issues fresh sessions and random refresh tokens; refresh rotation is serialized, reuse revokes the session family, and credential/MFA/session state is checked. Legacy sessions remain supported according to the existing `AEVIC_SESSION_MODE`. Keep that mode unchanged during this provider switch. These are AEVIC sessions, separate from the Google ID token.
- Same-origin checks protect start/complete mutations; callback is protected by state/browser binding. Remember preference is signed and retained through MFA continuation. Logout clears pending OAuth state and continues to the existing session logout handler.

No confirmed takeover, open-redirect or validation-bypass issue was found in these paths. Do not interpret local review as verification of live provider settings. Runtime code was deliberately retained; changes in this task are the explicit example provider configuration, exchange/continuity/security regression tests and this activation guide.

## Google Cloud settings

In the Google Cloud project owning the **existing client used by Supabase**, open Google Auth Platform → Clients → the **Web application** client:

1. Add this exact Authorized redirect URI (no trailing slash):
   `https://aevic-esports.netlify.app/api/auth/google/callback`
2. Retain the existing Supabase redirect URI:
   `https://nmjjibifcuzjlsvfcaaz.supabase.co/auth/v1/callback`
3. Copy that client's ID and secret privately into Netlify's server environment. Do not paste secrets into this document, chat, screenshots or `VITE_*` variables.
4. No new Authorized JavaScript origin is required by this implementation: it performs top-level authorization navigation and a backend code exchange, not the browser Google Identity Services SDK. Keep any origins needed by other integrations.
5. For a controlled staging test, separately add the exact stable staging origin plus `/api/auth/google/callback`. Set staging `PUBLIC_SITE_URL` to that same origin. Avoid ephemeral callback URLs or wildcard Google redirect URIs. Local testing with the existing Netlify dev origin uses `http://localhost:8888/api/auth/google/callback` only if explicitly registered for development.

Google Auth Platform → Branding:

- App name: **AEVIC Esports**; upload the AEVIC logo.
- User support email / Developer contact information: monitored project-owner addresses.
- Homepage: `https://aevic-esports.netlify.app`; privacy: `https://aevic-esports.netlify.app/privacy`; terms: `https://aevic-esports.netlify.app/terms`.
- Verify the actual site/domain ownership through Search Console and use the authorized domain Google accepts for this site. Do not claim ownership of the shared `netlify.app` parent. If Google requires an owned custom domain for branding verification, finish that separate domain setup before promising branded display.
- Review Audience/testing users and publishing status; submit branding for verification. A saved draft is not published verified branding.

Direct OAuth removes the Supabase authorize/callback hop from this sign-in path. Google's exact account-chooser text remains controlled by its branding and verification policies. References: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Google branding](https://support.google.com/cloud/answer/15549049).

## Netlify configuration — prepare, do not activate automatically

In the AEVIC site's Project configuration → Environment variables, use the **Functions** scope and the intended deploy context. `PUBLIC_SITE_URL` specifically requires **both Builds and Functions**, as documented in `netlify.toml`, because the build also validates the public origin. Do not copy production credentials/database access into untrusted deploy previews. Keep Google credentials server-only; do not expose them through Vite definitions. Where granular scopes are unavailable, ensure variables are available to Functions and never use public prefixes. See [Netlify environment scopes and deploy behavior](https://docs.netlify.com/build/functions/environment-variables/).

| Variable | Production value when activation is approved |
| --- | --- |
| `AEVIC_GOOGLE_ENABLED` | `true` |
| `AEVIC_GOOGLE_PROVIDER` | `direct` |
| `PUBLIC_SITE_URL` | `https://aevic-esports.netlify.app` |
| `GOOGLE_CLIENT_ID` | Existing authorized Web application client ID; server-side |
| `GOOGLE_CLIENT_SECRET` | Matching client secret; Functions scope, secret value |
| `AEVIC_DATABASE_URL` | Existing value, unchanged |
| `AEVIC_SESSION_SECRET` / existing `ADMIN_SERVER_KEY` fallback | Existing secret, unchanged; at least 32 characters |
| `AEVIC_SESSION_MODE` and any transition cutoff | Existing values, unchanged |
| `SUPABASE_URL`, publishable key and other Supabase settings | Existing values, unchanged; still used for non-OAuth application functions |

`VITE_PUBLIC_SITE_URL` remains the existing public metadata origin. There is no `VITE_GOOGLE_CLIENT_SECRET` and no `GOOGLE_CALLBACK_URL` setting. `.env.example` now documents provider selection but still has Google disabled; editing that template does not activate production.

## Activation gate and rollback

1. Privately record the current provider, enable flag and deploy ID for rollback. Preserve all existing provider configuration and credentials. Confirm the Google flow/identity tables and their existing constraints are present; no schema changes are required here. The existing `scripts/inspect-google-readiness.mjs` can inspect metadata read-only when run by an authorized operator with the intended environment. It reports presence/metadata, not live login success; do not run it against an unintended database.
2. Add the new callback to the existing Google client while retaining the Supabase callback. Test on a controlled, stable staging deployment with isolated test data containing an existing Google subject mapping. Do not use a preview wired to production accounts as an isolated test.
3. Complete an actual live Google sign-in on that staging environment: new user, previously linked user, email/password account linking, MFA, remembered and non-remembered sessions, logout/refresh and expected `/` navigation. Verify linked users retain the same internal account ID and no duplicate identity/account rows appear. Test cancellation and superseded callback handling. Inspect network destinations without retaining codes, tokens or cookies: authorization must go to `accounts.google.com`, then the application callback, with no Supabase `/auth/v1/authorize` or `/auth/v1/callback` hop.
4. Only after these checks, an authorized operator sets the production values above and creates the deployment required for the environment change. No activation/deployment was performed in this task. Existing AEVIC sessions should remain valid because session secrets/protocols and account mappings are unchanged. In-flight OAuth flows from the old provider must restart; do not relax the provider mismatch guard.
5. Perform a controlled production smoke test and inspect sanitized error rates. Keep both Google callback URIs until migration is confirmed stable.
6. Rollback: restore `AEVIC_GOOGLE_PROVIDER=supabase` (or the exact recorded previous setting), retain its existing configuration and callback, then redeploy with that environment. If code also needs rollback, restore the recorded deploy together with the correct environment; rolling back a deploy alone is not a substitute for verifying its environment. Keep identity/account rows and session secrets untouched. Users with in-flight direct flows restart sign-in. If a rollback cannot restore a verified provider, temporarily set `AEVIC_GOOGLE_ENABLED=false`; email/password login remains available.

## Executed validation (local fixtures, 1 November 2026)

- Server: 91 tests passed across `google-provider`, new `google-exchange`, `google-routes`, `google-registration`, `supabase-google`, `session-lifecycle`, `token-config`, `token-transport` and `captain` suites. After adding two provider-selection configuration cases, `token-config` passed all five cases: **93 unique server tests passed** overall.
- Components: **8 passed** across Google auth UI, redirect allowlist and auth-return tests.
- Browser: **8 passed** across login/register × direct/Supabase × desktop/mobile Chromium. Provider navigation was intercepted with fixtures; this was not a live Google flow.
- `npm run lint`, `npm run build` and `git diff --check`: passed. Build included TypeScript, prerendering and public-output secret scanning. Existing Vite asset-placeholder warnings appeared during transformation; build completed successfully.
- Requested behaviors covered: new registration, linked login and cross-provider identity continuity, explicit existing-account linking, bad state/browser binding, invalid code and claims, replay, MFA gating, session refresh/logout, remember behavior and existing homepage redirect.
- No live OAuth, Google Console, Netlify environment, production database constraint, brand-verification or DNS check was performed. A controlled live test remains the activation gate, not an inferred success from these fixture tests.

Task changes: `.env.example`; `tests/server/google-exchange.test.ts`; migration/browser-binding regression additions in `tests/server/google-routes.test.ts`; provider-selection cases in `tests/server/token-config.test.ts`; this document. Earlier UI/recovery changes in the working tree were preserved.
