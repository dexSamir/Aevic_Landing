# Targeted production fixes — 1 November 2026

## Implemented

- `src/layouts/layouts.tsx`, `src/styles/public-shell.css`: top sentinel and existing footer IntersectionObservers control two matching desktop surfaces. Logo stays separate; underline active/hover/focus states replace the measured active pill. Mobile navigation is retained. Reduced motion disables transitions.
- `src/pages/routes/LoginPage.tsx`, `src/styles/auth.css`: alert now shares the login card's inner content width with the form, including mobile padding and long-message wrapping.
- `src/styles/team-workspace.css`: only the five `.team-stat-ledger` cells receive transparent backgrounds, subtle 1px borders and 10px corners. Dynamic values and other card surfaces remain unchanged.
- `src/styles/home.css`, `hero-fonts.css`, `src/assets/fonts`: Oswald 700 headings and Raleway body/UI restored from `bb4b362^` only inside the homepage hero; Inter remains elsewhere. Original font licenses restored.
- `src/assets/home/hero-*`: exact supplied Image 6 re-encoded at five widths in AVIF, WebP and JPEG. No generated replacement. Eager/high-priority picture, dimensions and responsive source selection retained. Reproduce with `scripts/optimize-home-hero.mjs <original PNG>`.
- Recovery pages and `src/services/apiError.ts`: synchronous duplicate-submit guards, 60-second resend delay matching the captain backend, longer Retry-After support, neutral request receipt, latest-request explanation, and a fresh-link action for tokens invalidated between inspection and confirmation.

## Google: configuration remains external

No live Cloud Console, Supabase configuration, DNS or SMTP logs were available through connected tools. The screenshot establishes use of the Supabase-mediated provider at capture time; repository configuration supports both direct and Supabase providers. Neither live branding nor delivery has been verified or changed.

1. Google Cloud → Google Auth Platform → Branding, in the project that owns the OAuth client used by Supabase:
   - App name: `AEVIC Esports`.
   - App logo: approved AEVIC logo; User support email and Developer contact information: monitored owner addresses.
   - Application home page: the verified production origin; Privacy policy: `<origin>/privacy`; Terms of service: `<origin>/terms`.
   - Authorized domains: the registrable AEVIC domain actually owned and verified in Search Console. No owned custom domain was established from the supplied materials; do not invent one or claim ownership of `netlify.app`.
   - Submit/publish Branding verification; inspect Audience publishing status separately. An edited draft is not necessarily the branding users see.
