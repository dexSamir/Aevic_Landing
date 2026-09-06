# ui-check

**Evidence-first UI alignment auditing as an Agent Skill.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

English | [简体中文](README.zh-CN.md)

`ui-check` teaches an AI coding agent (Claude Code, Cursor, Codex, or any [Agent Skills](https://agentskills.io)-compatible runtime) how to run a disciplined UI audit: inventory every screen and user-visible state, capture real rendered screenshots, judge alignment against the project's **own** design standard, and hand the user an interactive acceptance packet to approve or reject each proposed change — all without touching product code.

![The interactive acceptance packet: typed findings with real screenshots, A/B evidence, per-item decisions, and a one-click continuation prompt](docs/acceptance-packet.png)

*The screenshot above is the bundled example — open [`examples/demo-audit/acceptance/ui-acceptance.html`](examples/demo-audit/acceptance/ui-acceptance.html) in a browser to try the decision flow yourself.*

## Why

Asking an agent to "look at my UI and find problems" typically produces a pile of taste-based opinions and a redesign in whatever style the model likes this month. `ui-check` replaces that with five disciplines:

1. **The project is the design authority.** The skill discovers the project's explicit or inferred UI standard first (`EXPLICIT` / `HYBRID` / `INFERRED` / `ABSENT`), and judges alignment against it — never against an imported visual language. An external accessibility floor (contrast, focus, touch targets) still applies regardless.
2. **Evidence or it didn't happen.** Every conclusion links a real rendered screenshot and a `file:line` code reference. Suspicions must be verified with DOM measurements before they become findings. A machine validator checks that every referenced artifact actually exists.
3. **Typed findings, not vibes.** Every finding is classified as `SPEC` (violates the standard), `POLISH` (below the project's mature work), `EDGE` (reproducible defect), `OPT` (improvement within the standard), or `SPEC_CHANGE_REQUIRED` (needs a new design rule — flagged separately and always requiring an explicit user decision).
4. **Declared coverage instead of fake exhaustiveness.** The audit declares a coverage plan (critical screens × full environment matrix, other screens × default + contrast environment) with effort tiers (`QUICK` / `STANDARD` / `EXHAUSTIVE`), so an honest audit can actually finish — and what wasn't covered is recorded, not hidden.
5. **The user decides, the agent stops.** Proposals ship as A/B evidence in an interactive HTML packet. Decisions export as `decisions.json` plus a continuation prompt for the next task. The audit never modifies product source.

## What it is (and is not)

It is a one-shot, evidence-disciplined **audit**, built for projects that live in agent workflows — especially ones without a design team. It is **not**:

- a CI visual-regression tool (Percy/Chromatic compare against an approved previous build; ui-check compares against the project's own internal standard — they compose well, and audit screenshots make a good initial regression baseline);
- a WCAG scanner (axe automates rule-checkable accessibility; ui-check keeps a small manual accessibility floor and welcomes axe output as evidence);
- a replacement for a designer's judgment. The skill guarantees **process honesty** — declared coverage, real screenshots, verified claims, no invented results. The **quality of the findings still depends on the model executing it**.

Cost expectations: a `QUICK` single-page check is minutes; a `STANDARD` audit of a mid-sized app takes hours of agent runtime and may span sessions (the skill handles resumption). The agent is instructed to state the expected effort before starting.

## What you get

An audit produces an isolated workspace (default `work/ui-check/<audit-id>/`):

```
audit-manifest.json          # machine-readable ledger: scope, baseline, coverage plan,
                             # inventory, evidence, findings, demos, reviews, decisions
reports/ui-standard.md       # the project's UI baseline, with sources
reports/audit-report.md      # coverage, findings, unknowns, risks
screens/                     # real rendered screenshots (SCREEN × STATE × ENV)
fixtures/                    # safe mock data used during the walkthrough
demos/                       # isolated A/B evidence with mock data
acceptance/ui-acceptance.html    # interactive decision UI (self-contained, offline)
acceptance/decisions.json        # your saved decisions (exported by the HTML)
acceptance/continuation-prompt.md# ready-made prompt for the implementation task
```

The acceptance HTML works offline, supports filtering by category/severity/decision, per-item accept / reject / needs-revision / defer with notes, a defer-remaining action for partial sessions, and one primary action — **Save & Generate Next-Step Prompt** — which exports the decisions file and a continuation prompt that instructs the next agent to implement *only* accepted items.

## Install

An Agent Skill is just a directory. Copy or clone this repository into your runtime's skills location:

| Runtime | Personal | Project |
|---|---|---|
| Claude Code | `~/.claude/skills/ui-check/` | `.claude/skills/ui-check/` |
| Cursor | `~/.cursor/skills/ui-check/` | `.cursor/skills/ui-check/` |
| Codex | `~/.agents/skills/ui-check/` | `.agents/skills/ui-check/` |

`.agents/skills/` is the cross-tool path supported by both Codex and Cursor; Codex's legacy `~/.codex/skills/` still works.

```bash
git clone https://github.com/Octo-o-o-o/ui-check ~/.claude/skills/ui-check
```

Requirements: Python 3.8+ (standard library only — the scripts run on macOS, Linux, and Windows; invoke them as `python3` on macOS/Linux and `python` on Windows) and a browser / computer-use / mobile-simulator tool available to the agent for rendered evidence.

## Use

Trigger it naturally — "run a UI audit", "do a design QA pass", "check UI consistency before release" — or invoke it explicitly (`/ui-check` in Claude Code, `$ui-check` in Codex). Scope and effort scale with your request:

- *"Quick UI check of the settings page"* → `QUICK` tier: default environment, findings + screenshots, no demos (use `STANDARD` when you want the interactive acceptance packet).
- *"Audit the whole app's UI"* → `STANDARD` tier: declared coverage plan, A/B evidence, acceptance packet.
- *"Exhaustive audit across every theme and breakpoint, take the time you need"* → `EXHAUSTIVE` tier.

The workflow (detailed in [SKILL.md](SKILL.md)): protect the workspace → build the UI baseline → inventory screens/states/environments and declare a coverage plan → real walkthrough with screenshots → classify findings → independent review → A/B evidence → interactive acceptance → stop before implementation.

## Bundled tooling

| Script | Purpose |
|---|---|
| `scripts/init_audit.py` | Scaffold the audit workspace and a minimal manifest |
| `scripts/validate_audit_manifest.py` | Machine-check IDs, references, enums, decisions, and that every referenced screenshot/demo file exists |
| `scripts/build_acceptance_demo.py` | Compile the manifest into the self-contained acceptance HTML |

All scripts are standard-library Python 3 with clean error messages; the acceptance template (`assets/acceptance-demo-template.html`) is a single dependency-free HTML file.

## Repository layout

```
SKILL.md                     # the skill entry point (frontmatter + workflow)
references/                  # progressive-disclosure docs the agent loads as needed
  audit-schema.md            #   manifest / evidence / finding / demo / decision schemas
  platform-matrix.md         #   tool routing, environment dimensions, coverage plan rules
  visual-review.md           #   review rubric, classification discipline, a11y floor
  acceptance-protocol.md     #   acceptance HTML behavior and decision flow
scripts/                     # executable helpers (see above)
tests/                       # unit tests for the validator
assets/                      # acceptance HTML template (used in output, not loaded into context)
examples/demo-audit/         # complete example audit incl. a ready-to-open acceptance packet
agents/openai.yaml           # optional Codex UI metadata; other runtimes ignore it
docs/                        # README assets
```

## License

[MIT](LICENSE)
