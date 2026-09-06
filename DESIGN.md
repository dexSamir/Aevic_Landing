---
name: AEVIC — Competitive Legacy
description: A dark, operational esports system built around the official crowned-phoenix identity, decisive tournament states, and earned legacy.
colors:
  brand-primary: "#f3c450"
  brand-secondary: "#6a1b9a"
  danger: "#e63946"
  warning: "#ff8c00"
  success: "#58bd79"
  bg-primary: "#0d0d0d"
  bg-secondary: "#141416"
  bg-elevated: "#1a1a1d"
  team-workspace: "#111012"
  team-chrome: "#0b0a0c"
  team-topbar: "#131215"
  team-surface-primary: "#18171a"
  team-surface-secondary: "#1e1c20"
  team-surface-raised: "#262329"
  team-surface-inset: "#0e0d0f"
  text-primary: "#f5f4f0"
  text-muted: "#b6b3ac"
  medal-bronze: "#c99a52"
  medal-silver: "#c8cbd2"
  medal-gold: "#f3c450"
  medal-legacy: "#f5e3a4"
typography:
  display: 946 Latin Wide 4 (Orbitron fallback until licensed asset is supplied)
  body: Raleway
rounded: restrained
spacing: compact-operational
components:
  button-primary: Gold action with dark text, 44px minimum target, restrained active scale
  status-badge: Semantic text and color with safe wrapping
  achievement-medal: Faceted tier-specific insignia using medal design tokens
  public-navigation: Left-grouped brand and discovery with right-aligned rules/account controls
  media-backdrop: Cover media with desktop/mobile focal points and bounded dark scrims
  public-team-card: Compact verified-team discovery card with roster metadata
  team-form: One continuous newest-to-oldest performance rail with separator-led results and WWCD prestige emphasis
  records-center: Provenance-led archive with a featured horizontal rail and historical-snapshot integrity
  profile-card-studio: Deterministic public share cards in 1:1, 4:5, and 9:16 formats
  team-workspace: Opaque warm-graphite operations shell with next-action-first hierarchy and restrained precision accents
---

# Overview

Competitive Legacy translates AEVIC's official low-poly crowned phoenix into a professional esports product. Public pages persuade through one editorial brand moment; team and admin pages prioritize operational clarity. The same approved official logo asset is used throughout public, authentication, profile, team, and admin surfaces.

The authenticated Team Panel extends this authority through **Operations Field**: a focused warm-graphite workspace for competition operations. It preserves the AEVIC gold, purple, Orbitron, and Raleway vocabulary while replacing undifferentiated black panels with a deliberate opaque surface hierarchy. `/team/tournaments` is the reference surface for this subsystem; the remaining `/team` routes inherit its chrome, density, control language, and next-action-first logic rather than becoming independent visual concepts.

Public discovery uses a separate **Smoked Competition Ledger** expression: smoked silver and graphite navigation glass, a dark selected core, one tiny gold line, and quiet purple depth. Home continues from that chrome into a static four-round competition program and independent logo-first team surfaces. This public glass language does not enter the opaque Team workspace.

Logo frequency is contextual: public headers carry the compact mark, one primary hero may carry the larger identity moment, and the footer may repeat the compact brand for orientation. Protected desktop routes rely on the sidebar identity; below 1180px the compact official mark moves into the product topbar beside the drawer control. Authentication and sharecard uses remain selective. Decorative watermarks and unnecessary duplicate large marks are not part of the system.

# Colors

All reusable interface and medal material colors live in `src/styles/tokens.css`. Gold marks primary actions, selected states, winners, focus, and consequential values. Purple supplies identity atmosphere and secondary selection. Red communicates rejection, bans, withdrawal, penalties, and destructive confirmation. Orange communicates live, upcoming, and check-in urgency.

Medal tiers use the `--color-medal-*` token family for bronze, silver, gold, phoenix depth, and legacy materials. Component CSS must not contain literal medal material colors. Tier silhouettes and labels remain distinct so color is never the only signal.

The Team workspace has a route-scoped semantic palette in `src/styles/tokens.css`: workspace `#111012`, chrome `#0b0a0c`, topbar `#131215`, primary surface `#18171a`, secondary surface `#1e1c20`, raised surface `#262329`, and inset surface `#0e0d0f`. Hover, border, text, and secondary-accent values use the corresponding `--team-*` tokens. All normal Team content surfaces are opaque. Gold remains a precision marker for the primary action or active boundary; the lighter purple accent and `--team-purple-wash` are quiet secondary signals, never page-sized atmosphere.