2. With the existing Supabase provider, Google Auth Platform → Clients → Web application → Authorized redirect URIs must retain `https://nmjjibifcuzjlsvfcaaz.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Sign In / Providers → Google: verify the matching client ID/secret. Authentication → URL Configuration: Site URL is the deployed production origin (currently documented as `https://aevic-esports.netlify.app`); allow the application return callback `https://aevic-esports.netlify.app/api/auth/google/callback` with its state query as required by Supabase URL matching. Keep the callback's state validation intact. Google’s callback and the application’s return callback are different endpoints.
4. To replace the raw Supabase hostname while retaining this provider, provision an actual owned subdomain through Supabase Custom Domains. Add the exact CNAME and ownership-verification TXT values supplied by Supabase, verify/activate it, and add `https://<verified-auth-subdomain>/auth/v1/callback` to the Google client **in addition to** the existing callback before activation. Verify that both callbacks belong to the same project.
5. This repository deliberately pins the original project in `server/config.ts` and the frontend authorization redirect in `src/utils/googleOAuthRedirect.ts`. Merely changing `SUPABASE_URL` to a custom domain will fail. Once the exact domain is verified, a scoped follow-up must admit that exact origin in both guards and test authorize, PKCE exchange and user lookup against the same project. Do not replace those guards with an arbitrary-host allowlist.
6. An alternative already implemented is `AEVIC_GOOGLE_PROVIDER=direct`, with server-only `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and Google Authorized redirect URI `<PUBLIC_SITE_URL>/api/auth/google/callback`. This bypasses Supabase OAuth, so it is an explicit provider migration, not part of this patch. Verify existing Google subject mappings, account linking and MFA before selecting it.

Brand verification can improve the displayed app name; it does not by itself guarantee removal of the hosted Supabase domain everywhere in Google's account chooser. See [Google branding](https://support.google.com/cloud/answer/15549049), [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), and [custom domains](https://supabase.com/docs/guides/platform/custom-domains).

## Recovery: evidence and operational follow-up

The active `createApp` registers administrator recovery and captain recovery. Captain recovery calls the application SMTP mailer; `server/routes/auth.ts` contains an older Supabase recovery handler but is not mounted by this app. Configuring Supabase Auth SMTP alone therefore does not repair this application's recovery delivery.

Observed in source:

- Captain recovery has a minimum two-second response floor to reduce account enumeration, and suppresses replacement tokens issued less than 60 seconds earlier. The old UI offered resend after only 30 seconds.
- Accepted later requests replace the stored token digest. A delayed older message can therefore be invalid, consistent with the reported sequence; the actual incident cause requires delivery timestamps.
- Tokens expire after 30 minutes, remain single use, and are inspected without consumption. Atomic confirmation rejects concurrent reuse. Tokens use URL fragments in application mail and are removed from the browser URL on entry. Password changes invalidate the prior credential/session state.
- Missing accounts, account throttles and SMTP delivery failures deliberately share a neutral receipt. SMTP failures emit only `AEVIC_RESET_DELIVERY_FAILED`. Public UI must not claim confirmed delivery.
- SMTP uses TLS with certificate checks, 8-second connection/greeting/DNS and 10-second socket timeouts. These are transport limits, not measurements of inbox latency. No token lifetime/security changes were made.

Operator checks:

1. Inspect deployed `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, and `PUBLIC_SITE_URL` privately. The sender must be verified by the SMTP provider; verify SPF/DKIM and DMARC alignment.
2. Correlate the request time and Netlify function duration / `AEVIC_RESET_DELIVERY_FAILED` event with the provider's accepted, queued, deferred, delivered and bounce events. Compare message Received headers to distinguish submission latency from provider/recipient delay. Do not export reset links or message bodies into logs.
3. Check provider quotas, sandbox restrictions, reputation and suppression lists. Disable link tracking/rewrite for recovery mail where the provider supports it. Validate the application link origin, not an arbitrary Supabase template.
4. For any separate service actually using Supabase Auth mail, inspect Authentication → Email → SMTP settings, Templates → Reset Password, URL Configuration and Rate Limits, plus Auth logs and SMTP delivery events. This is a separate delivery path; see [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
5. Run one controlled recovery request, record delivery timestamps, wait for the resend window, then verify the latest link works, the superseded link fails and successful reset rejects reuse. Production mail was not sent during this task.

## Focused security review

Reviewed OAuth state/browser binding, PKCE exchange, verified Google identity extraction, existing-account password/MFA linking, token hashing/expiry/atomic use, URL cleanup and neutral reset receipts. No confirmed new trust-boundary vulnerability was found in the changed paths. Live provider settings, delivery diagnostics and deployed domain ownership remain unverified. Existing account-linking and token-security controls were preserved.

## Validation results

- `npm run lint`: passed. Final `npm run build`: passed TypeScript, Vite, prerendering (97 static route shells / 98 definitions), and the public-output secret check. Vite emitted asset-placeholder warnings during transformation; no unresolved `__VITE_ASSET__` markers were found in final CSS.
- Component tests: 12 passed across footer visibility, Google redirect validation, Google auth UI and registration repair; 3 new recovery-feedback tests passed (duplicate requests / 60-second cooldown, longer Retry-After, superseded token confirmation).
- Focused server tests: 49 passed across captain authentication/recovery, administrator recovery, Supabase Google exchange and Google routes. These use fixtures, not live accounts or delivery.
- Playwright: final run 12/12 passed on desktop/mobile Chromium. Includes navbar top/middle/footer, matching separate surfaces, hero font and eager priority, 1440/768/390px overflow checks, exact login alert/form geometry, five outlined statistics cards, and both mocked OAuth-provider redirects from login/register. The existing OAuth test expectation was updated to include the already-implemented `remember: true` request field.
- Rendered screenshots inspected at desktop, tablet and mobile sizes; evidence is under `work/targeted-production/`. Mobile hero source selection was raised to reflect cover-image width rather than viewport width, avoiding enlargement of the 480px source.
- Supplied PNG: 2,212,345 bytes. Largest AVIF: 64,960 bytes (97.1% smaller), largest WebP: 108,484 bytes. This is asset-size evidence, not a measured production LCP improvement. No live LCP or email delivery-time claim is made.
- `git diff --check`: passed. No push or deployment. Existing `.gitignore`, regulations and `.serena` work was preserved.
