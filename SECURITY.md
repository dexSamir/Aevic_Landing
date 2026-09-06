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
- The API adapter can forward a backend-issued CSRF token from `<meta name="csrf-token">` on state-changing requests. The backend remains responsible for SameSite/secure cookie policy, Origin validation, token issuance and verification.
- Frontend file checks improve feedback only. The backend must validate MIME type, magic bytes, size, decoded image content, re-encode safely, randomize storage names, authorize ownership, and retain an audit trail.

## Safe release archives

Run `npm run package:check` before creating a handoff archive, then `npm run package:release`. The release script packages tracked product files from the working tree and excludes local environment files, dependencies, caches, build output, internal design references, and source brand-board assets.
