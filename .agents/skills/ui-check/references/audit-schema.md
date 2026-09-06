# Audit manifest schema

Use one JSON manifest as the source of truth for the audit, screenshots, findings, demos, and user decisions. Keep IDs stable; do not derive identity from array order.

## Top-level shape

```json
{
  "schema_version": "1.0",
  "audit_id": "ui-2026-07-25-example",
  "title": "UI Audit Acceptance · ui-2026-07-25-example",
  "subtitle": "",
  "scope": {"request": "", "tier": "STANDARD", "platforms": [], "surfaces": [], "inferred": [], "included": [], "excluded": [], "blocked": []},
  "baseline": {"mode": "EXPLICIT", "sources": [], "references": [], "unknowns": []},
  "coverage_plan": {"critical_screens": [], "default_env_ids": [], "contrast_env_ids": [], "collapsed": [], "notes": ""},
  "environments": [],
  "screens": [],
  "states": [],
  "evidence": [],
  "findings": [],
  "demos": [],
  "reviews": [],
  "decisions": [],
  "artifacts": {"coverage": {}},
  "continuation": {}
}
```

`title` and `subtitle` are optional human-readable packet strings. `artifacts.coverage` may carry a display `label` and counters for the acceptance packet; `build_acceptance_demo.py` additionally injects `artifacts.manifest_path` and `artifacts.manifest_name` at build time.

## Scope, tier, and baseline

`scope.platforms` values should be `web`, `desktop-native`, `mobile-native`, `tablet`, or another explicit project surface. Record requested, inferred, included, excluded, and blocked scope. `scope.tier` is `QUICK`, `STANDARD`, or `EXHAUSTIVE`.

`baseline.mode` is one of `EXPLICIT`, `HYBRID`, `INFERRED`, or `ABSENT`. Each source needs `path`, `kind`, `authority`, and `evidence_ids`. Each rule/reference needs a stable `baseline_id`, description, applicability, confidence, source evidence, and — in `INFERRED`/`HYBRID` mode — the source screens it was derived from.

`coverage_plan` records which screens are critical, which environments serve as default and contrast coverage for the rest, and every collapsed cell group with its equivalence argument.

## Environment

```json
{
  "env_id": "ENV-001",
  "platform": "web",
  "surface": "desktop",
  "os": "",
  "browser_or_runtime": "",
  "version": "",
  "screen_px": {"width": 0, "height": 0},
  "window_px": {"width": 0, "height": 0},
  "viewport_px": {"width": 0, "height": 0},
  "orientation": "landscape",
  "window_mode": "maximized",
  "browser_zoom": 1,
  "os_scale": 1,
  "dpr": 1,
  "theme": "light",
  "theme_source": "manual",
  "locale": "",
  "timezone": "",
  "text_scale": 1,
  "contrast": "normal",
  "motion": "full",
  "user_role": "",
  "network": "online",
  "status": "READY",
  "blocker": ""
}
```

Use `READY`, `BLOCKED`, or `NOT_SUPPORTED` for environment status (omitted means unspecified). Add project-specific dimensions under `custom` instead of silently dropping them.

## Screen, state, and evidence

Every screen and state gets an ID and a user-facing label. A state belongs to a screen (`screen_id`) and must identify entry, exit, preconditions, data fixture, and expected visual/interaction changes.

```json
{
  "evidence_id": "EVIDENCE-001",
  "screen_id": "SCREEN-001",
  "state_id": "STATE-001",
  "env_id": "ENV-001",
  "kind": "screenshot",
  "status": "PASS",
  "path": "screens/SCREEN-001__STATE-001__ENV-001.png",
  "tool": "browser",
  "complete": true,
  "captured_at": "2026-07-25T00:00:00Z",
  "app_commit": "",
  "steps": [],
  "fixture": "fixtures/example.json",
  "code_refs": ["src/example.tsx:10"],
  "notes": ""
}
```

