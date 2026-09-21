# Future production cutover plan

**NOT AUTHORIZED FOR EXECUTION. PRODUCTION VERIFIED: no.** Project `nmjjibifcuzjlsvfcaaz` / `aevic-FE` is production, as identified by the owner. This task made no remote changes. The local-only rehearsal CLI cannot perform this cutover; a production-capable execution path requires separate review, implementation, approval and testing.

The old `public` schema, Auth accounts and Storage objects must remain intact until independent verification and a later, separate retirement decision. Applying `aevic` DDL alone is not a complete migration. Restoring an old frontend alone is not a safe rollback after new writes.

## 1. Establish evidence, responsibility and approvals

Name the database operator, legacy application owner, security reviewer, reconciliation reviewer and rollback decision-maker. Independently confirm project reference, dashboard production classification, database identity and deployed sites/functions. Record exact code revision, seven migration digests, source catalog fingerprint and remote migration history. If any of the seven migrations was partially or previously applied, stop and reconcile definitions/history; never rerun schema creation blindly or edit history to conceal differences.

Complete the read-only audit and mapping in [LEGACY_DATABASE_AUDIT.md](LEGACY_DATABASE_AUDIT.md). Include tables not present in this repository, external jobs/webhooks, Auth triggers, legacy admin roles, Storage policies, URL consumers, and all legitimate historical relationships. Audit the currently deployed legacy registration/login code. Ensure RLS protects any still-exposed legacy table during coexistence without changing it speculatively.

Approve separately: read-only inspection, minimized export, staging copy/provisioning, remote schema changes, data migration, write freeze, deployment switch and eventual legacy retirement. The seven teams and zero Auth users are verified read-only findings supplied by the owner and a reconciliation checkpoint, not a substitute for a final source census.

## 2. Verify recoverability and staging

Obtain a restorable database backup covering legacy data, schema, Auth identities, grants/policies/triggers/functions and relevant configuration. Protect credentials/password hashes as secrets; never put them in repository artifacts or migration reports. Inventory and back up Storage **binary objects** separately from metadata. Record Auth provider/SMTP/redirect/MFA configuration and Realtime/publication state securely. Confirm provider-specific backup/PITR coverage and retention directly with the operator.

Restore to an isolated authorized environment and verify schema, counts, relationships and usable binaries. Record restore duration, recovery point, responsible operator and maximum tolerable data loss/downtime. A backup existing in a dashboard is not proof that restore works.

Rehearse approved minimized data with controlled staging accounts. The verified legacy source has zero Auth users: import private pending holdings first, then let captains create and confirm new accounts through activation. Never invent users, force confirmation or transfer teams by email inference. Supabase account IDs in staging are test identities, not production ownership evidence. Preserve any real Auth identities established subsequently; re-census Auth at freeze. Test confirmation, recovery and coexisting signup triggers before inviting captains.

The V2 local tool preserves unclaimed teams with an explicit incomplete-history marker. Empty match_results arrays do not establish absence of external history. Extend and verify transformers for any actual historical tournaments, entries, snapshots, results, corrections, governance or media before presenting a complete career. Legacy aggregates without source matches remain preserved evidence; do not invent match rows. Rehearse old-to-new URLs/slug aliases using safe public routing, without exposing private mapping ledgers.

## 3. Freeze and capture the final source state

Announce and enforce a controlled write freeze at **every** writer: old UI/API/functions, direct integrations, scheduled jobs, administrative tools, registration webhooks and Auth-related profile/team creation. Pausing only the frontend is insufficient. Treat password resets, identity-provider updates and Storage uploads as separate writes to coordinate; do not lose access or security changes through an unreviewed Auth restore.

At freeze start record a transaction-consistent final database snapshot, Storage inventory, counts, source hashes and a durable cutover timestamp/checkpoint. Identify deltas since the staging snapshot. Use verified change logs/CDC when available; otherwise compare consistent full snapshots. `updated_at` alone misses deletes and may miss untracked writes. Classify inserts, updates and deletions explicitly. Resolve final deltas before migration; do not copy into a moving target or add unreviewed bidirectional synchronization.

## 4. Add the new schema and transfer reviewed data

Review every migration for target collisions and effects beyond `aevic`: the signup trigger touches Auth, Storage migrations address bucket names/policies and Realtime publication, and function grants change the new schemas. The first migration's isolation from public tables does not make the entire batch effect-free. Apply only verified unapplied migrations with explicit approval and a tested rollback/checkpoint strategy. Never drop or truncate legacy tables, disable integrity constraints to force data through, reset the project, or replace Auth accounts.

