# AEVIC Frontend Architecture

## Layers

- `src/app`: router, protected-route boundaries, and PWA registration.
- `src/types`: reusable tournament, team, organization, achievement, public-profile, media, result, notification, ban, and sharecard domain models.
- `src/services`: backend-facing contracts and adapter selection.
- `src/mocks`: centralized fictional data and safe mock adapter behavior.
- `src/components`: common primitives plus brand, tournament, team, admin, form, and feedback components.
- `src/features`: feature-specific interaction modules such as check-in, sharecards, results, and authentication.
- `src/layouts`: public, auth, team, and admin application shells.
- `src/pages`: route-level composition only; large data objects remain outside page components.
- `src/styles`: tokens, global rules, component grammar, page composition, and responsive behavior.

## Service Boundary

`PlatformServices` groups auth, registration, tournaments, teams, achievements, organizations, public profiles, public matches, media, rooms, results, notifications, and admin contracts. The app currently selects `mockServices`; a production adapter can replace it without rewriting pages. Mock data is fictional and never contains real credentials.

`RegistrationService` defines the frontend boundary for team-name availability, active-tournament PUBG ID eligibility, known-player lookup, and idempotent team submission. A production adapter should map this to authoritative endpoints such as `GET /team-name-availability`, `GET /tournaments/:id/player-eligibility/:pubgId`, `GET /players/by-pubg-id/:pubgId`, and `POST /team-registrations`. Submission must accept an idempotency key, hash the password server-side, revalidate every name/player invariant, enforce rate limits, and return a durable registration status. The browser autosave intentionally excludes passwords.

`OrganizationService` owns organization discovery, team linking, unlinking, and organization social updates. `PublicProfileService` resolves team profiles without exposing protected team-panel state. `MediaService` validates and uploads team/organization identity media. `AchievementService` enforces the three-item featured badge limit and rejects locked badges.

### Public discovery API contract

- `GET /teams?query=` → approved `PublicTeamSummary[]`; never return private player UID/contact fields.
- `GET /teams/:slug` → `PublicTeamProfile`; return `404` for hidden, rejected, or unknown teams.
- `GET /teams/:id/matches` and `GET /teams/:id/upcoming-match` → published round history and the next public schedule item.
- `GET /teams/:id/seasons` → `TeamSeasonSummary[]`; `GET /teams/:id/map-performance` → `TeamMapPerformance[]`. The mock returns empty arrays until authoritative data exists.
- `GET /tournaments/:id/participants` → confirmed `TournamentParticipant[]` only: a public team summary, public IGN/role roster projection, and `registrationStatus: confirmed`. The UI never substitutes the public team directory when this endpoint is empty or unavailable.
- `GET /matches?status=upcoming|live|completed` maps to `PublicMatchService.schedule/history`. Live delivery should use an authenticated publishing pipeline plus SSE/WebSocket invalidation, not client-generated state.
- `GET /teams/:id/follow`, `POST /teams/:id/follow`, and `DELETE /teams/:id/follow` map to optional generic `FollowService`. Because the current adapter has no account-backed persistence, the public control is visibly disabled instead of storing a false preference in local storage.

### Competition intelligence and archive contracts

- `GET /teams/:id/form` returns up to the ten newest published official matches in descending chronological order. The UI derives WWCD and placement bands without inventing win/loss semantics.
- `GET /teams/:id/map-specialization` returns per-map sample counts and averages. Until an official composite score exists, `Best Map` means the eligible map with the highest average published points; the deterministic minimum is three matches.
- `GET /leaderboards/:id/snapshots` and `GET /leaderboards/:id/movement` must compare the current table only with the immediately previous published snapshot. The mock returns no movement, so movement is hidden.
- `GET /records`, `GET /records/:id`, and `GET /records/:id/history` return `RecordEntry` provenance including match, map, achieved date, and historical roster snapshot status. Current demo records are limited to the two single-match categories proven by published match history. Missing historical rosters are never substituted with the current roster.
- `GET /tournaments/:id/recap` returns deterministic `TournamentRecapData` only for completed tournaments. Champion, final standings, MVP, and top-player awards remain absent unless authoritative results or official award calculations exist.
- `GET /tournaments/:id/calendar` and `GET /matches/:id/calendar` return timezone-aware public `CalendarEventData`. Calendar exports exclude room credentials and private participant data.
- `POST /follows`, `DELETE /follows/:entityType/:entityId`, and `GET /me/follows` use generic `TEAM | PLAYER` entities. `PlatformServices.follows` is optional; no localStorage fallback presents itself as account persistence.