Public navigation uses the `--material-navigation*` and `--navigation-*` token families rather than Team surface tokens. The capsule, search trigger, login control, and authenticated account control share the same smoked graphite/silver edge and foreground logic. The selected route uses `--material-navigation-active` as its dark core, `--navigation-accent` for the short gold line, and `--navigation-depth` for bounded purple depth. Under `prefers-reduced-transparency`, navigation and companion controls become opaque elevated charcoal and blur is removed.

# Typography

946 Latin Wide 4 names tournaments, major page statements, team identities, and page or section titles. Until its licensed font asset is supplied, the single `--font-display` token falls back to Orbitron without component-level substitutions. The Home hero is the one public-display exception: the licensed OFL Oswald 700 Latin Extended asset is assigned through `--font-public-display` and uses the full unicode-ranged font faces (Latin and Latin Extended) and scales to 9rem at wide desktop sizes to achieve the tall condensed two-line reference composition without synthetic stretching. Raleway 400/500/600/700 carries navigation, forms, tables, controls, buttons, inputs, descriptions, and admin tools. Orbitron is retained only through `--font-competition` for selected scoring numerals. Other display type stays below 6rem; body copy remains near a 70-character measure. Dynamic numerals use tabular figures.

# Layout

Public pages use asymmetric editorial composition; team and admin pages use compact operational grids. Functional surfaces use small radii, quiet borders, and minimal elevation. Controls retain a 44px minimum touch target.

## Team Workspace — Operations Field

The Team shell is one continuous workspace, not a gallery of unrelated cards. The `product-shell--team` boundary owns its design through `src/styles/team-workspace.css`; global public and Admin rules remain outside that scope. The persistent desktop sidebar uses opaque chrome, grouped navigation, a compact contained team identity block, and a prominent next-match destination. Its selected route is a raised graphite/silver surface with a tiny gold dot and silver icon; there is explicitly no vertical yellow selection rule. The navigation scrollbar is graphite/silver and quiet. Below 1180px the sidebar yields to the opaque topbar and drawer without changing route order, labels, or permissions.

Content uses four functional levels: the workspace field, primary information surfaces, secondary or raised surfaces for emphasis, and a near-black inset for controls, credentials, tab wells, or nested facts. Adjacent rows and metrics share borders or ledgers when they belong to one object; do not wrap every label, metric, or action in its own card. Page headers establish route context first, the most consequential next action follows, and secondary readiness, history, settings, or evidence remain quieter.

The default content width is 82rem with responsive padding. Verify Team routes at 1440×900, 1280×720, 1024×768, 768×1024, 430×932, and 390×844, plus 200% text. At tablet and mobile widths, multi-column operation consoles, tournament lists, inboxes, settings, request details, and completion grids resolve to one readable column. The page container is an inline-size query container; its 40rem adaptation is also the text-resize contract, so layouts respond to available content space instead of browser-zoom assumptions. Horizontal scrolling is limited to intrinsically wide tab or timeline controls, and document-level overflow is prohibited.

## Page Personality System

AEVIC is one visual language with distinct information personalities. Page differentiation comes from composition, density, surface rhythm, and hero behavior—not alternate button systems or unrelated typography.

- **Home — Smoked Competition Ledger:** image-led opening beneath graphite/silver navigation glass, typography-only manifesto, one structured competition calendar, a static four-round map program, independent logo-first team surfaces, an archival record moment, and a decisive gold close. It uses fewer containers and the widest spacing range.
- **Tournaments — planning:** calendar and date hierarchy lead. Event status, availability, and one safe next action outrank description. Charcoal and muted gold dominate; decoration is minimal.
- **Team Profile — identity/prestige:** banner, contained logo, organization, compact public proof, roster, and permanent sharing identity. Team branding lives inside the AEVIC frame.
- **Match Center — live/operational:** dense ledgers, explicit status, restrained neutral surfaces, and minimal atmosphere. Live color is semantic and never simulated.
- **Records — historical/archival:** warm dark editorial fields, large sourced numbers, provenance, achievement date, tournament, map, and historical roster integrity.
- **Wrapped — expressive/celebratory:** bounded mobile-first story, expanded AEVIC facets, purposeful staged motion, period-specific facts, and its own seasonal sharing artifacts.
- **Team Panel — Operations Field:** an opaque warm-graphite workspace with next-action-first hierarchy, compact ledgers, explicit permission or backend boundaries, and one restrained gold precision signal. `/team/tournaments` supplies the reference surface language for every authenticated Team route.

If the logo and page title disappear, these roles should remain recognizable through composition alone.

## Page Entry Modes

Public and protected routes choose one of four shared entry modes instead of inventing a new header per screen:

