# AEVIC Platform Architecture

## Layers

- `src/app`: router, protected-route boundaries, and PWA registration.
- `src/types`: reusable tournament, team, organization, achievement, public-profile, media, result, notification, ban, and sharecard domain models.
- `src/services`: backend-facing contracts and adapter selection.
- `tests/fixtures`: isolated deterministic component/browser fixtures; never imported by application code.
- `src/components`: common primitives plus brand, tournament, team, admin, form, and feedback components.
- `src/features`: feature-specific interaction modules such as check-in, sharecards, results, and authentication.
- `src/layouts`: public, auth, team, and admin application shells.
- `src/pages`: route-level composition only; large data objects remain outside page components.
- `src/styles`: tokens, global rules, component grammar, page composition, and responsive behavior.

## Service Boundary

`PlatformServices` groups auth, registration, tournaments, teams, achievements, organizations, public profiles, public matches, media, rooms, results, notifications, and admin contracts. The application always uses `apiAdapter`, which calls the same Hono routes through Vite locally and Netlify Functions in deployment. Backend errors never substitute fixtures.

`RegistrationService` covers team-name availability, roster validation and signup. The adapter sends registration through Supabase Auth via the function; Auth owns password hashing and email confirmation. The signup database trigger atomically provisions the profile, pending team, owner membership and five-player roster. Database uniqueness and roster constraints remain authoritative. Public lookup responses do not disclose private PUBG identities. Browser draft autosave excludes passwords.

`OrganizationService` owns organization discovery, team linking, unlinking, and organization social updates. `PublicProfileService` resolves team profiles without exposing protected team-panel state. `MediaService` validates and uploads supported team identity media; organization binary uploads are unavailable. `AchievementService` enforces the three-item featured badge limit and rejects locked badges.

### Public discovery API contract

- `GET /teams?query=` → approved `PublicTeamSummary[]`; never return private player UID/contact fields.
- `GET /teams/:slug` → `PublicTeamProfile`; return `404` for hidden, rejected, or unknown teams.
- `GET /teams/:id/matches` and `GET /teams/:id/upcoming-match` → published round history and the next public schedule item.
- `GET /teams/:id/seasons` → `TeamSeasonSummary[]`; `GET /teams/:id/map-performance` → `TeamMapPerformance[]`. Empty official history returns empty arrays.
- `GET /tournaments/:id/participants` → confirmed `TournamentParticipant[]` only: a public team summary, public IGN/role roster projection, and `registrationStatus: confirmed`. The UI never substitutes the public team directory when this endpoint is empty or unavailable.
- `GET /matches?status=upcoming|live|completed` maps to `PublicMatchService.schedule/history`. Live delivery should use an authenticated publishing pipeline plus SSE/WebSocket invalidation, not client-generated state.
- `GET /teams/:id/follow`, `POST /teams/:id/follow`, and `DELETE /teams/:id/follow` map to optional generic `FollowService`. Follow preferences use authenticated database persistence; no local storage fallback claims a successful account write.

### Competition intelligence and archive contracts

- `GET /teams/:id/form` returns up to the ten newest published official matches in descending chronological order. The UI derives WWCD and placement bands without inventing win/loss semantics.
- `GET /teams/:id/map-specialization` returns per-map sample counts and averages. Until an official composite score exists, `Best Map` means the eligible map with the highest average published points; the deterministic minimum is three matches.
- `GET /leaderboards/:id/snapshots` and `GET /leaderboards/:id/movement` must compare the current table only with the immediately previous published snapshot. The repository reconstructs cumulative published standings from current corrected official rows; movement compares the final two snapshots.
- `GET /records`, `GET /records/:id`, and `GET /records/:id/history` return `RecordEntry` provenance including match, map, achieved date, and historical roster snapshot status. Production records support the two single-match categories proven by official published results. Missing historical rosters are never substituted with the current roster.
- `GET /tournaments/:id/recap` returns deterministic `TournamentRecapData` only for completed tournaments. Champion, final standings, MVP, and top-player awards remain absent unless authoritative results or official award calculations exist.
- `GET /tournaments/:id/calendar` and `GET /matches/:id/calendar` return timezone-aware public `CalendarEventData`. Calendar exports exclude room credentials and private participant data.
- `POST /follows`, `DELETE /follows/:entityType/:entityId`, and `GET /me/follows` use generic `TEAM | PLAYER` entities. `PlatformServices.follows` is optional; no localStorage fallback presents itself as account persistence.

