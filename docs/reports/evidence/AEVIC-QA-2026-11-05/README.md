# Evidence interpretation

These are live audit captures, not fixtures. Some JSON files contain Playwright tool envelopes; use the text section following `### Result` for returned observations. Files with `### Error` are unsuccessful automation attempts and do not by themselves establish product defects. The scenario ledger links final usable evidence.

Settled/retested evidence takes precedence: `team-controls-verified.json` supersedes early Share Studio refresh and control captures; `public-round-tabs-settled.json` supersedes tab reads made during asynchronous transitions; `logout-final.json` confirms both sessions ended despite the preceding capture-body error; `account-final-scan.json` supersedes the parallel scan interrupted by a wrong locator. The managers page recovered on retry. No passwords, tokens, cookies or authorization headers are provided.

Direct Supabase/database verification was unavailable. Backend reads and reloads are identified as API/application persistence evidence only. Screenshots reflect their capture time; later QA lifecycle changes can make an earlier screenshot outdated without making it fabricated.

## Automation attempts without conclusive output

- `account-panel-controls.json`
- `logout-verification.json`
- `public-controls.json`
- `qa-approved-team-detail.json`
- `qa-dispute-created.json`
- `qa-join-confirmed.json`
- `qa-participant-joined.json`
- `qa-team-confirmed.json`
- `team-final-controls.json`
