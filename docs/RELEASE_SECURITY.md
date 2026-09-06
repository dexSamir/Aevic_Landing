# Public frontend release boundary

The current production build exposes approved public identities and published competition data. It does not enable authentication, registration, protected operations, public player profiles, records, search, or organizational workflows without their corresponding service capability. Development fixtures are not a production fallback.

## Release procedure

1. Use Node 20 or newer. Run `npm test`, `npm run lint`, `npm run build`, and the desktop/mobile browser suite.
2. Set the owned HTTPS `PUBLIC_SITE_URL` (or matching `VITE_PUBLIC_SITE_URL`) in the deployment environment. Production deployment configuration fails without an explicit canonical origin. A local build without it remains noindex; no domain is invented.
3. Complete provider-side credential rotation, including any previously shared admin, Supabase service-role, mail, and SMTP credentials. Removing files does not revoke credentials. Historical credential-shaped assignments also require owner review. Never place privileged credentials in VITE variables.
4. Run `npm run package:check` and `npm run package:release`. Use the verified archive, never Finder or an unrestricted recursive zip. Environment files, audit workspaces, browser state, archives, symlinks, credentials and caches are excluded. Intentional worktree deletions are excluded too.
5. Review the diff and release report before committing or deploying. Validate actual Netlify headers, image transforms, deep-link status codes, canonical metadata, service-worker update behavior and mobile performance on an authorized preview deployment.

## Security policy

Public context is read-only, uses a publishable credential, projects approved safe fields and validates shape. Unknown APIs return JSON 404; unsupported methods return 405; HEAD is bodyless. Errors are normalized and requests have a finite timeout including response-body parsing.

CSP restricts scripts to self without eval or inline-script permission. Image sources are local assets and the explicitly configured storage origin; arbitrary HTTPS images and SVG data URLs are not enabled. React still needs style attributes. Trusted Types is report-only: React's internal HTML paths and html-to-image's SVG serialization need a targeted compatibility review before enforcement. The application does not install a permissive default Trusted Types policy or render untrusted HTML.

Private caches are invalidated on identity/role changes. The service worker does not cache HTML navigation, API responses or private routes. It caches only the neutral offline shell and safe local static assets. Updates wait for explicit user acceptance, and activation removes only obsolete AEVIC-owned caches.

Client-side capability and role checks are UX boundaries, not backend authorization. Future authenticated endpoints require server-side authorization, ownership checks, input validation, durable audit events, rate limiting and appropriate database policies before activation.

## Audit limitations

Automated scans and Chromium tests do not prove universal security or native accessibility. Native Safari/VoiceOver, ownership of the canonical domain, final legal/competition copy and exposed-key revocation remain owner actions. Local performance evidence uses a CDN-passthrough acceptance harness; it is not a measurement of Netlify's actual image transforms.