- **Editorial:** image, statement, or archival proof leads. Used by Home, Records, Recap, and selected identity moments.
- **Competition:** event state, date, capacity, and the next competition action lead. Used by Tournament Detail and planning routes.
- **Broadcast:** the current state leads, followed by chronological next activity and a denser recent ledger. Used by Match Center and Match Detail.
- **Utility:** one clear title, recovery path, and task surface lead. Used by Search, Support, authentication, and system states.

The modes share the same typography, CTA, link, radius, status, and focus systems. Personality comes from composition and density, not alternate component styling.

## Product Route Identity

Every protected Team and Admin route carries a route-specific product title in the persistent shell. The title is derived from the pathname, not repeated as a static area label: `/team` is `Komanda icmalı`, `/team/sharecards` is `Paylaşım studiyası`, tournament entries are `Turnirlərim`, tournament detail is `Turnir əməliyyatları`, and Admin sections follow the same rule. The in-page header supplies the task statement and context; the shell supplies arrival orientation.

Route arrival is restrained and family-specific. New pushes and replacements begin at the document top unless a hash target exists; back/forward navigation restores the recorded scroll position; hash routes move to their target; and the main content receives programmatic focus without forcing a second scroll. Protected and authentication families use only the short route-entry transition. Public editorial and competition pages may additionally use varied but restrained `fade`, `fade-up`, `scale-in`, or `mask-reveal` treatments through one public-only `IntersectionObserver`. Content is visible by default, each target reveals once per route entry and is then unobserved, and the system never changes scroll position or captures scrolling. Reduced motion or a missing observer keeps all content visible and disables reveal transitions completely.

## Operational Timeline

Team competition operations use one chronological source of truth: participation state, check-in, room release, then each round in time order. The timeline preserves full map names and uses explicit status text alongside shape or icon cues. Room credentials remain a separate protected console next to captain guidance because access control is operationally distinct from schedule scanning. Withdrawal remains visually and semantically isolated as a danger action.

The `/team` overview is a captain-first run sheet, not a KPI-card dashboard. Its durable order is **What Now → Next → Changed → Active Competition → Round Program → Readiness**. The first viewport contains compact team identity, one required action, the next match, and the latest meaningful change. Participation, room release, match timing, announcements, and readiness continue to come from the real Team services; authoritative open check-in still uses the existing confirmation and service update flow.

The overview does not reintroduce KPI cards, quick-link grids, a duplicated command center, separate tournament briefs, standalone schedule cards, or the old readiness cards. Readiness is one compact end-of-run ledger. Other Team routes keep their established task composition and interaction logic; in this pass they inherit the revised opaque shell and receive regression coverage rather than route-specific visual reinvention.

## Asset Type Selector

Share Studio begins with three first-class output choices: `Komanda kimliyi`, `Turnir nəticəsi`, and `Liderlik cədvəli`. They are presented as a single radiogroup with selected-state text, icon, and checkmark. Arrow keys move between adjacent choices; Home and End jump to the first and last choice; focus follows selection; and each target remains at least 44px. Template controls appear only after an asset type is selected. The generated artifact owns its AEVIC signature, so the surrounding control surface does not repeat a large logo or nested studio introduction.

## Competition Round Program

Tournament Detail merges map rotation and match program into one four-round competition program. Each round row contains its artwork, round number, complete map name, stage, source-driven status, scheduled time, and a direct match destination. The sequence is the primary object; artwork supports recognition and never becomes a separate gallery. Scoring immediately below is a compact ordered ledger of the active formula rather than a wide reference table.

Home uses a separate static four-round program ledger. Each row aligns map artwork, round number, complete map name, published status, and tactical tags. The entire module uses the default cursor and supplies no links, buttons, hover zoom, or implied destination; it communicates the official sequence only.

## Home Team Stage

Home Teams are five independent logo-first surfaces, not one enclosing team card or a generic directory grid. At desktop, hover or keyboard focus reveals only the team's public player names. Tap toggles one team at a time and a second tap closes it; selecting another team closes the previous reveal. The button exposes `aria-pressed` and uses `aria-describedby` to associate the revealed public-name region. Missing published player names receive a precise empty message, and private roster or captain data never enters the surface.

## Records Inline Detail

Record evidence belongs inside the Records Center. Selecting a featured or registry record opens an inline detail region identified by `#record-detail` and the `record` query parameter, preserving a shareable URL without creating another page identity. The region includes tournament, map, round, achieved date, source label, historical roster snapshot or explicit unavailable state, and record progression when supplied. Legacy `/records/:recordId` URLs permanently route into this inline state; the former standalone Record Detail composition is retired.

