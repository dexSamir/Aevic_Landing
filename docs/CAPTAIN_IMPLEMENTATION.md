# Captain implementation — 2026-09-24

This supersedes the auth/media limitations in ORIGINAL_PRODUCTION_INTEGRATION.md. It does not activate any historical migration, normalized schema, claiming, or Supabase Auth workflow. No production writes, emails, deployment, DDL, grants, migrations, or new database objects were performed. Other concurrent workspace edits were preserved.

## Implemented

The running Hono app now mounts `server/routes/captain.ts` before the existing public routes. Its store uses only the existing `public.teams` record, retains bigint IDs as strings, and leaves ID generation to the existing database default/identity. Parameterized PostgreSQL transactions provide atomic reset consumption and registration/name uniqueness checks with a shared transaction advisory lock. No database functions are installed. Duplicate registrations return 409 without overwriting an existing record; an idempotency key is accepted for client compatibility but no persistent replay receipt is claimed.

- Recovery mails a 256-bit random token to the stored team email using existing Resend configuration. Missing email and delivery failure yield the same empty 204. A minimum response delay reduces ordinary delivery timing differences; upstream latency is not a proof of constant-time operation. Provider calls have bounded timeouts. No assumption that an unknown legacy password verifies. No independent email-verification flag exists: the reset link proves access to the stored mailbox.
- `reset_token` stores a versioned HMAC digest and issued/expiry timestamps, never the reusable token. Expiry is 30 minutes. Reset replaces only `password_hash` and clears `reset_token` in one conditional SQL UPDATE; DB time also checks expiry. Concurrent redemption has one winner. Rotation supersedes any previous reset token.
- New passwords use scrypt N=131072, r=8, p=1, random 16-byte salt and 64-byte key; at most two hashes run concurrently in an instance. A versioned envelope also includes a random session epoch. No legacy verifier or guessed passwords.
- Cookie sessions are HMAC-signed, bound to the current stored hash and original team ID, with an 8-hour expiry or 30 days for remember-me. Every private API request reloads the stored hash. HTTPS cookies are `__Host-`, Secure, HttpOnly, SameSite=Strict. Localhost development cookies are non-Secure. Logout changes the epoch and invalidates all existing sessions while preserving password verification. Password reset/change also revokes all sessions. Revoke-other-sessions rotates the epoch and issues one fresh current cookie; individual device enumeration is unavailable without an existing session registry.
- Same-origin checks reject cross-site/missing-origin writes. Local IP/account attempt limits plus Netlify edge function rate limiting are configured; edge enforcement has not been deployed/verified. In-memory local limits alone are not a distributed counter.
- Registration validates fields, serializes duplicate checks/insertion and stores captain/name/email, four required IGNs plus optional fifth IGN, pending status and entry tier. Production already has pending/entry records, but production constraints/triggers and the sequence have not been exercised. Unsupported tags/UIDs are rejected if nonempty, and their existing UI inputs are disabled with explanations.
- Protected team/account endpoints expose owner data only, update name/captain contact and the five IGN slots, and reject status/tier/room/results updates. Another submitted team ID is rejected before mutation or upload. No public response includes private columns.
- Existing registration, recovery, login, profile, roster, settings and account forms use these endpoints. Original layouts/components are retained; the roster form now edits the existing slots directly. Unsupported dashboard routes render unavailable states. Tier/status and private rejection reason are shown. Only the verified empty `match_results` array format is supported; nonempty unknown formats remain unavailable, not guessed. Room release rules are unverified, so room credentials are never read or returned.
- PNG/JPEG/WebP upload validation decodes actual bytes, verifies MIME, caps 4 MB/20 MP, rejects unsupported/animated formats and preserves original bytes/aspect ratio. Fresh UUID object names use `upsert:false`; old objects are never overwritten/deleted. Only an already-public configured bucket can be used. Profile writes recheck authentication after upload. If that last write fails, the unused new object can remain; no existing media is damaged.
- Original `/api/media/<uuid>` resolution checks that a team currently references the UUID, then looks for exactly one corresponding ID or filename in `storage.objects` joined to an already-public bucket. It reads bounded original bytes and serves the detected Content-Type. Missing/ambiguous mappings return 404; unavailable DB configuration returns 503. This mapping is implemented but not yet verified against real objects.

## Production blockers, checked without reading private values