`kind` can be `screenshot`, `video`, `console`, `network`, `dom`, `code`, `design`, or `test`. Evidence status must be `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, or `NOT_SUPPORTED` — demo statuses are a separate enum. A screenshot evidence item must include its capture tool and environment. `app_commit` records the product commit or build the capture came from; when the base commit changes mid-audit, mark affected demos `STALE` in `status` and note staleness for affected evidence in `notes` (the evidence status enum has no `STALE`), then re-capture. When the working tree is **dirty** at capture or code-reading time, say so in `app_commit`/`notes` and treat `code_refs` line numbers as working-tree positions — a dirty file's line numbers can drift from the base commit, so give a base-commit anchor (the selector, symbol, or approximate base-commit line) for load-bearing refs so a later reader diffing against the base commit can still find them. A `BLOCKED` evidence row may carry an optional `"waived": {"by": "", "reason": "", "at": ""}` object once the user explicitly waives it; only waived blockers stop holding the audit open.

## Findings

```json
{
  "finding_id": "SPEC-001",
  "category": "SPEC",
  "severity": "P1",
  "screen_ids": ["SCREEN-001"],
  "state_ids": ["STATE-001"],
  "env_ids": ["ENV-001"],
  "title": "",
  "summary": "",
  "expected": "",
  "actual": "",
  "user_impact": "",
  "baseline_refs": ["BASELINE-001"],
  "evidence_ids": ["EVIDENCE-001"],
  "code_refs": ["src/example.tsx:10"],
  "root_cause": "",
  "confidence": "high",
  "recommendation": "",
  "demo_ids": ["DEMO-001"]
}
```

Categories: `SPEC`, `POLISH`, `EDGE`, `OPT`, `SPEC_CHANGE_REQUIRED`. Never use `POLISH` for a reproducible defect or `SPEC` for an unsupported personal preference; a reproducible defect rooted in a spec violation is `EDGE` with the violation in `code_refs`. Severity is `P0`–`P3`, assigned only after explaining user impact.

## A/B demos

```json
{
  "demo_id": "DEMO-001",
  "finding_ids": ["POLISH-001"],
  "title": "",
  "status": "READY",
  "a": {
    "label": "Current",
    "entry": "demos/DEMO-001/index.html",
    "screenshots": ["demos/DEMO-001/a/ENV-001.png"],
    "anchor_evidence_id": "EVIDENCE-001",
    "fidelity": "pixel"
  },
  "b": {
    "label": "Proposed",
    "entry": "demos/DEMO-001/index.html?variant=b",
    "screenshots": ["demos/DEMO-001/b/ENV-001.png"]
  },
  "fixture": "demos/DEMO-001/fixture.json",
  "env_ids": ["ENV-001"],
  "baseline_refs": ["BASELINE-001"],
  "rationale": "",
  "risks": [],
  "spec_status": "COMPLIANT",
  "user_question": ""
}
```

`status` values: `DRAFT`, `READY`, `BLOCKED`, `REVIEWED`, `STALE`. A demo is not `READY` until both variants have captured screenshots under identical conditions; `entry` is optional (a screenshots-only demo is valid). `a.anchor_evidence_id` links the A variant to the Phase 3 evidence it reproduces; `fidelity` is `pixel` (reuses or matches the real capture), `structural` (same layout, mock data), or `schematic` (simplified illustration). `spec_status` is `COMPLIANT` or `SPEC_CHANGE_REQUIRED`. Demos are marked `REVIEWED` only after the post-review verification pass.

A single side-by-side **A|B composite image** is a valid capture form when the demo renders both variants in one frame: reference the same composite file in both `a.screenshots` and `b.screenshots` and note the composite layout (for example in a `custom.note`); each side is then evidenced by that image. The **A variant must faithfully reproduce the current product in both directions**: it must not exaggerate the defect — no alarm colours the product does not actually use, no omitted real affordances (buttons, CTAs, escape hatches that exist today), no emptier-than-real state — and it must not be prettier or more humane than reality either (no humanized copy where the product shows raw enums, no formatted durations where the product prints raw minutes, no colour applied to states the product renders muted). Exaggerating A inflates the apparent severity; beautifying A understates the defect and weakens B's own justification — both mislead the decision. Any auditor annotation drawn on top of A must be visually neutral and clearly labelled as an annotation, not styled as product UI. A demo record may also be split into several records sharing the same entry and composite when its findings need separate decision levels (see Phase 6).

## Reviews and decisions

Review records need a reviewer role, fresh-context flag, the evidence subset examined, disposition, and re-verification notes. Review dispositions: `ACCEPT`, `PARTIAL`, `REJECT`, `DEFER`.

Decision records use `PENDING_CONFIRMATION`, `ACCEPTED`, `REJECTED`, `NEEDS_REVISION`, or `DEFERRED`, plus user notes and timestamp. A decision targets a demo (`demo_id`) or a demo-less finding (`finding_id`) — exactly one of the two:

```json
{
  "decision_id": "DECISION-001",
  "demo_id": "DEMO-001",
  "status": "PENDING_CONFIRMATION",
  "note": "",
  "updated_at": ""
}
```

The `decisions` array inside the manifest is an initial placeholder; the exported `acceptance/decisions.json` file is the authoritative record once the user saves.

## Continuation packet

`continuation` must include the manifest path, acceptance export path, audit ID, accepted/rejected/deferred IDs, unresolved blockers, and a short next-step prompt. The next-step prompt must say to move the downloaded decisions file into `acceptance/decisions.json`, re-read the current code and decisions, implement only accepted items, re-review them, and stop and ask when scope, authority, or evidence is insufficient.