## Contextual Navigation

Global navigation, contextual entity navigation, and account navigation remain separate layers. `EntityContextNav` is the permanent public-page relationship pattern: an optional parent return, a horizontally safe set of local or related destinations, and at most one lateral entity action. It is static rather than sticky, uses 44px targets, preserves deep links, and never replaces browser back behavior.

Breadcrumbs are reserved for real hierarchy on entity detail pages. Tournament Detail uses `Turnirlər / Tournament`; Match Detail uses `Match Center / Tournament / Match`. Flat directories and utility pages do not receive decorative breadcrumbs.

## Tournament Participant Field

The Participant Field is an event composition built from confirmed teams, not a generic public-team slice. Production renders only `TournamentParticipant` records returned by the tournament participant service. Development fixtures may demonstrate confirmed states but remain isolated in the mock adapter.

- Desktop defaults to optically normalized team logos. Hover or keyboard focus reveals the team name, public roster IGNs, and a team-profile link without flipping, zooming, or exposing private IDs.
- Mobile uses one horizontal logo rail and one active-team detail region below it. Tap selects; the explicit profile action navigates. No hover behavior is simulated.
- Wide marks, tall emblems, initials-only fallbacks, and missing logos share one safe containment area and are never stretched.
- Zero confirmed participants produces a precise empty state. The public team directory is never substituted as tournament truth.

## Match Center Hierarchy

Match Center is a broadcast product, not a tabbed table. Its permanent reading order is `NOW → NEXT → RECENT`:

- **NOW:** a real live match when supplied; otherwise the nearest upcoming match. A dead live placeholder never outranks useful activity.
- **NEXT:** remaining scheduled matches in chronological order.
- **RECENT:** published results in a denser ledger with result evidence and direct match access.

Match Detail belongs to the same family and always exposes the Match Center return, tournament relationship, result region, and linked public teams when the result contract supplies them. Live treatment is semantic and source-driven; it never pulses or fabricates activity.

## Surface and Spacing Modes

The shared token system defines four intentional background modes: base black for continuity, raised charcoal for structured UI, atmosphere for bounded purple depth, and editorial warm-dark for history or prestige. Gold surfaces are reserved for decisive closing statements and primary actions. Purple is atmosphere, not the default accent; burnt orange appears only for real high-energy or live states.

Section spacing uses four tiers: compact for adjacent operational content, normal for standard page transitions, editorial for manifesto/maps/records, and hero for singular openings. Pages must not apply one uniform vertical interval to every section.

## Homepage Manifesto Copy

The selected three-line manifesto is `YARIŞA ÇIX. / ADINI TARİXƏ YAZ. / İRSİNİ QUR.` It directly joins competition, history, and legacy without generic marketing copy. Considered alternatives retained for future campaigns are `BU GÜN YARIŞ. / SABAH TARİX OL. / İRSİNİ QORU.`, `ARENAYA GİR. / ADINI QAZAN. / TARİXDƏ QAL.`, and `RƏQABƏTİ SEÇ. / QƏLƏBƏNİ YAZ. / İRSƏ ÇEVİR.` Campaign variants must preserve the muted/white/gold line hierarchy and stay to three short lines.

The public header groups the compact brand and essential discovery links directly together at the left, with a regulations shortcut and account actions at the right. Search is retained as a direct route but not advertised in the header while production has no searchable public content. At the top of the Home hero, the primary navigation has no capsule fill, border, shadow, or blur; the active destination is distinguished by brighter text. After 24px of scroll—and immediately on public routes without a full-bleed hero—it resolves into the compact smoked silver/graphite glass capsule. Utility and account controls match its material family, while the primary creation action remains visually singular. On small screens discovery and account zones move into the drawer without changing their order or labels, and the drawer uses stable opaque surfaces rather than imitating desktop glass.

The public footer is a compact orientation surface derived from the navbar: identity and configured social links first, primary routes and regulations next, secondary competition/help destinations alongside them, then copyright and legal links beneath a quiet rule. It shares the navbar's graphite material, Raleway labels, and restrained gold active/focus treatment without backdrop blur. At 900px and below, secondary navigation moves beneath primary navigation; at 640px and below, identity and the bottom bar stack while primary links retain a two-column grid. Height follows content rather than a fixed minimum. The same public footer follows both public pages and authentication forms.

Public discovery cards use content-aware grids instead of equal-height dashboard panels. Team cards remain compact and information-led: identity and verification first, country/game context second, and roster count plus a direct profile cue last. The directory retains a compact two-column grid through 390px to preserve scan density; content wrapping is the guardrail rather than a premature one-column collapse.

