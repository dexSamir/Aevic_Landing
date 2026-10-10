# Netlify environment boundaries

The reported `Secret env var ... value detected` failure is value matching against
variables classified as secrets. A public URL appearing in repository code or
rendered output is expected. Moving or encoding it cannot correct the Netlify
classification. Smart detection is a separate protection; leave both enabled.

In Project configuration → Environment variables, review Production and any shared
or context-specific definitions. Do not export or paste credential values.

- `VITE_AEVIC_INSTAGRAM_URL`, `VITE_AEVIC_TIKTOK_URL`, `VITE_AEVIC_LINKEDIN_URL`,
  `VITE_AEVIC_X_URL`, `VITE_AEVIC_WEBSITE_URL`, plus configured YouTube, Discord and
  Twitch URL keys: **Contains secret values OFF**, Builds + Functions scopes.
  Keep existing public destination values. The shared `src/config/publicSocial.ts`
  resolver is used by the browser and reset email. Absent email keys retain the
  four legacy destinations; explicit blank keys hide links. Website is optional.
- `VITE_API_BASE_URL`, `VITE_PUBLIC_SITE_URL`, `VITE_PUBLIC_MEDIA_ORIGIN`, legacy
  `VITE_SUPABASE_URL`, `PUBLIC_SITE_URL`, `SUPABASE_URL`: public configuration, not
  secrets. Retain their existing values and required scopes. Do not change the
  canonical origin or database connection URL to solve a scanning warning.
- `TEAM_MEDIA_PROVIDER`: non-secret enum; current Cloudinary value is `cloudinary`.
  Functions scope, **Contains secret values OFF**.
