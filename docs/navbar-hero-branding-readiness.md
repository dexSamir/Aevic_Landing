# Navbar, hero and Google branding readiness — 1 November 2026

## Local changes

- `src/styles/public-shell.css`: one shared desktop item treatment for navigation, rules, login and account controls. Transparent top/footer uses underline hover/current/focus/open states and no item fills. Scrolled mode keeps the existing two independent group surfaces, uses rounded hover/current/open fills, and removes underline pseudo-elements entirely. Existing focus outlines, CTA styling, ARIA semantics and mobile navigation remain intact; reduced-motion disables transitions.
- `src/pages/HomePage.tsx`: image focal points changed from `55% 48%` / `63% 45%` to `55% 0%` / `63% 0%`. Top anchoring avoids vertically clipping the banner when `cover` overflows the hero. Tablet retains the desktop horizontal focal point; mobile switches at the existing 640px breakpoint. Narrow aspect ratios still require horizontal cropping. Source image, silhouette, Oswald/Raleway fonts, AVIF/WebP source sets, dimensions and eager/high-priority loading are unchanged.
- `src/pages/InformationPages.tsx`: privacy now describes actual account/contact/team/roster/media/support data, Google subject/email/verification/name data and purposes, public profiles, service providers, account/session security, browser storage and contact/deletion requests. Removed the obsolete assertion that account registration/login uses Supabase Auth. Terms now links to the actual regulations, privacy page and existing contact mailbox; its existing provisional legal status remains explicit. Shared section content accepts accessible inline links.
- `tests/e2e/navbar-branding-refinement.spec.ts`: rendered state/hover/focus checks, target-width hero and policy checks.

## Evidence behind privacy content

- `server/platform/registration.ts`: names, contact phone/email, team/tag and roster input.
- `server/auth/google-provider.ts`, `google-routes.ts`: direct OAuth uses only `openid email profile`; extracted identity is subject, verified email and available first/last names. No Gmail/Drive/contact access is requested. Account mapping, credentials, MFA, callbacks and sessions were not edited.
- `server/platform/account.ts`, `src/pages/routes/AccountProfilePage.tsx`: profile edits, bounded account export and deletion-request UI/API. Deletion creates a pending request; it is not immediate account erasure. Export is a provided subset, not a promise of every record.
- `server/emailDelivery.ts`, `server/config.ts`: configured SMTP and storage/media services. No unsupported claim about sale of data, retention periods, provider location or certification was added.
- `server/http.ts`, authentication/session paths: sanitized operational logs, device/session records, request limiting, password hashing and access checks.
- Existing public contact mailbox: `aevicesports@gmail.com` (already published by AEVIC).

## Google-controlled branding

The user's screenshot shows `aevic-esports.netlify.app` rather than the Supabase hostname in that observed chooser. This is evidence of the observed provider transition, not an independent live login test. Local direct-flow configuration and callback remain unchanged.

Frontend CSS, favicon and policy text cannot force Google's chooser logo/name. In the Google Cloud project owning the currently used OAuth client:

1. Google Auth Platform → Branding: set App name to **AEVIC Esports**, upload the genuine AEVIC logo, and confirm monitored User support email and Developer contact information. Google recommends a square 120×120 logo, below 1 MB, in PNG/JPG/BMP.
2. Keep homepage/privacy/terms URLs pointed at meaningful, reachable pages. Current serving origin is `https://aevic-esports.netlify.app`, with `/privacy` and `/terms`. Do not point reviewers to `https://aevicesports.com` before it serves the actual relevant website and policies.
3. Domain ownership is separate: an appropriate project owner/editor should verify the owned `aevicesports.com` through Search Console, using Google's provided verification method, then configure it as an Authorized domain as appropriate. The owner performs any required DNS verification. No DNS change was made here. Do not claim ownership of the shared `netlify.app` parent; resolve current-host verification using Google's supported site ownership process and console requirements.
4. Before moving the published homepage to the owned domain, arrange the real website/policy hosting and public links there. A domain being owned or verified does not make an empty homepage ready. This task does not move hosting or change the working OAuth redirect.
5. Review Draft Branding versus Published Branding. Submit **Verify Branding** after resolving ownership/content issues. Review reported issues; after approval use **Publish branding**. Audience publishing status and branding verification are separate controls. Google determines approval and final display.

Reference: [Google Auth Platform branding guidance](https://support.google.com/cloud/answer/15549049). A saved draft does not by itself become the chooser's public branding.

## Owner confirmation still required

This is a source-grounded privacy disclosure update, not certification of legal compliance or Google approval. Before submission, the owner should confirm:

- The responsible operator/legal identity and an appropriate privacy contact; the existing public mailbox is used here but its monitoring was not tested.
- Actual retention/deletion policy by data category, review process and response times, treatment of published tournament records and backups. The code provides a request, not a completed erasure workflow.
- Deployed SMTP/media vendors, hosting/data regions, contractual arrangements and any transfers or additional analytics outside this repository.
- Applicable audience/age requirements and final Terms approval. The Terms page remains explicitly provisional and must not be represented as final approved terms.

No retention duration, company registration, legal entitlement, security guarantee or Google verification outcome has been invented.

## Public reachability

A read-only Chromium visit to both live `/privacy` and `/terms` returned HTTP 200, redirected to their trailing-slash equivalents, rendered meaningful headings/body text and required no login. Live privacy still showed the prior 788-character “Məxfilik məlumatı” content; live Terms had 537 characters. These local improvements will not appear there until a separately authorized deployment. The actual destinations configured in Google Cloud were not accessed; the owner must verify they match these pages. No Google account was selected and no live OAuth callback was completed.

## Validation

- `npm run lint` passed TypeScript checks; production build passed, including prerendering and the public-output secret scan. Existing asset-placeholder warnings appeared during Vite transformation.
- Nine focused component tests passed (footer observation, Google UI and redirect validation).
- Eight existing mocked OAuth browser tests passed across direct/Supabase, login/register and desktop/mobile; no live Google login was attempted.
- Three new browser scenarios passed; one duplicate desktop-only navbar scenario was intentionally skipped on the mobile project. Checks include exclusive indicator states, both groups, keyboard outline, footer reset, direct navigation/reload/back, mobile account-menu opening/Escape, policy accessibility and no horizontal overflow.
- Actual screenshots were inspected at 1920, 1440, 1280, 768, 390 and 320px. Desktop banner top is now retained; narrow screens necessarily crop horizontally while retaining the foreground silhouette. Evidence: `work/branding-refinement/`.
- AVIF/WebP assets and byte sizes are unchanged; high fetch priority/eager loading and existing responsive sources were verified. No measured LCP improvement is claimed.
- Inline links in `src/styles/public-pages.css` are gold and underlined so policy actions are identifiable without hover.
- Live privacy/terms HTTP and rendered-content checks are recorded above. `git diff --check` passed. No commit, push, deployment, DNS or environment change was made.
