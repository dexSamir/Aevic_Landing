# Captain redesign checklist

Each route requires page, forms, states, responsive and functional verification.

- [ ] `/team/profile` — Public profil
- [ ] `/team/career` — Karyera
- [ ] `/team` — Komanda icmalı
- [ ] `/team/tournaments` — Turnirlərim
- [ ] `/team/tournaments/:tournamentId` — Turnir əməliyyatları
- [ ] `/team/history` — Komanda tarixçəsi
- [ ] `/team/comparison` — Komanda müqayisəsi
- [ ] `/team/roster` — Heyət
- [ ] `/team/messages` — Mesajlar
- [ ] `/team/notifications` — Bildirişlər
- [ ] `/team/roster-requests` — Heyət sorğuları
- [ ] `/team/roster-requests/:requestId` — Heyət sorğusu
- [ ] `/team/disputes` — Nəticə etirazları
- [ ] `/team/disputes/new` — Yeni etiraz
- [ ] `/team/disputes/:disputeId` — Etiraz detalı
- [ ] `/team/sharecards` — Paylaşım studiyası
- [ ] `/team/badges` — Nişan kabineti
- [ ] `/team/badges/:badgeId` — Nişan detalı
- [ ] `/team/invitations` — Dəvətlər
- [ ] `/team/settings/managers` — Menecerlər
- [ ] `/team/verification` — Komanda təsdiqi
- [ ] `/team/organization/:organizationSlug` — Təşkilat iş sahəsi
- [ ] `/team/settings` — Komanda ayarları

## Measured shared-system coverage

All 23 routes use the new team shell and heading typography. Populated layouts measured at 320, 768, 1440 and 1920px (92 cells). Tournament-detail and roster-detail narrow overflows were corrected and rechecked, along with badge pages (16 cells, no issues). Mobile roster modal and navigation drawer open/Escape passed. Evidence: `/tmp/aevic-completion-qa2/captain-final/report.json` and `captain-corrections/report.json`.

These layout checks do not mark every route action, loading/error state, or visual detail complete. Route checkboxes remain the full sign-off gate.

## Safe handoff

Implementation is paused. See `CODEX_HANDOFF.md` and the explicit 99-route statuses in `ROUTE_STATUS.md` / `routes.json`. All 23 captain routes remain PARTIAL at full acceptance level. Final corrected/settings recapture covered 20 layout cells without issues.
