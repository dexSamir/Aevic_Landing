# AEVIC Official Visual Asset Mapping

The ten supplied files in `photos.zip` are retained as the visual source of truth. The application uses one semantically named, web-optimized JPEG per source inside `src/assets/official`; no additional visual variants were generated.

| Supplied filename | Web asset | Category and purpose | Component / page usage | Source dimensions | Delivery role |
| --- | --- | --- | --- | --- | --- |
| `6974ada1-ebff-41bc-8832-17b434ffb50d.png` | `auth-arena-entry.jpg` | Login artwork; a squad entering the AEVIC arena | `AuthLayout` on login, password recovery and admin login | 1122×1402 | Background artwork |
| `ChatGPT Image 3 Ağu 2026 12_45_40.png` | `auth-team-assembly.jpg` | Registration artwork; team assembly and tactical preparation | `AuthLayout` on registration; Daily MVP demo portrait crop | 1122×1402 | Background/content image |
| `ChatGPT Image 3 Ağu 2026 12_33_58.png` | `poster-team-performance.jpg` | Team performance poster frame | `PerformancePoster` in `SharecardGenerator` | 1254×1254 | Template background |
| `ChatGPT Image 3 Ağu 2026 12_35_37.png` | `poster-tournament-result.jpg` | Tournament result poster frame | `TournamentResultPoster` in `SharecardGenerator` | 1254×1254 | Template background |
| `ChatGPT Image 3 Ağu 2026 12_38_47.png` | `poster-daily-mvp.jpg` | Daily MVP poster frame with portrait aperture | `MVPPoster` and home `MVPShowcase` | 1254×1254 | Template background |
| `ChatGPT Image 3 Ağu 2026 12_40_52.png` | `poster-leaderboard.jpg` | Ranked leaderboard table frame | `LeaderboardPoster` and public leaderboard visual header | 1254×1254 | Template background |
| `ChatGPT Image 3 Ağu 2026 12_47_22.png` | `map-erangel-round-1.jpg` | Official Round 1 Erangel visual | `MapRotation` on home, tournament, team and poster surfaces | 1672×941 | Content image |
| `ChatGPT Image 3 Ağu 2026 12_48_24.png` | `map-miramar.jpg` | Official Round 2 Miramar visual | `MapRotation` on home, tournament, team and poster surfaces | 1672×941 | Content image |
| `ChatGPT Image 3 Ağu 2026 12_49_45.png` | `map-rondo.jpg` | Official Round 3 Rondo visual | `MapRotation` on home, tournament, team and poster surfaces | 1672×941 | Content image |
| `ChatGPT Image 3 Ağu 2026 12_50_35.png` | `map-erangel-round-4.jpg` | Official Round 4 Erangel visual, sunset variant | `MapRotation` on home, tournament, team and poster surfaces | 1672×941 | Content image |

## Loading and output policy

- Auth artwork is eager-loaded because it is visible in the first viewport; map and poster content uses native lazy loading outside the first card.
- Every image declares intrinsic dimensions or a stable CSS aspect ratio to prevent layout shift.
- Map artwork is capped at 1600px; auth and poster artwork at 1200px. JPEG quality is tuned between 82–86 for a combined web payload substantially smaller than the 21 MB source ZIP.
- Sharecard downloads render the supplied template and live HTML data together via `html-to-image`; the templates are not presented as static finished posters.
- Prize and currency data are intentionally excluded from every public/team poster and visual. Admin configuration remains internal.