Public team profiles follow a stable editorial hierarchy: image-led identity and actions, the next upcoming match, one continuous recent-form rail, identity and evidence-gated specialization, captain-first roster, performance, recent match ledger, achievements, and career/sharing entries. No visible sticky or intra-page section navigation interrupts this flow. Public data never exposes private captain contact fields or internal team identifiers.

Match-center and recent-result surfaces are ledgers rather than card galleries. Each row aligns status/icon, match identity and time, then the smallest useful result or destination metadata. On mobile, secondary metrics wrap beneath the identity while preserving the reading order.

Authentication uses one restrained full-viewport version of the official arena artwork beneath the shared public header. Login is a centered, focused glass surface without a separate promotional column; Register uses a wider but deliberately bounded canvas from the same visual family. Both use natural document flow, retain labels, password-manager/autofill semantics, validation, and 44px controls, and expose demo filling only in mock/development mode. Register preserves its visible stepper, live preview, and back/next behavior without a nested document-level scroll trap.

At 390x844 and 375x812 protected routes show the compact official mark in the product topbar. At 1180px and above the persistent sidebar identity is used instead. The `/admin/organizations` review grid uses `minmax(0, 1fr)`, `min-width: 0` through nested grid/flex children, wrapping metadata, URLs, badges, and actions. It has no document-level horizontal overflow at 375px, 390px, or 768px.

# Elevation & Depth

Depth comes from tonal dark fields, quiet one-pixel borders, and restrained shadows defined in tokens. Phoenix atmosphere may use bounded purple and gold gradients. Continuous glow, gold framing on every surface, and page-sized purple haze are excluded.

In the Team workspace, depth is primarily tonal: `#111012` workspace, `#18171a` primary surface, `#1e1c20` secondary surface, `#262329` raised surface, and `#0e0d0f` inset. The sidebar and topbar are opaque chrome. `--team-shell-shadow` is reserved for the shell's identity block and consequential operational surfaces; ordinary ledgers rely on one-pixel `--team-border-*` separation. Backdrop blur and glass are not part of Team content or chrome.

Public navigation is the intentional exception to opaque content surfaces. Its silver/graphite glass uses a 14px blur, restrained saturation, a fine silver edge, dark shadows, and bounded purple depth; matching search and account controls use the same family at a smaller scale. The active core is darker than the capsule and carries only a one-rem gold underline. When transparency is reduced, all of these materials resolve to opaque elevated charcoal with no blur.

Home is the reference-led exception: its mirrored official arena image stays at full opacity with a localized 22%→12%→transparent left shade and a 16% bottom finish, not a blanket veil. Hero body text uses the public-readable semantic role. Desktop copy begins near 28svh, leaves the phoenix visible, and uses a bottom-aligned status rail. The empty state points to the existing provisional competition guide, never an imminent-event promise or an unsupported signup. The empty calendar is omitted from Home (retained with a useful action on Tournaments). Static map rotation is explicitly a format example, not an event's authoritative schedule.

Translucent dark overlays are intentional legibility tools, not decorative glass applied everywhere. Standard public media uses ink `rgba(7, 7, 9, …)`: horizontal scrims range from 0.50–0.86 opacity and the lower vertical stop reaches 0.76. Mobile hero scrims increase to 0.65–0.92 because copy stacks over the image. Team-profile banners use a vertical 0.24–0.94 scrim so identity can sit at the lower edge. Compact social-icon wells use `rgba(7, 7, 9, 0.64)`. Authentication may use the slightly warmer `rgba(6, 5, 9, …)` family, reaching 0.94 behind forms. These values should be reused by role; introducing new translucent hues requires a distinct readability need.

# Shapes

Achievement visuals are faceted medal and insignia silhouettes, not generic cards. Bronze, silver, gold, phoenix, and legacy tiers change both silhouette/material treatment and text label. Verification uses a compact AEVIC crest and never shares the earned-medal silhouette or hierarchy.

Team and organization banners use a 16:5 presentation frame with responsive `cover` rendering for suitable files and a branded gradient fallback. Team and organization banner guidance is 1600x500 recommended and 960x300 minimum. Logo guidance is 1024x1024 recommended and 512x512 minimum.

Large photographic and banner surfaces use the shared media-backdrop treatment. Every instance declares independent desktop and mobile focal points; `cover` cropping follows those values rather than assuming center-center. A context-specific shade may replace the default scrim, but it must retain text contrast and preserve the image as supporting atmosphere. Decorative images stay hidden from assistive technology, while meaningful images require concise alternative text.

