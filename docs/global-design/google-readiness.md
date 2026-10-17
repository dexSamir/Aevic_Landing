# Google OAuth readiness — 12 October 2026

## Current decision
Prepared for controlled provider verification; **not approved for activation**. Production `/api/auth/google/status` returned `{"enabled":false}`. Local Google flag is false and session mode is legacy. No credentials were printed, copied, regenerated or changed. No migrations were run.

## Verified

| Boundary | Evidence |
|---|---|
| Authorization | Server-side code flow; random browser-bound state, nonce, S256 PKCE; callback generated as site origin + `/api/auth/google/callback`; exact URI asserted in route test |
| Token validation | RSA signature, RS256 restriction, Google issuer, audience/authorized party, nonce, expiry, future issue time, verified email and stable subject checked; tampering tests pass |
| Replay / expiration | Authorization flow deleted before exchange; 10-minute expiry; locked continuation consumed in transaction; callback and continuation replay tests pass |
| Account linking | Matching email alone does not link; password checked, account locked, conflicting identity constrained, MFA required; stable previously linked subject used for subsequent login |
| Registration | Existing continuation integration preserves verified identity/email and attaches within account transaction; altered email / duplicate identity tests pass |
| Session compatibility | Legacy cookie path and configured rotating-token path tested; legacy remains selected |
| CSRF / logout | Same-origin HTTP middleware; HttpOnly browser cookie; cross-origin start/complete rejected; logout clears pending Google flow and retains existing logout handler |
| Database | Existing migration inspected only. Configured local connection sees both tables with RLS and SELECT/INSERT/UPDATE/DELETE privileges. No user rows read and no writes performed |
| Reachability | Production callback without state/code returns HTTP 303 to `/login?google=failed`, which confirms routing and safe failure, not successful provider authentication |
| Configuration presence | Local client ID and secret exist; local configured callback origin matches expected production URI. Secret values never emitted |

Reference: [Google OpenID Connect server flow](https://developers.google.com/identity/openid-connect/openid-connect). Redirect URI matching and consent configuration must be checked in Google Cloud, independently of local tests.

## Unresolved prerequisites

- Google Cloud client type, exact authorized redirect URI, audience/publishing status and authorized test-user access were not inspectable through available credentials/tools.
- Netlify's effective deployment-context secrets and runtime DB role were not independently compared to the local connection. A local permission check does not prove Netlify runtime permissions.
- Real-provider login/registration/linking/MFA has not been performed. No authorized Google test account was supplied.
- The local PostgreSQL integration server was absent; the broader DB suite could not initialize. Mock route tests do not replace this or a real-provider test.

## Exact manual verification sequence

1. In Google Cloud → Google Auth Platform → Clients, select the existing web client. Confirm `https://aevic-demo.netlify.app/api/auth/google/callback` is an authorized redirect URI. Do not copy the secret into chat or logs.
2. Check Audience and Branding. If external/testing, add or confirm the authorized test account in Test users. Confirm the requested `openid email profile` scope set.
3. Compare deployment-context configuration privately in Netlify. Keep production `AEVIC_GOOGLE_ENABLED=false` and `AEVIC_SESSION_MODE=legacy`.
4. For pre-activation testing, authorize an isolated test deployment with its own exact registered callback, approved test database and authorized account. This requires separate permission/configuration; it has not been created or enabled here. Production cannot complete this test while its feature flag is false.
5. On that deployment choose Google login, select the authorized account, consent and verify return to the expected origin. Test fresh registration, matching-email account with wrong then correct password, linked account, and MFA wrong/missing then correct code. Use approved test records only.
6. Refresh a protected page; verify restored identity. Log out; ensure protected access is rejected. Test cancellation, expired continuation and replay without saving codes/tokens in logs, screenshots or traces.
7. Confirm the deployment runtime DB role can operate the two Google tables and session/account dependencies. Record pass/fail evidence only.
8. After all checks pass, request explicit production activation authorization. Enable only Google, retain legacy session mode, deploy the reviewed build, and monitor sanitized failure counts.

## Rollback

If activation is later authorized and problems appear, restore `AEVIC_GOOGLE_ENABLED=false` and redeploy the approved previous build. Preserve identity tables, account records, existing passwords, MFA settings and all session secrets. Do not roll back by deleting identities or modifying user data. Existing password login remains the fallback.