Records Center, tournament recap, and profile-card studio routes are lazy-loaded. Profile cards reuse the existing `html-to-image` DOM export pipeline and expose only public career metrics. QR codes are generated locally from the public team URL with the lightweight `qrcode` encoder and embedded into PNG exports; no external QR service or private data is used.

All production list endpoints need cursor pagination, stable ordering, cache validators, visibility filtering, and consistent loading/empty/error semantics. Search must be server-normalized for Azerbaijani case rules. Follow mutations require an authenticated user, idempotency, rate limiting, and durable preference storage.

## Security Boundary

Client route guards improve navigation but do not authorize access. Production services must enforce identity, roles, team ownership, tournament eligibility, room release time, ban state, result publishing, upload policy, notification delivery, and immutable audit events. The service worker never caches `/api/`, auth, room, credential, message, or admin responses.

## State Strategy

Route data is read from service adapters. Local component state owns transient UI such as form steps, selections, dialogs, tabs, draft values and pending submission state. The query/cache layer deduplicates reads, invalidates affected resources after acknowledged writes and clears private state when session identity changes.

## PWA

`public/manifest.webmanifest` defines install metadata and supplied-brand icons. `public/sw.js` caches only the static application shell and same-origin non-sensitive assets. Public install UI appears only when `beforeinstallprompt` is available, or after an intentional iOS install action; it stays hidden in standalone mode. Offline UI never claims live data is current. Auth, team workspace, admin, API, room, credential, and message paths are excluded from runtime caching. Update behavior is registration-ready; push subscription is intentionally not claimed as functional.

## Sharecards

`SharecardGenerator` renders isolated DOM templates and exports PNG via `html-to-image`. Two factual template families exist: tournament result and leaderboard standings. Both are deterministic functions of published official results; speculative performance and MVP templates remain unavailable until those datasets have authoritative fields. Generated images contain no room credentials, prize data, or other sensitive state.

`TeamAchievementSharecardData` is a domain-only payload for a possible future achievement sharecard. It does not create a fifth poster family or alter the supplied poster artwork.

## Daily Competition and Achievement Modules

`DailyTournamentCard` composes `TournamentCountdown`, `SlotProgress`, and `MapRotationPreview`. Public and team routes reuse it while passing a surface and participation state, keeping availability and actions consistent without coupling UI to page-specific copy.

`AchievementMedal`, `AchievementProgress`, `AchievementGrid`, and `TeamLegacyProfile` render the team record. Achievement art is intentionally represented by faceted `ART PENDING` placeholders; those shapes are scaffolding, not final badge artwork. `FeaturedBadgeCabinet` always limits spectator display to three unlocked items. `BadgeCabinetEditor` uses `BadgeReorderList` for native pointer drag-and-drop plus explicit up/down controls that remain keyboard accessible. `BadgeCollectionDrawer` presents earned badges in a focus-managed dialog. Achievement persistence is isolated behind `AchievementService`; earned values derive from official results; featured selections persist in the backend.

## Organization and Team Identity

`Organization` never contains PUBG roster fields. It owns cross-game identity and a list of `OrganizationTeam` references whose `gameKey` routes future game adapters. `Team` keeps game, roster, approval, social, banner, optional `organizationId`, and a relationship state. Independent teams remain first-class.

Public routes are `/organizations`, `/organizations/:organizationSlug`, `/teams`, `/teams/:teamSlug`, `/teams/compare`, and `/matches`. Team badge management is `/team/badges`; restrained admin review is `/admin/organizations`. These routes compose reusable identity, discovery-card, roster, career, schedule, match-history, social, verification, background-media, and banner components.

### Public profile and private panel boundary