Records Center, tournament recap, and profile-card studio routes are lazy-loaded. Profile cards reuse the existing `html-to-image` DOM export pipeline and expose only public career metrics. QR codes are generated locally from the public team URL with the lightweight `qrcode` encoder and embedded into PNG exports; no external QR service or private data is used.

All production list endpoints need cursor pagination, stable ordering, cache validators, visibility filtering, and consistent loading/empty/error semantics. Search must be server-normalized for Azerbaijani case rules. Follow mutations require an authenticated user, idempotency, rate limiting, and durable preference storage.

## Security Boundary

Client route guards improve navigation but do not authorize access. Production services must enforce identity, roles, team ownership, tournament eligibility, room release time, ban state, result publishing, upload policy, notification delivery, and immutable audit events. The service worker never caches `/api/`, auth, room, credential, message, or admin responses.

## State Strategy

Route data is read from service adapters. Local component state owns transient UI such as form steps, selections, dialogs, tabs, draft values, and mock success feedback. Durable server state must move to a query/cache layer when a real backend is connected.

## PWA

`public/manifest.webmanifest` defines install metadata and supplied-brand icons. `public/sw.js` caches only the static application shell and same-origin non-sensitive assets. Public install UI appears only when `beforeinstallprompt` is available, or after an intentional iOS install action; it stays hidden in standalone mode. Offline UI never claims live data is current. Auth, team workspace, admin, API, room, credential, and message paths are excluded from runtime caching. Update behavior is registration-ready; push subscription is intentionally not claimed as functional.

## Sharecards

`SharecardGenerator` renders isolated DOM templates and exports PNG via `html-to-image`. Two factual template families exist: tournament result and leaderboard standings. Both are deterministic functions of supplied, published demo results; speculative performance and MVP templates remain unavailable until those datasets have authoritative fields. Generated images contain no room credentials, prize data, or other sensitive state.

`TeamAchievementSharecardData` is a domain-only payload for a possible future achievement sharecard. It does not create a fifth poster family or alter the supplied poster artwork.

## Daily Competition and Achievement Modules

`DailyTournamentCard` composes `TournamentCountdown`, `SlotProgress`, and `MapRotationPreview`. Public and team routes reuse it while passing a surface and participation state, keeping availability and actions consistent without coupling UI to page-specific copy.

`AchievementMedal`, `AchievementProgress`, `AchievementGrid`, and `TeamLegacyProfile` render the team record. Achievement art is intentionally represented by faceted `ART PENDING` placeholders; those shapes are scaffolding, not final badge artwork. `FeaturedBadgeCabinet` always limits spectator display to three unlocked items. `BadgeCabinetEditor` uses `BadgeReorderList` for native pointer drag-and-drop plus explicit up/down controls that remain keyboard accessible. `BadgeCollectionDrawer` presents earned badges in a focus-managed dialog. Achievement persistence is isolated behind `AchievementService`; current values come from the fictional mock adapter.

## Organization and Team Identity

`Organization` never contains PUBG roster fields. It owns cross-game identity and a list of `OrganizationTeam` references whose `gameKey` routes future game adapters. `Team` keeps game, roster, approval, social, banner, optional `organizationId`, and a relationship state. Independent teams remain first-class.

Public routes are `/organizations`, `/organizations/:organizationSlug`, `/teams`, `/teams/:teamSlug`, `/teams/compare`, and `/matches`. Team badge management is `/team/badges`; restrained admin review is `/admin/organizations`. These routes compose reusable identity, discovery-card, roster, career, schedule, match-history, social, verification, background-media, and banner components.

### Public profile and private panel boundary

`/teams/:teamSlug` is the canonical spectator-facing team identity. Every team uses the same continuous editorial architecture—hero, next match, recent form, identity, roster, performance, matches, achievements, career, and contextual sharing—whether the background is a supplied banner or the neutral AEVIC fallback. There is no visible intra-page navigation. Stable section IDs remain only for backward-compatible hash deep links and never swap or hide page content.