Team workspace cards use `--team-card-radius` (`0.875rem`, 14px) and controls use `--team-control-radius` (`0.625rem`, 10px). These are maximum working radii for the subsystem, not an invitation to box every section. Connected comparison, history, roster, and table regions use shared outer corners and internal one-pixel rules so the parent object reads as one surface.

# Components

- **Team workspace shell:** `product-shell--team` scopes the warm-graphite field, 280px desktop sidebar, opaque topbar, 82rem content measure, compact identity, prominent next match, grouped navigation, graphite/silver scrollbar, raised silver selected surface, tiny gold selection dot, and responsive drawer handoff. It preserves the official compact mark and existing permission-aware route model; no vertical yellow selection rule is allowed.
- **Team overview run sheet:** the captain-first overview follows What Now, Next, Changed, Active Competition, Round Program, then Readiness. It preserves service-derived participation, room, match, announcement, and check-in behavior while excluding KPI cards, quick links, duplicated command centers, and old readiness cards.
- **Team operational surfaces:** tournament entries, histories, comparisons, rosters, request and invitation ledgers, settings, share studio, badges, and forms use the shared four-level opaque surface hierarchy. They inherit the revised shell while keeping their prior data and interaction models.
- **Team controls and ledgers:** inputs, selects, textareas, search, tabs, table rows, and entity ledgers use the inset/primary surface pair, shared 10px control radius, 44px minimum targets, visible gold focus, and safe wrapping. Wide timelines or tabs may scroll locally; the document may not.

- **Public navigation material:** Home begins with transparent primary navigation. Scrolled and non-hero navigation uses dark graphite glass, with restrained rules/login/account controls and a dark active core. `prefers-reduced-transparency` supplies the opaque no-blur equivalent. No metallic full-header strip is used.
- **Home map program:** a static four-item sequence of artwork, round and map, explicitly labelled as a format example. It is informational and must not gain click or hover affordances. The mobile overflow list is keyboard-focusable with visible focus; its items are not navigation controls.
- **Home team stage:** independent logo-first surfaces reveal public player names on hover/focus or one-at-a-time tap. Selection is expressed with `aria-pressed`; `aria-describedby` binds each trigger to its public-name region.
- **Public reveal grammar:** public editorial and competition sections may use the four approved variants once per route entry. Content remains visible before observer activation; reduced motion and no-observer paths are fully visible and motionless.