`/teams/:teamSlug` is the canonical spectator-facing team identity. Every team uses the same continuous editorial architecture—hero, next match, recent form, identity, roster, performance, matches, achievements, career, and contextual sharing—whether the background is a supplied banner or the neutral AEVIC fallback. There is no visible intra-page navigation. Stable section IDs remain only for backward-compatible hash deep links and never swap or hide page content.

Team specialization is computed from published match history, not stored as display copy. The frontend evaluator requires at least eight eligible matches and ranks deterministic, evidence-gated candidates: Top Three (at least four top-three finishes and a 45% rate), WWCD (at least two wins and a 20% rate), Kill Pressure (at least seven average kills), Consistency (average placement at most five with placement standard deviation at most 2.4), and map specialization (at least four matches on one map with a 15% average-point lift over the team baseline). The highest normalized candidate score wins; no candidate means no specialist claim. A production backend may replace this calculation by returning the same typed specialization object with `type`, localized `label`, `score`, `sampleSize`, and factual `evidence`.

`/team` and its child routes are the authenticated captain workspace. They prioritize the next required action, tournament participation, check-in, room release, roster control, messages, and sharing tools. The public profile and private panel share domain data and brand primitives, but they intentionally do not share page composition or expose the same information.

Team social links are updated through `TeamService`; organization social links remain in `OrganizationService`. Neither set is inherited automatically. URLs are centralized by platform metadata, filtered to HTTP(S), rendered only when configured, and opened with `noopener noreferrer`.

Brand image inputs accept PNG/JPEG/WebP sources up to 6 MB. The browser preserves the logo crop workflow and processes brand images before transport, with a 4 MB file ceiling. The API independently validates bytes, dimensions and MIME, re-encodes WebP and writes to Supabase Storage under authorized random keys. Explicit deletion removes stored identity assets. Frontend validation and preview are usability features, not a security boundary.

## Official Visual Assets

`src/assets/official` is the single optimized runtime source for supplied competition visuals. `src/assets/brand/aevic-phoenix-source.png` is the only active AEVIC logo and is consumed by `BrandMark`, auth, public, team/admin shells, loading states, and sharecard-capable brand components. The 192px and 512px PWA icons are generated from the same transparent source with `purpose: any` so maskable cropping is never implied. `officialAssets` centralizes imagery and `officialRotation` centralizes the fixed Erangel–Miramar–Rondo–Erangel sequence.

## 2026 Platform Quality Boundary

The application always constructs `createApiServices` in `src/services/index.ts`. Both development and production call the same Hono routes using same-origin cookies. Vite mounts that Hono app at `/api` for local development; Netlify mounts it in the existing function for deployment. Server environment variables must be explicitly supplied, and missing configuration returns a structured 503. There is no data-source selector or application fixture adapter.

`ApiAdapter` implements every current contract with same-origin credentials and sanitized status-only errors. Production capabilities include public search, match detail, season archive, official team records and period-bound team Wrapped. Public individual-player statistics remain gated because official per-player scoring is absent. Implemented route modules and availability gates are documented below; unsupported operations fail explicitly.

`queryCache.ts` is a dependency-free first cache layer with explicit public-directory, public-competition, historical, and account stale times, request deduplication, shared cancellation, bounded retry, manual invalidation, and optional focus refetch. It serves production data routes and receives scoped invalidation from authenticated Realtime subscriptions and read polling. Keep one cache convention if migrating to a library for future SSR needs.

Public routes include `/matches/:matchId`, `/archive`, and `/teams/:teamSlug/wrapped/:year`. Individual-player profile routes remain unavailable; PUBG IDs and contact data are private. Match detail never includes lobby credentials. Historical roster models require captured snapshots and must not substitute the current team. Archive is an index over canonical tournament and recap pages.

AEVIC Wrapped derives from the same published `MatchHistoryEntry` source used by Career and profile surfaces. `deriveWrappedSummary` is period-bound, requires at least three matches, gates best-map claims behind three matches on the same map, includes server-derived period championships, earned badges and official records when available, and omits unsupported MVP, percentiles and streaks. Dedicated Canvas templates generate 1080×1080, 1080×1350, and 1080×1920 PNGs from public fields only. Production serves `GET /teams/:slug/wrapped?year=` using those official result rows and the same `WrappedSummary` contract.

