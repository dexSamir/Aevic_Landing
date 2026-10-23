# Navigation changes and Netlify environment audit — 23 October 2026

## Audit scope and limits

Inspected repository runtime configuration, Netlify Functions (including the separate `public-context` function), Google direct and Supabase PKCE providers, platform/admin authentication, token sessions and MFA, email delivery, media storage, build configuration, dynamic social settings, and environment preparation scripts. Local environment/import files were inspected for variable names only. No secret values are recorded here. No production settings were changed.

No authenticated Netlify management connection or Netlify CLI was available in this workspace. Therefore the deployed variable inventory, per-context values and Builds/Functions scopes are **not verified**. The table is a code-backed removal decision guide, not a claim that production settings were inspected. No currently deployed variable can be unconditionally certified for removal.

Important local drift: `.env` has no `AEVIC_GOOGLE_PROVIDER` entry; the existing ignored `.netlify/captain.production.env` contains neither Google enablement nor provider selection. These local artifacts are not evidence of the working production configuration. Re-importing them as authoritative configuration could disable Google or revert to direct-provider defaults. `scripts/prepare-netlify-env.mjs` defaults a missing provider to `direct`, explicitly preserves direct Google credentials for rollback, and requires SMTP and Supabase storage settings even if an alternate provider is configured. The script was not run or changed.

## Removal table

“After verification” means confirm the stated conditions in every relevant Netlify context and Functions scope, preserve any desired rollback credentials securely, and verify the working flow before removing configuration manually. Required secrets must remain server-side, never under `VITE_`.