Team specialization is computed from published match history, not stored as display copy. The frontend evaluator requires at least eight eligible matches and ranks deterministic, evidence-gated candidates: Top Three (at least four top-three finishes and a 45% rate), WWCD (at least two wins and a 20% rate), Kill Pressure (at least seven average kills), Consistency (average placement at most five with placement standard deviation at most 2.4), and map specialization (at least four matches on one map with a 15% average-point lift over the team baseline). The highest normalized candidate score wins; no candidate means no specialist claim. A production backend may replace this calculation by returning the same typed specialization object with `type`, localized `label`, `score`, `sampleSize`, and factual `evidence`.

`/team` and its child routes are the authenticated captain workspace. They prioritize the next required action, tournament participation, check-in, room release, roster control, messages, and sharing tools. The public profile and private panel share domain data and brand primitives, but they intentionally do not share page composition or expose the same information.

Team social links are updated through `TeamService`; organization social links remain in `OrganizationService`. Neither set is inherited automatically. URLs are centralized by platform metadata, filtered to HTTP(S), rendered only when configured, and opened with `noopener noreferrer`.

Banner validation accepts PNG/JPEG/WebP up to 6 MB and returns a mock preview state. Production must add object storage, signed uploads, crop coordinates, minimum-resolution enforcement, content moderation, ownership authorization, and audit logs. Frontend validation and preview are usability features, not a security boundary.

## Official Visual Assets

`src/assets/official` is the single optimized runtime source for supplied competition visuals. `src/assets/brand/aevic-phoenix-source.png` is the only active AEVIC logo and is consumed by `BrandMark`, auth, public, team/admin shells, loading states, and sharecard-capable brand components. The 192px and 512px PWA icons are generated from the same transparent source with `purpose: any` so maskable cropping is never implied. `officialAssets` centralizes imagery and `officialRotation` centralizes the fixed Erangel–Miramar–Rondo–Erangel sequence.

## 2026 Platform Quality Boundary

Adapter selection is explicit: `VITE_DATA_SOURCE=mock|api`. `src/services/index.ts` is the only selection point; route components consume `PlatformServices` and do not branch on the adapter. `VITE_API_BASE_URL` configures the production root and `VITE_DEMO_MODE` controls fictional-data notices. A clean production build defaults to the API adapter; an explicit production `VITE_DATA_SOURCE=mock` fails the build. Production deployments should still set `VITE_DATA_SOURCE=api` and `VITE_DEMO_MODE=false` for unambiguous configuration.

`ApiAdapter` implements every current contract with same-origin credentials and sanitized status-only errors. The newly defined production capabilities are public search, player profile, match detail, season archive, and period-bound team Wrapped. Endpoint paths in the adapter are the frontend contract proposed where no backend route existed; backend owners may map them differently behind the adapter without changing pages.

`queryCache.ts` is a dependency-free first cache layer with explicit public-directory, public-competition, historical, and account stale times, request deduplication, shared cancellation, bounded retry, manual invalidation, and optional focus refetch. It is used on new server-driven routes. TanStack Query was evaluated but deferred: adding a broad migration before a production backend exists would create two server-state conventions. Replace this small cache as one unit when SSR hydration or live event orchestration is required.

Public routes added by this phase are `/players/:playerSlug`, `/matches/:matchId`, `/archive`, and `/teams/:teamSlug/wrapped/:year`. Player profiles never expose PUBG IDs or contact data. Match detail never includes lobby credentials. Historical roster models require captured snapshots and must not substitute the current team. Archive is an index over canonical tournament and recap pages.

AEVIC Wrapped derives from the same published `MatchHistoryEntry` source used by Career and profile surfaces. `deriveWrappedSummary` is period-bound, requires at least three matches, gates best-map claims behind three matches on the same map, and omits unsupported championships, MVP, percentiles, streaks, and records. Dedicated Canvas templates generate 1080×1080, 1080×1350, and 1080×1920 PNGs from public fields only. Production may replace client derivation with `GET /teams/:slug/wrapped?year=` while preserving `WrappedSummary`.

The service worker no longer fetches Vite's internal manifest during install. Optional shell entries are cached independently with `Promise.allSettled`, hashed assets are cached after successful public requests, navigation is network-first, and protected/API paths are excluded. A failed optional icon can no longer abort installation.

Client-side route metadata updates title, description, canonical, OpenGraph, and Twitter fields. `scripts/prerender-public.mjs` creates crawler-visible HTML shells for ten stable public indexes after the Vite build. Production builds identified by Netlify `CONTEXT=production` or `REQUIRE_PUBLIC_SITE_URL=true` fail without `PUBLIC_SITE_URL`; configured builds emit absolute canonical, OG, sitemap, and robots URLs. Dynamic team, player, tournament, recap, record, and Wrapped metadata still requires API-aware SSR or edge rendering and is not claimed as complete.

