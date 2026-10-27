# AEVIC mail architecture and owner setup

Local refinement, 27 October 2026. No live mail, credentials, dashboard changes, production writes, or deployment were performed. Supabase MCP was unavailable; the owner's reported Gmail setup has not been independently inspected.

## Architecture decision: partial consolidation (Option C)

The active application uses custom AEVIC accounts, password hashes, verification/reset challenges, session families and TOTP/recovery codes. Google (including the Supabase OAuth option) supplies identity proof; `google_identities` maps that subject to the existing account. It does not transfer password or MFA ownership to Supabase Auth.

Supabase's configured Auth SMTP handles Supabase Auth messages. There is no documented general-purpose send API that uses those stored SMTP credentials for arbitrary application tokens. The Send Email Hook replaces Auth delivery with your own service; it does not expose an outbound relay. Moving a sender into an Edge Function would still require its own provider credentials and would add another deployment without solving this boundary.

Therefore all active application mail now uses one `server/emailDelivery.ts` SMTP implementation. Reset mail uses a small adapter; verification and administrator setup use the same sender. The HTTP provider fallback and duplicate reset SMTP implementation were removed. Nodemailer and application SMTP settings remain necessary. Supabase Auth settings remain independent and unchanged. No users were copied into `auth.users`; no schema, IDs, hashes, sessions, roles, memberships, history, or MFA were migrated.

## Flow inventory

| Trigger / recipient | Token ownership and template | Delivery / security |
| --- | --- | --- |
| Team registration → submitted captain address | AEVIC email verification digest; 30 minutes; Azerbaijani verification text | Shared SMTP; registration idempotency and existing route limits |
| Standalone activation → submitted account address | Same verification challenge family | Shared SMTP; neutral receipt, existing limits |
| Verification resend → signed-in account address | AEVIC replacement digest; 30 minutes | Shared SMTP; authenticated, limited; failed delivery does not mark verified |
| Password recovery → stored captain/account address | AEVIC ID + random nonce, protected reset record; 30 minutes; existing branded HTML and text | Shared SMTP; account/IP limits and cooldown; neutral timed receipt; atomic one-use confirmation |
| Administrator creation / setup resend → stored admin address | AEVIC `adm` token digest; 30 minutes; Azerbaijani admin setup text | Shared SMTP; super-admin authorization and limits; failed delivery clears issued digest |
| Administrator recovery → stored admin address | Same admin reset challenge | Shared SMTP; neutral receipt; reset revokes sessions |
| Google login | OAuth state/PKCE/nonce and custom account continuation, then existing MFA/session flow | No application email sent |
| Password change, TOTP/recovery-code operations, session management | Existing custom authentication | No separate security-notice email sender exists |
| Tournament/community notifications | Application inbox | No email worker exists; none added |
| Old `server/routes/auth.ts` and `routes/legacyClaims.ts` Auth endpoints | Supabase-owned signup/recovery tokens | Router definitions are not mounted by current `createApp`; shared helpers may still be imported. Their presence does not mean current accounts use Auth mail |

Verification/reset links use `PUBLIC_SITE_URL` and fragments. No custom token is inserted into an Auth template. Existing expiry, consumption, authorization, enumeration protection and rate limits remain at their respective route/service boundaries. The shared sender validates TLS, disables transport debugging and external file/URL attachments, sanitizes provider errors, and closes each transport. No automatic retry or alternate provider can produce duplicate mail.

## Owner actions before deployment

1. Preserve the working Supabase Auth Gmail SMTP configuration. No new hook or Auth migration is needed for this patch. Review its sender identity, Site URL, redirect allowlist, rate limits and Azerbaijani templates only for genuine Supabase Auth flows; use Auth's own template variables and links.
2. Separately configure application mail in the server/Functions environment: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` (STARTTLS) or `465` (implicit TLS), `SMTP_USER` as the authorized Gmail mailbox, and `SMTP_PASS` as its app password. Enter the secret directly in the hosting dashboard, never chat or a `VITE_` variable. The existing Supabase dashboard credential is not readable by this application.
3. Set `EMAIL_FROM` to that mailbox or an authorized alias, `EMAIL_FROM_NAME=AEVIC Esports`, and optional `EMAIL_REPLY_TO` to a monitored mailbox. Set `PUBLIC_SITE_URL` to the canonical HTTPS application origin. Keep database/session/Google settings unchanged. Gmail sending limits and alias permissions depend on the account; validate them with the owner.
4. Before promoting this local patch, test in an isolated preview using owned test accounts: activation, team verification, resend, captain recovery, administrator setup/recovery; inspect sender/reply identity, spam placement, expired/used tokens, duplicate requests, login/MFA and session revocation. Never mail participant accounts for testing.
5. Remove the obsolete `RESEND_API_KEY` from hosting environments only after replacement delivery is confirmed. If any prior SMTP settings point to that provider, replace the entire SMTP credential group with the intended Gmail settings first. Do not delete the required application SMTP variables. No provider SDK dependency existed to remove.

Resend-specific names remain only where needed to detect leaked historical credentials or in historical audit records; these are not delivery fallbacks. Production delivery is not verified by mocked tests. Supabase dashboard success alone is insufficient to call this patch production-ready: application Gmail credentials and an owned-account smoke test remain required.

A future single Auth-owned sender requires a separately designed identity migration with explicit mapping, password compatibility, session/MFA transition and rollback evidence. That decision is outside this transport refactor and is not silently enabled here.

Sources: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook). The documented Auth-only scope and hook direction are the basis for the architecture decision.

## Local validation

- TypeScript/lint, production build, public-output secret scan and diff whitespace checks passed.
- Backend: 244 passed, 5 skipped. Shared transport tests cover TLS, sender identity, missing configuration, sanitized failures and connection cleanup.
- Fresh disposable local PostgreSQL cluster: 49 platform tests passed, 2 skipped, including registration delivery/digest/expiry and account/session/MFA regressions. Initial attempt found no local database server; rerun used a new isolated cluster, never production.
- Browser: targeted recovery delivery, password replacement and token-reuse rejection passed with captured SMTP messages, without external delivery.
- Broader platform-browser run was stopped after an existing login assertion expected `/team` while the previous refinement now redirects to `/`. This full suite is not claimed passing. The focused mail test passed independently.
- No live Gmail inbox placement, provider limits or dashboard configuration verification was performed. No commit, push or deploy.
