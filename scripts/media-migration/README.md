# Team media migration

Default: `node scripts/media-migration/cli.mjs dry-run`.
Reads `.env` using Vite's development environment rules. The configured DB URL and port are passed unchanged; dry-run/copy connections enforce PostgreSQL read-only mode. No schema migration or storage deletion exists.

State lives in git-ignored `work/media-migration/` (directory 0700, files 0600): `manifest.json` records exact table/ID/column/old URL/source path/hash, deterministic Cloudinary public ID, and, after copy, verified new URL. Only currently referenced public team images are eligible. All Storage objects and database media are inventoried; unreferenced files and private evidence/support attachments stay untouched. Distinct paths with identical original bytes share one SHA-256 target. Original pixels, dimensions, file bytes and original files are retained.

After separate human approval, use the reviewed manifest's `planHash`:

- `node scripts/media-migration/cli.mjs copy --approve-copy --approve-plan=<planHash>` copies public originals without updating DB URLs. Originals are rechecked against inventory hashes; uploads use deterministic IDs and `overwrite=false`. Downloaded CDN originals must match the source SHA-256 and dimensions. Each successful copy is checkpointed.
- `node scripts/media-migration/cli.mjs apply --approve-db --approve-plan=<planHash>` re-verifies source/CDN files before opening a write connection. Only verified assets are considered. URL replacements use exact owner/column and old-URL comparisons in one transaction. Any conflict aborts the transaction. Non-media team data is fingerprinted before/after. No IDs, roster values, relationships or other fields are written.
- `node scripts/media-migration/cli.mjs rollback --approve-db --approve-plan=<planHash>` restores old URLs only where the current value still equals the recorded Cloudinary URL. It does not delete either provider's files and refuses to overwrite subsequent edits.

Run the same approved stage to resume. A crash after upload cannot create a duplicate public ID; a crash after DB commit is recognized by the current URL. A dead process's local lock is recovered; a live process blocks a second run. Never remove an active lock. Back up the entire state directory securely before apply; it is the rollback receipt. Do not rerun dry-run in a state directory after copy: use `--state=work/media-migration-new` for a new plan.

Dry-run performs no Cloudinary request or DB mutation. Copy/apply/rollback have not been run in production as part of preparation. The planned stages are covered by isolated tests; live migration remains gated on approval. Review unavailable/ambiguous sources and any `issues` before approving. Private/unreferenced media is never made public by this script.