## Phase II backend contract

The repository now contains one deliberately narrow production backend boundary: the Netlify Function behind `GET /api/public/context`. It reads the legacy Supabase `teams` table with a publishable key, exposes only approved public team fields, and returns contract-compatible empty collections for domains that do not yet have authoritative production storage. It does not use mock fixtures or a service-role credential.

All other endpoints below remain typed client contracts in `ApiAdapter`; they must not be described as deployed backend behavior. The repository still has no database migrations, storage policies, mail worker, or implemented authenticated API surface. Every future state-changing request must use the authenticated cookie/CSRF boundary, and critical create/transfer/correction requests must carry an `Idempotency-Key`.

| Method | Route | Authentication / authorization | Request and expected response | Required errors / integrity |
| --- | --- | --- | --- | --- |
| POST | `/me/2fa/setup` | Account owner | none → expiring setup ID, otpauth URI, QR SVG | 401, 409; secret never logged |
| POST | `/me/2fa/setup/verification` | Account owner | setup ID + 6-digit OTP → one-time recovery codes | 400, 410, 429; atomic enable |
| POST | `/me/data-export` | Account owner | none → async export job | 401, 409, 429; excludes secrets and other users |
| POST | `/teams/:id/invitations` | `team.invite` | recipient + role → durable invitation | 403, 409, 422; idempotent |
| POST | `/team-invitations/:id/response` | Invite recipient | ACCEPTED/REJECTED → invitation | 403, 409, 410; single acceptance transaction |
| POST | `/teams/:id/ownership` | Current owner | eligible member + confirmation → authority list | 403, 409, 422; atomic, never ownerless |
| POST | `/teams/:id/archive` | Owner + `team.archive` | reason + confirmation → archived team | 403, 409; preserve historical snapshots |
| POST | `/organizations/:id/member-invitations` | Organization owner/manager | recipient + role → invitation | 403, 409, 422; idempotent |
| POST | `/organizations/:id/team-invitations` | Organization owner/manager | team ID → invitation | 403, 409, 422; team must accept |
| POST | `/organizations/:id/ownership` | Current organization owner | eligible member + confirmation → member list | 403, 409, 422; atomic |
| POST | `/players/:id/claims` | Verified account | method + evidence references → claim | 403, 409, 422; typed PUBG ID alone is insufficient |
| POST | `/admin/tournaments/:id/cancellation` | `tournament.cancel` | reason → cancelled tournament | 403, 409, 422; transaction + notifications + audit |
| POST | `/admin/tournaments/:id/archive` | `tournament.archive` | none → archived tournament | 403, 409; only completed/cancelled states |
| POST | `/admin/results/:id/corrections` | `result.correct` | result snapshot + reason + expected version → immutable version | 403, 409, 422; scoring validation + transaction |
| POST | `/verifications` | Entity representative | entity, socials, private evidence refs → pending request | 403, 409, 422; idempotent |
| PATCH | `/admin/verifications/:id` | `verification.review` | target status + reason + expected status → request | 403, 409, 422; audit + authoritative public badge |
| POST | `/me/support/tickets/:id/messages` | Ticket owner | body → updated ticket | 403, 404, 422; attachment scan if present |
| PATCH | `/admin/support/tickets/:id/status` | `support.reply`/`support.manage` | status + reason → updated ticket | 403, 409, 422; audit sensitive changes |

List contracts for players, invitations, notifications, support tickets, verification, missed check-ins, and future admin queues return `CursorPage<T>` with stable ordering and opaque cursors. API responses should include a request ID, and sanitized UI errors may expose that ID without stack traces.

### Required database entities (design only; no migrations exist)

Production persistence needs sessions, two-factor setups/recovery-code hashes, account export/deletion jobs, team authority memberships, team invitations, player claims, membership history, organization members, organization invitations, verification requests/evidence ACLs, notification events/preferences, support tickets/messages, roster requests, disputes, result versions, room-access events, badge unlock history, record/roster snapshots, and append-only audit events. Ownership transfer, invitation acceptance, tournament cancellation, result correction, roster replacement, and verification decisions require database transactions, unique constraints, expected-version checks, and durable audit correlation IDs.