Install separately reviewed production migration metadata/runner controls; do not bypass the local CLI guard. Require immutable source/review binding, exact target identity, idempotency, transactional inserts, explicit source-to-target ledger, constraint checks, held/rejected records and confidential reporting. Historical timestamp/status/formula mappings need separate review. Private holdings require no Auth owner and reserve the stable team identity. Activate accounts through normal confirmed Auth and independently reviewed single-use claiming. Existing profile/account values must not be overwritten. Unproven ownership stays unclaimed. Establish a protected evidence-receipt register and manual verified-contact delivery procedure; no claim email worker is supplied. Missing original contact remains an unresolved case.

Transfer only authorized media with checksums, ownership, MIME/size validation, bucket privacy and retained source references. Verify URL/CSP compatibility and signed evidence rules. Do not change a bucket to public merely to make logos work. Preserve rollback copies and metadata mappings; do not delete replaced legacy objects during cutover.

## 5. Reconcile and decide go/no-go while writes remain frozen

Require independent reviewer sign-off on:

- Source and target counts by table/status, every stable identity mapping, and explicit zero unreviewed/held critical records. Every one of the reported seven legacy teams must be accounted for by the final census; each exclusion needs owner approval and an access plan.
- A complete census of newly activated versus unclaimed legacy teams, unchanged pre-existing Auth UUIDs/confirmation states, independently proven team owners/members, no ambiguous multi-team or duplicate-player assignments, no privilege elevation from metadata, and no orphan FKs.
- Tournament/entry/match relationships, historical roster provenance, published-result completeness, exact scoring totals/penalties/rankings and version histories. No manufactured dates/results/awards. No unknown history rendered as proven zero.
- Public profile/directory/admin/workspace identity agreement; old public links resolve as intended. Legacy captains establish new confirmed accounts and claim their stable team identity; subsequent login, confirmation/recovery/refresh/logout work through secure cookies. Verify neutral activation/recovery receipts, role-limited review, expiry/reissue/revocation, two-account concurrent claiming and private holding isolation. Pending teams need an explicit approved access plan.
- Two unrelated users cannot read or mutate each other's contacts, evidence, invitations, rooms or account data via API **and direct Data API/RLS**. Role-specific admin checks pass; audit trails persist.
- Storage objects and permissions, signed URLs, Realtime disconnect/reconnect, timed rooms, duplicate/capacity enforcement, result publication/correction, Career/Wrapped/Share Studio, missing configuration and API failures.
- Tested rollback capability and measured restore/reconciliation time remain within the agreed recovery objective. No unresolved migration exception, uncertain commit report or manual repair remains.

Any failure is **NO-GO**. Keep the old service available or in the agreed maintenance state and resolve discrepancies; do not silently skip records to pass counts. Switch traffic only after approval. Open new writes only after the frozen-state smoke test succeeds. Use a short controlled-write canary and monitor sanitized error rates, database constraints, authorization failures and reconciliation drift.

## 6. Rollback without losing new writes

**Before new-system writes:** stop new traffic, confirm no new writes occurred (including Auth, background jobs and Storage), switch back to the verified legacy release, and validate legacy access. New schema data can remain dormant. Remove/disable new triggers or routing only through the tested approved procedure; do not casually drop `aevic` or restore over Auth. Preserve failure evidence.

**After new-system writes:** immediately freeze **both** systems and all workers. Capture a fresh complete database snapshot, new-schema change inventory, new/changed Auth identities, new Storage binaries and object mappings. Account for inserts, updates **and deletes** since the cutover checkpoint; application audit events may not cover every operation and cannot be the sole recovery source.

Classify each new write against an explicitly reviewed reverse mapping. Replay representable changes into the preserved legacy model with original authorizations, IDs/mappings, timestamps and duplicate protection; reconcile before reopening the old application. Preserve Auth accounts, password/provider/confirmation changes and team-ownership updates in the same project wherever feasible. New users must receive a legitimate legacy access mapping, not disappear through a database restore.

For changes the legacy model cannot represent (new normalized roles, disputes, roster snapshots, result versions, evidence, settings), keep the new records and binaries in a protected recovery store with a case ID and owner. Provide a controlled read-only/maintenance path and manual resolution process. **Do not reopen unrestricted legacy writes if doing so would discard or contradict those changes.** Either finish the forward repair or implement/review a recovery adapter before resuming service.

If full database restore is unavoidable, first verify that all post-backup database/Auth/Storage changes are captured and that selective replay has been rehearsed. Restore plus replay must be independently reconciled. Never promise zero loss merely because a snapshot exists. Record any unavoidable loss and obtain an explicit decision before proceeding.

## 7. Observation and separate retirement

Keep legacy data and backups through a defined observation period with bounded access and monitored reconciliation. Verify real user journeys and resolve retained exceptions. Only after independent acceptance may the owner separately approve retiring old writers, tables, policies, functions, buckets or backups. Retention/privacy obligations and deletion scope must be reviewed then; this plan authorizes no deletions.