| Variable | Required? | Reason | Safe to remove? |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Only direct Google OAuth | `readConfig` reads it only when enabled with `direct`; Supabase branch does not access it. Public Google identifier, but backend configuration. | **After verification:** `AEVIC_GOOGLE_PROVIDER=supabase` everywhere Google is enabled; retain securely for direct-provider rollback. |
| `GOOGLE_CLIENT_SECRET` | Only direct Google OAuth | Same branch; used by direct token exchange. Server-only secret. Supabase's own Google provider credentials must remain configured in Supabase. | **After verification:** same conditions as client ID; removal from Netlify does not mean deleting the Google credential in Supabase/Google. |
| `AEVIC_GOOGLE_ENABLED` | Yes for Google login | Only literal `true` enables either provider. Missing disables Google. | **Keep.** |
| `AEVIC_GOOGLE_PROVIDER` | Yes for Supabase login | Defaults to `direct`, not Supabase. Also enforces provider consistency when consuming pending flows. | **Keep** as `supabase` for the current setup. |
| `PUBLIC_SITE_URL` | Yes in production | Callback origin, CSRF/security origin, reset links and canonical build URLs. Required with Netlify context. Builds **and** Functions scopes. | **Keep.** |
| `AEVIC_DATABASE_URL` | Yes for platform/auth | Private database connection for accounts, ownership, admin, OAuth state, sessions and competition state. Supabase identity does not replace this database. Server-only secret. | **Keep.** |
| `SUPABASE_URL` | Yes | Main server requires it; Supabase Auth and existing storage depend on it. Also provides build media origin fallback. URL is public configuration. | **Keep.** |
| `SUPABASE_PUBLISHABLE_KEY` | Yes, preferred key | Server PKCE exchange and Supabase public reads. Separate public-context function also recognizes it. Public key, not a signing/service-role secret. | **Keep.** |
| `SUPABASE_ANON_KEY` | Optional legacy key fallback | Main server uses it only if publishable key absent. Separate public-context function does **not** use this unprefixed fallback. | **After verification:** publishable key present in all runtime contexts. |
| `VITE_SUPABASE_URL` | Optional fallback | Separate public-context function and build media-origin fallback. No browser OAuth client depends on it. | **After verification:** unprefixed URL available to both Functions and Builds; media origin/CSP unchanged. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional fallback | Separate public-context function fallback when unprefixed key absent. | **After verification:** unprefixed publishable key available in Functions. |
| `VITE_SUPABASE_ANON_KEY` | Legacy dynamic fallback | Separate public-context recognizes it, but current build allowlist rejects this browser key. It is not completely unused. | **After verification:** replace fallback with `SUPABASE_PUBLISHABLE_KEY`; do not add to Builds. |
| `AEVIC_SESSION_SECRET` | Yes, preferred signing/encryption key | Platform sessions, Google continuation and MFA depend on the resolved server secret; token/Google modes require ≥32 characters. | **Keep.** Do not rotate as part of cleanup. Server-only. |
| `ADMIN_SERVER_KEY` | Optional legacy fallback | Despite its name, only used as fallback for `AEVIC_SESSION_SECRET`; admin credentials are database-backed. | **After verification:** explicit session secret already provides the exact existing resolved key in all contexts. Otherwise **keep** to avoid session/MFA breakage. Server-only. |
| `AEVIC_SESSION_MODE` | Operational choice | Defaults to `legacy`; removing `tokens` or `transition` changes security/session behavior. | **Keep** the deployed selection. |
| `AEVIC_LEGACY_SESSION_UNTIL` | Required in transition mode | Parsed only for `transition`; controls legacy-session acceptance deadline. | **After verification:** mode is not `transition`, and rollback does not require it. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Required for configured SMTP delivery | A complete SMTP configuration is preferred over Resend for reset email. User may also be sender fallback. Password is server-only. | **Keep** if SMTP is the working provider. Alternate removal needs delivery verification. |
| `SMTP_PORT` | Optional default | Defaults to 587; 465 changes implicit TLS behavior. Preparation script requires it. | **After verification:** current delivery uses 587 and preparation workflow is addressed; otherwise keep. |
| `EMAIL_FROM` | Optional with SMTP sender fallback | Defaults to SMTP user. Required for valid Resend delivery unless an appropriate fallback sender exists. | **After verification:** fallback is the desired authorized sender and delivery passes. |
| `RESEND_API_KEY` | Optional alternate mail provider | Used only when complete valid SMTP configuration is absent. SMTP failure does not trigger automatic Resend failover. Server-only. | **After verification:** SMTP is valid and verified; preserve if desired for rollback. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for Supabase media uploads | Existing storage branch requires a service-role/secret key for bucket checks and uploads. Not required solely for Google PKCE. Server-only privileged secret. | **Keep** if existing storage is used; otherwise verify Cloudinary cutover and remaining tools/rollback. |
| `TEAM_MEDIA_BUCKET` | Required for Supabase uploads | Existing uploader requires it alongside storage key. Preparation script requires it. | **Keep** for existing storage; otherwise after verified complete cutover. |
| `TEAM_MEDIA_PROVIDER` | Required if selecting Cloudinary | Defaults to `existing`; deleting `cloudinary` changes upload provider. | **Keep** current selection. Explicit `existing` is optional only after verification. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required when provider is Cloudinary | Read only in Cloudinary branch; migration/verification scripts also use config. API secret must remain server-only. | **After verification:** provider is `existing`, no migration/rollback requires them, uploads verified. Otherwise keep. |
| `VITE_API_BASE_URL` | Optional | Defaults to `/api`; existing API adapter uses it. | **After verification:** currently `/api` and all clients/build contexts rely on same-origin API. |
| `VITE_PUBLIC_SITE_URL` | Optional canonical fallback | Build derives browser canonical from `PUBLIC_SITE_URL`; if both set they must agree. Local development can use this independently. | **After verification:** `PUBLIC_SITE_URL` is provided in Builds; retain local workflow if needed. |
| `VITE_PUBLIC_MEDIA_ORIGIN` | Optional explicit media origin | Build CSP and public media allowlist derive from this, otherwise Supabase URLs. | **After verification:** fallback origin matches deployed media; otherwise keep. |
| `VITE_INDEXABLE_DEPLOYMENT` | Build-derived, not a runtime input | `vite.config.ts` defines it from canonical URL and deployment context; source consumes the derived value. | **Safe to remove now from manually managed build settings** under this repository's build pipeline; no need to set manually. Deployed presence unknown. |
| `VITE_AEVIC_{INSTAGRAM,TIKTOK,YOUTUBE,X,LINKEDIN,DISCORD,TWITCH,WEBSITE}_URL` | Optional public content | Dynamically indexed in `src/config/publicSocial.ts`; drives footer/public links and reset-email links. | **Keep** desired links. Removing changes content; these are not unused variables. |
| `REQUIRE_PUBLIC_SITE_URL` | Optional build guard | Forces canonical validation outside production context. | **Keep** if used as intentional CI guard; otherwise after verification. |
| `NODE_VERSION` | Build toolchain | Declared in netlify.toml for Node 22. | **Keep.** |
| `CONTEXT`, `NETLIFY`, `URL`, `COMMIT_REF`, `DEPLOY_ID`, `AWS_LAMBDA_FUNCTION_NAME`, `NODE_ENV` | Platform/toolchain metadata | Dynamic build checks, indexing, logging and runtime environment. | **Keep platform-managed values.** Not cleanup candidates. |
| Other Netlify variables not available locally | Unknown | No live Netlify inventory; scripts also have test/migration-only inputs (e.g. `PG_BIN`, `AEVIC_TEST_*`, `AUDIT_*`). | **Unknown — requires further investigation.** Do not infer unused from absence in one config file. |

No known authentication, signing, admin, mail or storage variable is completely unused across runtime and tooling. Some are conditional fallbacks. `VITE_INDEXABLE_DEPLOYMENT` is redundant as a manually set build input; its browser value is generated. Nothing was deleted.

## Evidence

- `server/config.ts`: provider selection, URL validation, fallback keys, email and storage settings.
- `server/auth/google-routes.ts`, `google-provider.ts`, `supabase-google.ts`: provider-specific PKCE and verified identity exchange; direct provider retained.
- `server/auth/platform-tokens.ts`, `server/platform/context.ts`, `mfa.ts`, `totp.ts`: sessions, authorization and MFA.
- `server/captain/email.ts`, `media.ts`, `server/services/cloudinary.ts`: delivery and upload provider selection.
- `netlify/functions/api.ts`, `public-context.ts`, `_shared/publicContext.ts`: actual entry points and dynamic fallback reads.
- `scripts/build-config.mjs`, `vite.config.ts`, `netlify.toml`, `scripts/prepare-netlify-env.mjs`, `src/config/publicSocial.ts`: build scopes, defaults, import/rollback behavior and dynamic names.

