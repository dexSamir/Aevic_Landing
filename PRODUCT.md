# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AEVIC initially serves PUBG Mobile tournament visitors, team captains, approved teams, and tournament administrators. Most captains use the product on a phone between matches and need immediate answers about approval, registration, slot, check-in, room access, messages, and results.

## Product Purpose

AEVIC combines tournament discovery with the operational lifecycle of a team: registration, approval, tournament entry, check-in, room release, round results, history, roster control, announcements, and shareable performance artifacts. Success means teams understand their next required action in seconds and administrators can operate 20+ teams without side-channel spreadsheets.

## Positioning

AEVIC is not a campaign site with a dashboard attached. Public competition storytelling and verified tournament operations share one product model, so every status, deadline, slot, and result has a clear operational meaning.

## Operating Context

- Public visitors discover upcoming tournaments, rules, point formulas, champions, and leaderboards.
- Captains register a five-player team and wait for an explicit approval decision.
- Approved teams join tournaments, check in, receive time-gated room credentials, review messages, manage eligible roster changes, and withdraw deliberately.
- Administrators configure tournaments, approve teams, manage slots/check-in, publish per-round results, send announcements, and enforce bans.
- The current implementation is a frontend demonstration backed by clearly isolated fictional mock data.

## Capabilities and Constraints

- React, TypeScript, Vite, React Router, local font packages, DOM-to-image export, and a dependency-free service worker form the client platform.
- Authentication, authorization, push/email delivery, uploads, secure room release, audit logs, and persistence require backend implementation; frontend route guards are not security boundaries.
- Sensitive room credentials are available only through a protected service contract and are excluded from service-worker caching.
- PUBG Mobile maps and point formulas are configurable domain data, not closed enums.
- Required routes cover public, team, and admin areas described in the build brief.

## Brand Commitments

- Name: AEVIC Esports.
- Direction: “AEVIC — Competitive Legacy.”
- Official assets: `src/assets/brand/aevic-phoenix-source.png` and `src/assets/brand/aevic-brand-board-source.png`.
- Official palette: gold, purple, red, orange, and dark neutrals from the supplied brand board.
- 946 Latin Wide 4 is the target display face; Orbitron is the explicit temporary fallback until a licensed asset is supplied. Raleway carries product UI, controls, and body copy.
- Motto: “Ad Aeternam Victoriam.” Values: teamwork, excellence, integrity, passion, respect, and legacy.
- The phoenix is a deliberate identity moment, never decorative filler.

## Evidence on Hand

- Supplied brand board: `src/assets/brand/aevic-brand-board-source.png`.
- Supplied source logo: `src/assets/brand/aevic-phoenix-source.png`.
- No real tournament database, sponsor list, champion archive, prize ledger, delivery provider, or production authentication backend was supplied. Demonstration names and values are fictional and labeled in the interface.
- Prize configuration is an internal admin concern. Public visitors and teams compete for reputation, ranking, performance, and championship legacy; money-related tournament data is never exposed on their surfaces or generated posters.

## Product Principles

1. Put the next consequential action before secondary information.
2. Make status, eligibility, deadlines, and lock states explicit in text.
3. Treat mobile as the primary operational surface, not a compressed desktop page.
4. Separate backend-dependent truth from safe frontend demonstration behavior.
5. Use brand energy for championship moments and calm density for operations.
6. Ask “what can I play today?” before presenting a secondary competition calendar.

## Daily Battlefield and Team Legacy

- `Today's Battlefield` is the primary daily discovery module. Availability, start time, remaining slots, registration countdown, map rotation, and one contextual action share a single hierarchy.
- The same opportunity model is used in the team dashboard with explicit `available`, `pending`, `full`, and `registered` participation states.
- Team achievements are durable competition records with `locked`, `progress`, and `unlocked` states. They certify championship, performance, consistency, fair-play, and legacy milestones without reward or money language.
- `Team Legacy` combines founded date, tournament count, wins, top placements, kills, and unlocked achievements into a reusable team identity surface.
- `TeamAchievementSharecardData` defines a future achievement sharecard payload only; the current supplied poster families and artwork remain unchanged.

## Organizations and Public Identity

- A `Team` is a game-specific competitive roster. An `Organization` is the optional parent esports identity and owns only cross-game identity, social, media, staff-ready metadata, and team links.
- PUBG Mobile remains the only active game integration. `OrganizationTeam.gameKey` permits later Mobile Legends, Valorant, CS2, or other adapters without adding those games to the current roster model or presenting them as active.
- Teams remain valid when independent. Relationship states are independent, organization-owned, invitation pending, and archived; invitations and ownership transfer are mock/model states only until backend permissions exist.
- Public discovery supports organization name and verification filtering. Public organization and team profiles show only configured social links and distinguish AEVIC verification crests from earned achievement insignias.
- Team and organization banners accept PNG, JPG, or WebP preview files up to 6 MB. A 16:5 composition is recommended, the central 60% is the mobile-safe crop, and a product gradient remains the fallback when no usable image exists.

## Badge Cabinet

- Achievements use competition, combat, participation, consistency, seasonal, legacy, and special categories with bronze, silver, gold, phoenix, and legacy tier materials.
- Public team profiles feature exactly three unlocked badges in a deliberate order. “View all badges” opens the earned collection; locked badges stay out of the spectator-first wall.
- Captains can select only unlocked badges, preview the public cabinet, reorder with pointer drag-and-drop, or use explicit keyboard-operable move buttons. Save feedback includes loading, success, error, and disabled states.
- Featured badge selection is limited to three in both UI and `AchievementService`; backend persistence must enforce the same rule.

## Backend Requirements for Identity Features

Production still requires organization roles and ownership permissions, team-to-organization invitations, persistent social-link validation, object storage, crop metadata, image moderation, badge unlock calculation, featured badge persistence, public visibility controls, verification review, and immutable audit logging. Mock adapters demonstrate contracts and safe states; they do not provide security.

## Accessibility & Inclusion

Target WCAG AA where practical with semantic landmarks, real labels, keyboard navigation, visible focus, 44×44px touch targets, non-color status cues, reduced-motion support, responsive data lists, and no page-level horizontal overflow at 390×844.

## AEVIC Wrapped

Wrapped is the seasonal storytelling layer over verified Career data, not a separate statistics system. A team Wrapped exists only for an explicit year or season with at least three published matches. It may show matches, kills, WWCD, podium finishes, a sample-gated best map, the strongest kill game, period achievements, and official records when the source proves them. Unsupported percentiles, MVPs, championships, streaks, and player statistics remain absent.

The primary experience is a seven-to-nine-screen mobile story with keyboard and touch controls, reduced-motion parity, and a bounded desktop viewport. Sharing uses deterministic 1:1, 4:5, and 9:16 public-only templates. Career Summary stays the persistent factual view; Wrapped turns the same period-bound source into a memorable narrative.
