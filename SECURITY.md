# AEVIC credential and release safety

The local `.env` file is intentionally ignored and must never be included in a repository, deployment archive, support bundle, screenshot, or documentation. Credentials previously distributed with a project archive must be treated as compromised even if that archive was private.

## Required rotation before production use

Rotate and revoke the old values for every environment that used them:

- Supabase service-role credentials and any server-side database keys
- Resend, SMTP, and other mail-provider credentials
- Admin server keys or shared operational tokens
- Any storage, webhook, deployment, analytics, or third-party credentials present in the old environment file

Review provider audit logs after rotation. Do not copy old values into tickets or commit history. Public Supabase project URLs and anonymous/publishable keys may be browser-visible, but row-level security and backend authorization remain mandatory.

## Client and server boundary

- `VITE_*` and `NEXT_PUBLIC_*` values are client-visible configuration, never admin authorization.
- Admin access must come from an authenticated server session plus server-evaluated roles and permissions.
- The Hono backend enforces exact same-origin Origin checks on mutations, HttpOnly SameSite=Lax cookies and Secure `__Host-` cookies outside localhost. Optional historical CSRF headers are not treated as authorization.
- Frontend file checks improve feedback only. The backend validates MIME/decoded format, size and dimensions, re-encodes images, randomizes keys and authorizes team ownership. Evidence remains private behind authorized short-lived download links.

## Safe release archives

Run `npm run package:check` before creating a handoff archive, then `npm run package:release`. The release script packages tracked and untracked eligible product files from the working tree and excludes local environment files, dependencies, caches, build output, internal design references, and source brand-board assets.

## Verification boundary

RLS and transactional rules are tested on disposable local PostgreSQL; Hono tests use explicit Supabase transport fixtures. Live Supabase Auth, Storage, Realtime, SMTP and the deployed Linux function must pass staging verification before launch. MFA login/setup and per-device inventory are not yet supported. See `docs/BACKEND_SETUP.md`. No migration or deployment runs automatically during a build.