## UI implementation

- Shared `MobileBottomNav` for public/auth, regular account, and ready team workspace layouts, below 1024px. Public layout reuses `PublicSessionContext`; protected layouts reuse the guard's verified session, team workspace uses its current snapshot, account layout uses a cached team query. No auth endpoints or authorization rules changed.
- Exactly four existing public routes plus a profile disclosure. Account/team routes select profile; public nested routes use existing route-manifest navigation families. Existing SVG icon family, gold selection, dark surface, 44px+ targets.
- Actual active-team artwork via existing `TeamLogo`, including safe URL handling and missing/broken-image initials. Other identities use an account icon. Guest, no-team, owner and admin-account states are conditional; no admin-only actions enter this mobile menu.
- Upward nonmodal profile navigation supports outside dismissal, Escape with focus restoration, natural Tab traversal, close on route selection and desktop resize. Existing team-management drawer and administrator navigation retained, including the original administrator login header (no bottom bar).
- Fixed bar plus a final document slot (92px + safe area) allows footer final content to scroll clear without observers or scroll listeners. Existing footer content-visibility must finish layout before automated end-of-document measurements.
- Dashboard informational descriptions removed from rendering only; dynamic values, permission checks, destinations and carousel unchanged. Compact cards use muted blue, violet, teal and amber surfaces, with related tones for other dynamic card types.
- Desktop nav links and moving indicator use outer radius minus the actual 4px inset. Existing padding, typography and states retained.
- Removed the mobile footer's sole vertical border rule, preserving its padding and all desktop styling.

## Verification results

- **Passed:** configured lint (TypeScript app and server checks), production build, 98 prerendered shells, public-output secret scan, and `git diff --check`.
- **Passed:** 25 domain tests; existing component suite 410/410; new mobile navigation unit tests 12/12; focused final card/navigation run 15/15 (includes two existing radar tests and one new unavailable/incomplete-state test). The combined component coverage is 423 tests, with the final additions run separately.
- **Passed:** 13 new browser tests, including all requested widths (320, 360, 375, 390, 430, 768, 1024, 1440), geometry, footer clearance, keyboard carousel, profile interactions/logout, no-team accounts, radius geometry and dedicated administrator navigation. The expanded footer test traverses all 40 shared-footer route patterns from the manifest (using representative fixture IDs for dynamic paths), checks vertical separators and overflow, and checks final-content clearance. The standalone wrapped experience has no shared footer and is excluded.
- **Passed:** 26 existing mobile browser journeys, updated for the replacement navigation, across mouse/touch projects. Includes short viewport form focus, retained team drawer/share editor, and owner sign-in, roster and preferences flows.
- **Passed:** final browser rerun of menu and dashboard after adjusting compact logo fallback typography (2/2). Visually inspected actual browser captures of menu, dashboard and footer.
- **Server suite:** 237 passed, 1 failed, 5 skipped. Existing failure: `tests/server/integration.test.ts:44`, “filters standings by tournament and excludes draft results”, expected a standings row but received `[]`. Confirmed independently by rerunning that file (8 passed, same failure). Server code, its fixtures and the failing test were not changed by this task.
- **Skipped:** five real-driver lifecycle tests require the explicit `AEVIC_RELIABILITY_LOCAL` environment. No live Google consent, production admin sign-in, actual email/upload operations or production environment changes were performed. Browser account flows use existing HTTP fixtures; server provider tests use isolated fixtures.
- **Build warning:** Vite reports unresolved `__VITE_ASSET__...` placeholders in existing asset references. Build and postbuild checks complete successfully; no asset-generation changes were made in this task.

## Modified files

Implementation:
- `src/layouts/MobileBottomNav.tsx` (new)
- `src/layouts/mobile-bottom-nav.css` (new)
- `src/layouts/layouts.tsx`
- `src/layouts/AuthLayout.tsx`
- `src/layouts/ProtectedRoute.tsx`
- `src/layouts/WorkspaceLayouts.tsx`
- `src/pages/routes/AccountLayout.tsx`
- `src/components/team/TeamIntelligence.tsx`
- `src/styles/public-shell.css`
- `src/styles/cinematic-footer.css`
- `src/styles/team-insights.css`

Verification and documentation:
- `tests/mobile-bottom-nav.test.tsx` (new)
- `tests/global-design/bottom-navigation.spec.ts` (new)
- `tests/global-design/mobile-experience.spec.ts`
- `tests/global-design/mobile-remediation.spec.ts`
- `tests/radar-refinement.test.tsx`
- `docs/audits/2026-10-23-navigation-environment.md` (new)

## Git and deployment

The working tree was clean before implementation. Nothing was staged, committed or pushed. No branches were changed and no Git mutation commands were run. No deployment was triggered; no Netlify environment variables were added, deleted or modified. The owner retains all Git and deployment operations.