1. This environment has no `AEVIC_DATABASE_URL`. Public PostgREST OpenAPI requires a secret key, so the actual `reset_token` type, nullability, constraints, triggers and prior use could not be verified. Every auth/write operation first checks catalogs: hash/reset must be text or varchar large enough for their envelopes (169/80 characters respectively), reset nullable; ID bigint with existing default/identity; connection non-superuser. Incompatible contracts fail closed without writing. The digest/hash formats are conditional on those checks, not a claim that the production contract already passes.
2. Zero-row public-key requests selecting `password_hash`, `reset_token`, and `email,captain_contact,room_password` all returned HTTP 200. No values were fetched. This confirms accepted column selection, not a row-level exposure audit. Runtime refuses to activate if anon/authenticated roles have those private-column SELECT grants or any team INSERT/UPDATE/DELETE privileges, even if RLS might otherwise restrict them. Existing grants must be reviewed/corrected by the database owner before activation; this task changed none. Public projection remains safe, but it cannot repair direct database permissions.
3. No `SUPABASE_SERVICE_ROLE_KEY` or `TEAM_MEDIA_BUCKET` is configured. The public-key bucket inventory returned `[]`; that does **not** prove the original buckets/objects are absent. Full storage inventory and original media mapping need existing privileged access. No bucket was created or exposed.
4. Resend settings exist, but sender/domain authorization and real delivery were not tested because real emails were prohibited. Set `EMAIL_FROM` to the existing verified sender (otherwise `SMTP_USER` is used); no SMTP fallback is claimed. `AEVIC_SESSION_SECRET` must be at least 32 random characters; existing `ADMIN_SERVER_KEY` is a compatibility fallback. All credentials remain server-only.

Required existing server database permissions: SELECT on the explicit private projection in teams; INSERT on registration fields; UPDATE on hash/reset/profile/IGN/photo columns; usage on its existing ID sequence if needed; catalog inspection; optional SELECT on storage.objects/storage.buckets for media lookup. Use the existing least-privileged server login for this project. No credentials should be sent in chat. The application never uses the publishable key for private writes.

## Exact unresolved original logos

The read-only check still returned the same seven team IDs. All 35 player-photo fields were empty. These logo references are unresolved, **not proven missing**:

| Team ID | Original reference |
|---|---|
| 2 | `/api/media/f7b98b59-32ca-4577-a3e5-84f7185b3e22` |
| 7 | `/api/media/0bc2ec73-9bcd-4507-ad67-7dec5c73c726` |
| 8 | `/api/media/5c5a4a8f-3d37-442a-998b-a415e76d2488` |
| 9 | `/api/media/80f60e1c-ca2b-4930-97ed-ca15f245e51f` |
| 10 | `/api/media/a8bf42da-c493-4842-a7ea-470488be05a9` |
| 12 | `/api/media/373e5c0e-9c18-4675-8152-358d70e054ad` |
| 16 | `/api/media/2d83d340-adec-4b29-9325-73f5edd36e2d` |

## Verification

`npm run lint` and `npm run build` passed. Build retains existing artwork-placeholder warnings. Focused Vitest command: `npx vitest run --config vitest.server.config.ts tests/server/captain.test.ts tests/server/production.test.ts` — 28 passing tests. Fixtures cover modern hashing, legacy-team reset/preservation, expiry, token association, concurrent single-use consumption, session persistence/revocation, login/cookies, generic recovery receipts, registration/duplicates, protected profile/roster/contact updates, ID tampering/CSRF/rate limits, media retrieval/upload ownership and PNG byte/ratio preservation. Fixture stores do not verify real PostgreSQL grants, constraints, locking, storage policies, or delivery. Production writes remain unverified and blocked.

Three additional component tests pass (`npx vitest run tests/captain-ui.test.tsx`): reset-token fragment removal/no browser storage, fail-closed reset form on inspection failure, and unsupported registration field state. Browser registration rendered with the existing design and disabled unsupported tag field; the unavailable reset state was also verified. No browser registration or real reset was submitted. The historical normalized-schema test suites are not evidence for this integration.

Read-only inspection can be repeated with `node --env-file=.env scripts/inspect-captain-contract.mjs`; it prints only response statuses, config-presence booleans, visible bucket metadata and public image references. It never prints secrets or authentication-column values.