- `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `AEVIC_DATABASE_URL`, `AEVIC_SESSION_SECRET`, `ADMIN_SERVER_KEY`, `SMTP_PASS`,
  `RESEND_API_KEY` and other credentials: **Contains secret values ON**, Functions
  scope only unless a specific build task genuinely requires them. Never `VITE_`.
- `SECRETS_SCAN_OMIT_KEYS` is control configuration, not a credential. If previously
  marked secret, remove that flag (or delete an obsolete definition). Do not add
  this key to its own exclusion list. Remove any scan-disabling variables and
  broad path exclusions introduced as workarounds.

Prefer correcting classification; no omit list is required for correctly classified
public values. If that is unavailable, the minimal fallback for the five requested
URLs and the reported provider false positive is a non-secret Builds-scope variable:

```
SECRETS_SCAN_OMIT_KEYS=VITE_AEVIC_INSTAGRAM_URL,VITE_AEVIC_TIKTOK_URL,VITE_AEVIC_LINKEDIN_URL,VITE_AEVIC_X_URL,VITE_AEVIC_WEBSITE_URL,TEAM_MEDIA_PROVIDER
```

Only append another specific public key if it is actually configured and falsely
flagged. Never use wildcards, credential keys or directory exclusions. The fallback
is intentionally not installed in netlify.toml; correct dashboard classification
first. Keep smart detection and normal secrets scanning enabled.

`npm run build` rejects unreviewed VITE keys and checks the final public output for
configured sensitive values, including JSON/URL-encoded forms. This local guard
is not Netlify's hosted scanner and cannot inspect remote variable classifications.
`prepare-netlify-env.mjs` generates only an ignored server import file; do not
bulk-mark all imported settings secret. It is not executed by the build.

Next production deploy: build and Functions bundling should pass, followed by
secrets scanning without these public-value findings. Any real credential finding
must still block deployment. Local success does not confirm hosted deployment.

References: https://docs.netlify.com/manage/security/secret-scanning/
and https://docs.netlify.com/build/environment-variables/secrets-controller/

## Release configuration matrix — 2026-10-10

Remote Netlify values, scopes, and secret classifications were **not verified**.
The local checks below do not certify the deployed environment. No values are
included. Public URL syntax/canonical consistency passed the production build;
the configured database was reached using TLS in a read-only transaction.

| Variable | Netlify scope | Secret | Requirement | Verification |
|---|---|---|---|---|
| `PUBLIC_SITE_URL` | Builds + Functions | No | Required canonical HTTPS origin, exact browser Origin | Local build validated; hosted value unverified |
| `VITE_PUBLIC_SITE_URL` | Builds | No | Optional; must match canonical origin when both set | Local build validated |
| `VITE_API_BASE_URL` | Builds | No | Optional, default `/api`; keep same origin | Local implementation/default verified |
| `SUPABASE_URL` | Builds + Functions | No | Required original project | Local parsed and read-only connection checked |
| `SUPABASE_PUBLISHABLE_KEY` | Functions | No (public key) | Required, or legacy `SUPABASE_ANON_KEY` | Local present; hosted unverified |
| `SUPABASE_ANON_KEY` | Functions | No (public key) | Optional fallback only | Hosted unverified |
| `AEVIC_DATABASE_URL` | Functions | Yes | Required custom platform; retain exact endpoint/port | Local read-only connection verified; no rewrite |
| `AEVIC_SESSION_SECRET` | Functions | Yes | Required, ≥32 random characters; stable across deploys | Local length verified, hosted unverified |
| `ADMIN_SERVER_KEY` | Functions | Yes | Legacy fallback only; prefer explicit session secret | Local present; hosted unverified |
| `AEVIC_SESSION_MODE` | Functions | No | `legacy` default; `transition` or `tokens` only after migration | Local absent, safe default; hosted unverified |
| `AEVIC_LEGACY_SESSION_UNTIL` | Functions | No | Required ISO UTC cutoff in transition mode | Local absent; hosted unverified |
| `TEAM_MEDIA_PROVIDER` | Functions | No | `cloudinary` to enable new public artwork uploads | Local present; hosted unverified |
| `CLOUDINARY_CLOUD_NAME` | Functions | No | Required for Cloudinary provider | Local present; existing public CDN reads verified |
| `CLOUDINARY_API_KEY` | Functions | Yes | Required for Cloudinary provider | Local present; real upload not authorized/tested |
| `CLOUDINARY_API_SECRET` | Functions | Yes | Required for Cloudinary provider | Local present; real upload not authorized/tested |
| `SMTP_HOST` | Functions | No | Required when using SMTP | Local present; delivery unverified |
| `SMTP_PORT` | Functions | No | SMTP port, default 587; 465 implicit TLS | Local present; delivery unverified |
| `SMTP_USER` | Functions | Yes | Required when using SMTP; fallback sender | Local present; delivery unverified |
| `SMTP_PASS` | Functions | Yes | Required when using SMTP | Local present; delivery unverified |
| `EMAIL_FROM` | Functions | No | Verified sender; falls back to `SMTP_USER` | Local absent; fallback used; hosted sender unverified |
| `RESEND_API_KEY` | Functions | Yes | Alternative to complete SMTP; SMTP takes precedence | Local present; delivery unverified |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions | Yes | Only for existing storage integration requiring it | Local present; hosted unverified |
| `TEAM_MEDIA_BUCKET` | Functions | No | Existing storage fallback bucket | Local present; hosted unverified |
| `VITE_PUBLIC_MEDIA_ORIGIN` | Builds | No | Optional CSP/image origin | Local build validated |
| `VITE_SUPABASE_URL` | Builds | No | Optional legacy public media origin fallback | Build allowlist verified; hosted unverified |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Builds | No | Optional legacy public key; never service-role key | Build allowlist verified; hosted unverified |
| `VITE_INDEXABLE_DEPLOYMENT` | Builds | No | Optional indexing control | Build allowlist verified; hosted unverified |
| `VITE_AEVIC_INSTAGRAM_URL`, `VITE_AEVIC_TIKTOK_URL`, `VITE_AEVIC_YOUTUBE_URL`, `VITE_AEVIC_X_URL`, `VITE_AEVIC_LINKEDIN_URL`, `VITE_AEVIC_DISCORD_URL`, `VITE_AEVIC_TWITCH_URL`, `VITE_AEVIC_WEBSITE_URL` | Builds + Functions | No | Optional public social destinations | Local shared resolver/build validated; hosted unverified |
| `NODE_VERSION` | Builds | No | 22 from `netlify.toml` | Repository verified |
| `CONTEXT`, `COMMIT_REF`, `DEPLOY_ID` | Netlify-managed | No | Platform metadata; do not copy local values | Code handling reviewed; hosted logs unverified |

Do not change the session secret during this rollout: it also protects existing
TOTP ciphertext. Secret rotation requires a separate factor re-encryption plan.
Keep scanning enabled and keep credentials out of Builds and all `VITE_*` keys.
The local public-output scan is a supplemental check, not hosted scanner evidence.