The service worker no longer fetches Vite's internal manifest during install. Optional shell entries are cached independently with `Promise.allSettled`, hashed assets are cached after successful public requests, navigation is network-first, and protected/API paths are excluded. A failed optional icon can no longer abort installation.

Client-side route metadata updates title, description, canonical, OpenGraph, and Twitter fields. `scripts/prerender-public.mjs` creates crawler-visible HTML shells for ten stable public indexes after the Vite build. Production builds identified by Netlify `CONTEXT=production` or `REQUIRE_PUBLIC_SITE_URL=true` fail without `PUBLIC_SITE_URL`; configured builds emit absolute canonical, OG, sitemap, and robots URLs. Dynamic team, player, tournament, recap, record, and Wrapped metadata still requires API-aware SSR or edge rendering and is not claimed as complete.

## Implemented backend boundary

`apiAdapter` calls the same-origin `/api` Hono application exported by `netlify/functions/api.ts`. Route modules separate Auth, public competition, workspace operations, identity governance and media. Validation uses Zod; structured errors contain a request ID and no raw database/Auth stack. The `aevic` schema is isolated from legacy `public` data. Six reproducible migrations define normalized tables, indexed access paths, RLS, authorized transactional RPCs, Storage policies and Realtime publication. The old public-context function is not the routed production API or a fallback.

Supabase Auth validates server-managed HttpOnly cookies. Ordinary database reads and commands carry the caller's access token and remain subject to RLS. Privileged clients are created only for Auth administration, validated media operations and rate limiting. No service credential reaches the frontend. Origin validation protects state-changing cookie requests. Result publication is atomic across all approved participants, and corrections append immutable version rows with expected-version checks. Statistical views derive from the official result source.

Team Realtime subscriptions are lazy, cleaned up and backed by safe read polling. Query invalidation retains stale content during refresh so drafts survive transient failures, while session identity changes and logout clear private cache immediately. Endpoint/list adapters preserve their existing typed shapes; list cursors are currently validated numeric offsets with deterministic ordering.

See [backend setup](docs/BACKEND_SETUP.md) for the full local workflow, availability boundaries and mandatory staging gates. Auth/Storage/Realtime are wired but have not been exercised against a live Supabase project in this task. Detailed device inventory, MFA setup/challenge UX, async exports, push/mail notification workers and individual-player scoring remain unavailable rather than simulated.

## Team workspace ownership (September 2026)

`TeamRoute` loads static workspace CSS before rendering its protected layout. Public pages, auth forms, registration fields, Team operations, profile components, Share Studio and Wrapped each own their relevant stylesheet; no runtime CSS injection is used. Heavy generators and media previews are imported only by their consuming route or interaction. The public team canvas starts when its section approaches the viewport.

`/team/profile` reuses `PublicTeamIdentity` for a local preview. Identity fields and social links have acknowledged writes, and the crop editor uploads its processed binary File through the media service. Unsaved previews are labeled; server failures retain the draft. Public captain identity comes from the roster IGN, never account contact details. Official career and competition metrics remain read-only. Acknowledged social, preference, check-in and withdrawal responses update the existing query snapshot without duplicate reads.

`/team/career` groups official metrics, Erangel/Miramar/Rondo statistics and year-filtered Wrapped. Existing history, comparison, badges and PNG generators remain available. `/team/settings` stores notification preferences through `NotificationService`. The management route uses authority membership and existing capability gates; destructive flows require an explicit review and confirmation; supported operations persist through authorized RPCs.

## Integration follow-up

The sixth migration adds role-scoped contact projection, versioned tournament edits and unique published placement enforcement. It explicitly revokes PostgreSQL PUBLIC EXECUTE defaults while retaining named-role grants. Successful API mutations invalidate cached dependencies; account changes invalidate private state and signal other tabs without sharing tokens. Current and cumulative leaderboard projections use the same ranking function. Cumulative snapshots are reconstructed from currently corrected official rows; they are not immutable past-version snapshots.
