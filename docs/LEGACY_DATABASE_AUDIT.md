# Legacy database compatibility audit

2026-09-20 · This document incorporates the owner's completed read-only production inspection. This implementation task did not read production rows or independently repeat that inspection.

## Verified findings supplied by the owner

Production project `aevic-FE`, reference `nmjjibifcuzjlsvfcaaz`, contains four legacy public application tables: `admin_sessions`, `rate_limits`, `teams`, `tournament_state`. `teams` has seven registered teams, bigint IDs and seven empty `match_results` arrays (zero result entries in that column). `auth.users` has zero users. No application tables were found in `aevic` or `aevic_private`.

Reported team fields include name, captain name/contact/email, password_hash, five IGN slots, logo URL, status/tier, creation date, match_results, room credentials, reset information, player photo URLs and rejection reason. Exact DDL, nullability, constraints, status semantics, object ownership and all external histories still require a protected mapping review. Do not infer that empty match_results proves no historical records elsewhere.

## Mapping and exclusions

| Source | Destination / handling |
|---|---|
| `teams.id` bigint | Lossless string key + deterministic UUID in private holding; same UUID becomes `aevic.teams.id` on claim. No alias based on email/name. |
| Team name / created_at / status / tier / rejection reason | Original values retained in holding. Reviewed status mapping, name, creation date and rejection reason transfer on claim; tier remains preserved for later semantic review. |
| Captain name/contact/email | Minimized private ownership-review context; only support-moderator/super-admin queue. No public projection, automatic owner assignment or Auth metadata authority. |
| Five IGN slots | Preserved private slot array, then real normalized players after verified owner supplies real unique PUBG IDs and explicit roles. Never infer captain role from slot 1. |
| Logo / player photo URLs | Private references with logo/player-slot association. Binary ownership, availability, MIME/size, access and destination require separate reviewed migration. No fetching/public attachment. |
| Empty match_results | Explicit incomplete external-history scope; no fabricated matches, awards, standings or tournament entries. |
| password_hash / reset information / room credentials | Excluded from migration inputs and target storage; never copied into Auth, code, reports or logs. New passwords and standard Auth confirmation/recovery. |
| `admin_sessions` | Retain in legacy source for authorized coexistence/retention decisions; never import sessions or infer new administrator roles. |
| `rate_limits` | Retain source operational state; new backend uses its existing independent persistent rate-limit model. |
| `tournament_state` | No verified shape/semantics supplied. Preserve untouched; review privately for schedules, participation/history and secret fields. No guessed transformer. |
| `auth.users` | Zero legacy rows. Captains establish real accounts themselves; no invented UUIDs, forced confirmation, imported hashes or user creation by migration. |

Private holdings explicitly solve the owner-required normalized schema without weakening RLS or creating publicly manageable shells. The V2 planner can import seven reviewed holdings while Auth/users, normalized teams/players and official results all remain empty. The V1 existing-Auth import remains for other reviewed sources, not this source's default path.

## Password-hash investigation

Repository searches of legacy readers, authentication code and available Git history found no implementation of the old password verifier and no reliable algorithm/version metadata. The verified column name `password_hash` does not establish bcrypt, PBKDF2, scrypt or another format. **Algorithm: NOT VERIFIED.** No real hash was exported, displayed, compared or reused.

Obtain the old deployed verifier code or a reviewed format-only metadata assessment if needed for retiring the old system; do not export raw hashes into this workflow. Claim activation deliberately avoids any dependency on that algorithm. Supabase Auth signup/confirmation and password recovery operate only on newly established accounts. See [Supabase signup documentation](https://supabase.com/docs/reference/javascript/auth-signup) and [Auth user-data guidance](https://supabase.com/docs/guides/auth/managing-user-data).

## Remaining read-only evidence before staging/cutover

The repository's `scripts/legacy-migration/catalog-audit.sql` is an operator audit artifact, not proof it has been executed remotely. Before approved source export, privately reconcile exact column mappings, all table/view/function/trigger/grant/RLS definitions and migration history, legacy writers and authentication behavior, duplicate/null/status summaries, tournament_state semantics, external history sources and Storage object policies/ownership. Do not print contacts, credential material or SQL function literals containing secrets.

Review independent ownership evidence for every captain; neither email equality nor a registration request proves it. Document inaccessible original contacts as unresolved cases. Retain source and review receipts outside Git. Follow [DATA_MIGRATION_PLAN.md](DATA_MIGRATION_PLAN.md) for the implemented claim boundary and [PRODUCTION_CUTOVER_PLAN.md](PRODUCTION_CUTOVER_PLAN.md) for separately authorized execution and rollback. No actual team is reconciled by this local implementation task.