- Banner uploads accept PNG, JPG, or WebP up to 6 MB. Files are decoded before preview, dimensions are read, undersized files are rejected, and invalid files receive precise messages. Banner ratios outside the accepted 16:5 tolerance receive a warning and render with `contain` to avoid forced crop/upscaling. Non-square logos receive the same contain treatment.
- The Badge Cabinet shows a visible 44px drag handle and uses Pointer Events for mouse and touch. Active touch drag disables page panning. Existing 44px up/down controls preserve keyboard ordering, the three-feature maximum remains enforced, and Save uses the existing service adapter.
- Public badge cabinets show exactly three unlocked featured medals. The full badge view excludes locked records and restores focus when closed.
- Organization and team profiles use image-led identity bands, metadata rows, roster ledgers, and curated achievement walls. Independent teams remain valid; linked teams expose their organization link. Team and organization social links render only when configured.
- Public navigation uses the left-grouped brand/discovery header pattern and exposes the same essential routes in the mobile drawer. The desktop active route receives a moving dark core and quiet gold underline; the creation CTA is the only filled header action.
- The compact public footer uses the shared public navigation definitions: primary routes plus regulations, secondary competition/help links, and a separate legal bottom bar. Public destinations remain visible independently of backend capability; their pages communicate unavailable functionality. Footer links retain 44px minimum targets, visible gold keyboard focus, and a dark active surface with gold text. Social links appear only for real configured destinations, use compact icon targets, and do not repeat labels visually when the icon and accessible name are sufficient.
- Social links use recognizable platform brand glyphs from the shared icon set with consistent optical size and stroke treatment. Compact icon-only variants require an accessible platform-and-owner label; external links retain safe `noopener noreferrer` behavior.
- Public team cards expose only approved public summaries and remain fully linked with visible hover and keyboard focus feedback. Loading skeletons resemble the final card footprint; zero results explain the public-visibility filter.
- Team profiles are continuous editorial pages. Existing hash IDs may remain for deep-link compatibility, but no visible section navigation is rendered. Roster order is captain, starters, then substitutes; substitute treatment is visibly secondary without reducing text contrast below accessible levels.
- Match-center rows use a 44px status icon well, readable date/time, semantic status text, and compact result metrics. A missing live feed renders an explicit empty state rather than simulated activity.
- Team Form is a continuous four-result performance rail ordered newest to oldest. Results are separated by quiet rules rather than detached cards; the newest item receives a restrained gold cue while WWCD remains the strongest prestige state. Mobile retains the same reading order in an internally scrolling rail without causing page overflow. The empty state replaces the rail when there is no published match history.
- Map Specialization is evidence-gated. The insufficient-data state explains the minimum same-map sample and shows current per-map progress; it never names a best map. The ready state may identify best average-points map, most WWCD, and best average placement only after the declared minimum sample has been met.
- Leaderboard movement is comparative snapshot data, not decoration. Movement columns and mobile indicators are hidden when no previous published snapshot exists. A row-level dash may describe a team missing from an otherwise valid prior snapshot, but a missing snapshot must never be interpreted as unchanged movement.
- Records Center opens with a keyboard-focusable, scroll-snapping horizontal rail of selected records, followed by categorical archive browsing. Every record detail retains tournament, map, round, and achieved-date provenance. Historical roster integrity is strict: show the stored roster snapshot or an explicit unavailable state; never substitute the current roster into a historical result.
- Record evidence expands inside the Records Center through URL-backed inline state. Legacy detail routes redirect into that state and no longer render a second masthead or standalone record page.
- Tournament Recap is deterministic and source-labeled. Partial coverage may summarize only published match totals and must label those values as dataset totals. Champion, standings, top player, and MVP remain withheld until authoritative final standings or calculation data exists. No AI-generated narrative or subjective award fills missing evidence.
- Calendar actions serialize public tournament or match fields only: title, public description, public times and timezone, public location, and public URL. Room IDs, passwords, private check-in data, team contacts, and protected links are excluded from Google Calendar and ICS output.
- Offline and install copy never promises capabilities the shell cannot provide. Offline status says that the last saved public shell may remain visible and live status will not update; it does not imply offline registration, fresh results, or background synchronization. Install controls appear only when the platform exposes an install path, installation remains optional, and iOS instructions appear only after the user requests them.
- The profile-card studio uses deliberately recomposed deterministic templates for 1080×1080 (1:1), 1080×1350 (4:5), and 1080×1920 (9:16). Every format preserves the same team-first hierarchy, a one- or two-line centered-dot roster, one horizontal factual stat rail, and an integrated high-contrast QR identity block. The embedded QR encodes only the canonical HTTPS public team-profile URL, which also remains visible as text if QR generation fails. Exclude captain contacts, roster/player private data, internal identifiers, protected URLs, room credentials, and AI-generated imagery from the template and export.

### AEVIC Team Identity Card Standard

The Team Identity Card is a permanent AEVIC brand asset, not a result poster. Every format preserves three layers: dominant team identity, the restrained AEVIC world, and compact career proof. Team identity always outranks the AEVIC signature.

- **Locked frame:** a 28px inset precision frame at 1080px, one short gold directional rule, a purple atmospheric facet, and a consistent `AEVIC // TEAM IDENTITY // COMPETITIVE LEGACY` signature zone.
- **Team identity:** the logo sits in a quiet, outlined containment field and is never stretched. The team name uses Orbitron 800 with format-aware fitting and remains the dominant line. Team tag, organization, and region are secondary and render only when sourced.
- **Career proof:** show no more than four positive public metrics. Prefer WWCD, championships, podiums, and matches; omit zero or unavailable values rather than presenting empty prestige.
- **QR zone:** the QR uses high error correction, a white quiet zone, and a minimum rendered size of 150px at 1080px. The canonical human-readable profile path is always visible beside or below it.
- **Banner usage:** a supplied public banner may occupy only the upper atmosphere panel and must transition through a dark legibility fade. It is never used as an unprotected full-card wallpaper. Missing banners use neutral AEVIC facets without a giant phoenix.
- **Format behavior:** 1:1 uses a compact left-led identity ledger; 4:5 is the hero composition with centered identity and lower proof rail; 9:16 is a cinematic vertical composition with top and bottom social-overlay safe areas. Formats are recomposed, never stretched.
- **Gold rule:** gold marks the AEVIC signature, identity kicker, and precision line. It does not fill the whole card or compete with the team logo.
- **Export quality:** output is deterministic Canvas PNG at exactly 1080×1080, 1080×1350, or 1080×1920 after fonts and public images are ready. Transparent regions, DOM screenshot artifacts, personal data, and cross-origin-unsafe assets are prohibited.
- **Provenance:** career proof carries a source label derived from the active data mode. A year appears in-card or in the filename only when the supplied dataset has a real period year; all-time identity cards never infer one from the browser clock.

