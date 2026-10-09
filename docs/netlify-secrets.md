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
