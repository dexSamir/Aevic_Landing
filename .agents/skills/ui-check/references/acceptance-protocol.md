# Interactive acceptance protocol

The acceptance packet is the user-facing end of an audit: a review and decision tool, not an implementation surface. Generate it with `scripts/build_acceptance_demo.py`; the bundled template already implements this protocol — do not hand-write the HTML.

## Required content

A self-contained HTML file that works from a local file or a simple static server without external network dependencies. It embeds the normalized manifest data and references local screenshots and demo entries by relative path.

For every decision unit (a demo, or a finding without demos) show:

- category, severity, screen/state/environment IDs;
- current A evidence and proposed B evidence with complete screenshots;
- code references and baseline references;
- expected user impact and risks;
- a decision control and a notes field;
- a link to open the isolated demo when one exists.

Findings and demos are linked in both directions (`finding.demo_ids` and `demo.finding_ids`); the packet must honor either direction, render every linked demo, and never silently drop a unit.

## Decision behavior

Explicit states:

- `PENDING_CONFIRMATION`: no user decision yet;
- `ACCEPTED`: approved for a later implementation task;
- `REJECTED`: do not implement;
- `NEEDS_REVISION`: return to the audit/demo stage with user notes;
- `DEFERRED`: keep visible but out of the current implementation scope.

Provide filtering, search, category/severity summaries, an unresolved-only view, a visible unsaved-changes indicator, and a defer-remaining action so a partial review session can still export. Persist decisions to localStorage when available (tolerating corrupted storage), but treat the downloaded export as the durable artifact.

## Save and continue

The single primary action is "Save & Generate Next-Step Prompt". On save:

1. Require a decision on every decision unit; offer defer-remaining for the rest.
2. Serialize `decisions.json` with the audit ID, manifest schema version, timestamps, per-item decisions keyed by `demo_id` or `finding_id` as appropriate, notes, and optional reviewer name.
3. Trigger downloads for `decisions.json` and `continuation-prompt.md` with deterministic filenames, show the prompt in an always-visible preview textarea, and offer copy buttons.
4. Instruct the user to place both downloads into the audit workspace's `acceptance/` directory as `decisions.json` and `continuation-prompt.md`.
5. Never present the save as unconditionally successful: downloads can be blocked, so tell the user to confirm the files landed and to use the re-download or copy fallbacks otherwise. If serialization fails, say so and do not claim anything was saved.

The continuation prompt must tell the next agent to:

- move the downloaded `decisions.json` into the audit workspace at `acceptance/decisions.json`;
- re-read the current repository and audit artifacts;
- implement only `ACCEPTED` items;
- leave `REJECTED` and `DEFERRED` items untouched;
- regenerate A/B evidence for `NEEDS_REVISION` items before implementing them;
- re-check the UI baseline and affected environments before changing anything;
- implement, test, and review item by item;
- stop and ask when scope, authority, or evidence is insufficient (the template's generated prompt carries this wording).

## Verification before handoff

Test the packet against a copy of the manifest with a scratch audit ID, so localStorage and test exports cannot pollute the real audit: render, filter, decide, and save in the browser tool. Save the scratch copy **in the same directory as the original manifest** — the builder rewrites artifact paths relative to the manifest's directory, so a scratch copy placed elsewhere (for example inside `acceptance/`) breaks every screenshot link and fails the test for the wrong reason. In headless environments treat the prompt preview textarea as the verification surface — do not attempt to verify file downloads or clipboard. Delete the scratch copy and its browser storage afterwards.

The generator warns about missing screenshots, broken relative paths, and manifest/schema mismatches (via the validator). Keep the raw manifest and exported decisions immutable after save; if the audit changes afterwards, regenerate the packet with a new manifest version.