# Do's and Don'ts

- Do keep one clear primary action in each operational module and preserve semantic status text.
- Do preserve the captain overview order and authoritative check-in confirmation/service flow.
- Do keep public reveal content visible by default and unobserve each target after its first entry reveal.
- Do keep the Home map program static and Home team reveals limited to public player names with keyboard and one-at-a-time tap parity.
- Do treat `/team/tournaments` as the reference surface for authenticated Team routes and keep all Team content inside the route-scoped Operations Field token system.
- Do use the Team workspace's opaque surface levels to express parent, child, raised, and inset relationships before adding borders or shadows.
- Do preserve safe wrapping, `min-width: 0`, focus visibility, reduced motion, and 44px touch targets.
- Do use the official phoenix asset and the tokenized medal material palette.
- Do set both desktop and mobile focal points for large media and select the documented scrim by content position.
- Do keep public-team, participant, roster, and match collections dense enough to scan: two-up mobile rails/grids are valid when each item remains legible and interactive targets stay 44px.
- Do use platform-specific social glyphs with accessible names and consistent icon geometry.
- Do label the sample size, coverage, provenance, and snapshot requirements wherever competition intelligence could otherwise look authoritative.
- Do keep archive empty states specific: insufficient sample, unpublished roster snapshot, unavailable final standings, and absent prior leaderboard snapshot are distinct conditions.
- Do keep generated profile cards deterministic, public-only, and compositionally equivalent across all three export formats.
- Don't use random neon hues, ambient pulsing glows, giant translucent logos, generic equal-card grids, universal diagonal clipping, or Orbitron for body copy.
- Don't introduce glass, translucent chrome, image decoration, page-sized purple haze, or a separate visual concept on an individual Team route.
- Don't replace the Team sidebar's graphite/silver selected surface and tiny gold dot with a vertical yellow selection rule.
- Don't add scroll-jacking, observer-dependent visibility, protected-route section reveals, or reveal animation under reduced motion.
- Don't make the Home map program clickable or expose private team information in the Home logo stage.
- Don't create card soup inside Team pages; connected facts, rows, actions, and comparison values should share a parent surface or ledger whenever they describe one object.
- Don't imply that a static map, image, or result row is clickable through hover zoom or pointer styling unless it has a real destination.
- Don't repeat profile identity, performance metrics, social links, or achievement summaries in multiple adjacent modules.
- Don't derive movement without two comparable published snapshots, declare a map specialty below its minimum sample, or backfill historical rosters from current team membership.
- Don't infer champions, standings, MVPs, top players, or subjective awards from partial match totals.
- Don't place private competition operations into calendar files, QR codes, share cards, install copy, or offline messaging.
- Don't preview undecoded uploads, stretch low-resolution banners, expose locked badges, or hide protected-route identity on mobile.

# AEVIC UI Genome

- **AEVIC Angle:** a single 14–22° directional cut may appear on one identity edge, selected progress segment, or prestige state. It is never applied to every card.
- **AEVIC Corner:** normal, interactive, and operational surfaces use the shared restrained radius. Editorial surfaces may replace only the upper-right corner with one practical facet; nested controls keep concentric radii.
- **AEVIC Divider:** default dividers are quiet one-pixel tonal rules. A short gold facet is reserved for the active or consequential boundary, never every separator.
- **AEVIC Stat:** the number is Orbitron with tabular figures, followed by a short metric label and one factual context line. Numbers do not become authoritative without source coverage.
- **AEVIC Surface:** four semantic roles exist: `Surface` for information, `Interactive Surface` for destinations, `Editorial Surface` for Career/Records/Recap/Wrapped, and `Operational Surface` for actions, warnings, and protected workflows.
- **AEVIC Gold Rule:** gold identifies the primary action, selected state, achievement/prestige, winner, or consequential competition status. Purple carries atmosphere; red/orange/green remain semantic.
- **AEVIC Motion:** routine state transitions are 120–180ms with `cubic-bezier(.2,0,0,1)`. Rare story reveals may reach 320ms. No bounce, repeated entrance, or motion-only meaning. Reduced motion preserves every state.
- **AEVIC Icons:** Lucide outline icons use `currentColor`, 17–20px in product controls, 1.5–2px optical weight, and a 44px touch target. Filled icon variants are reserved for selected states.

Wrapped is a centered mobile-first editorial viewport rather than a stretched desktop presentation. It uses typography, facts, faceted directional planes, and one progress language. It does not imitate Spotify palettes or Instagram chrome. The final share artifact is rendered by a deterministic Canvas template instead of capturing arbitrary DOM state.
