# Visual and interaction review rubric

Use this rubric after extracting the project's own baseline. Do not score a surface against an invented design system.

## Review order

1. Standard alignment: compare to explicit rules or cited repeated project patterns.
2. Consistency: compare equivalent components and states across surfaces and environments.
3. Completion: compare newer work to mature project references.
4. Usability and edge behavior: confirm that state changes, feedback, errors, and recovery remain clear.
5. External floor: check the baseline-independent minimums below.
6. Opportunity: propose only changes that have clear value and stay inside the existing language.

Evaluate every question for every surface; a spec violation does not exempt a screen from polish, edge, or opportunity review.

## Dimensions

### Structure and hierarchy

- Is the primary task obvious?
- Are grouping, order, alignment, and emphasis consistent with mature references?
- Does the hierarchy survive resizing, zoom, theme, locale, and long content?

### Rhythm and density

- Do spacing and line lengths follow the project's rhythm?
- Are dense areas readable and sparse areas intentional?
- Do text wrapping, scrollbars, and fixed regions remain usable at supported sizes and scales?

### Component fidelity

- Do controls use the existing component family, states, tokens, iconography, and copy patterns?
- Do equivalent components behave and look equivalent in Light/Dark/System and accessibility modes?

### State completeness

- Are empty, loading, partial, error, disabled, permission, retry, success, and recovery states present when applicable?
- Does every transition provide timely, understandable feedback?

### Finish and restraint

- Does the surface feel intentional and complete beside mature project work?
- Are there temporary placeholders, awkward seams, unexplained emphasis, accidental complexity, or decorative changes without value?

### Environment resilience

- Does the surface remain legible, operable, and visually coherent across supported sizes, zoom, DPR, themes, locale, contrast, and motion settings?

## External accessibility floor

These minimums apply regardless of baseline mode, because an internally consistent project can still be consistently broken:

- text contrast (WCAG AA: 4.5:1 body text, 3:1 large text and essential UI);
- visible keyboard focus on interactive controls;
- minimum touch-target size on touch surfaces;
- reduced-motion preference respected for large or looping motion.

When the project's own tokens or conventions violate the floor, file the finding as `SPEC_CHANGE_REQUIRED` with the floor as the cited authority. Do not let an inferred baseline legalize the defect, and do not reclassify it as taste.

## Baseline discipline (INFERRED and HYBRID modes)

- An inferred convention needs at least two independent surfaces repeating it; record every rule's source screens in the manifest.
- Do not judge a screen against a rule whose only source is that same screen.
- "Mature" means shipped, user-facing, and consistent with the project's most-repeated patterns — not merely old.
- When mature surfaces conflict, resolve by adoption count and recency, and record the choice and its evidence.

## Finding discipline

- `SPEC`: cite the rule/pattern, screenshot, code, and deviation.
- `POLISH`: cite the mature reference, screenshot comparison, and user impact.
- `EDGE`: provide reproduction, state/environment, screenshot, and code path. A reproducible defect is `EDGE` even when a spec violation is the root cause; record that violation in the finding's code refs. Before filing a reproducible behavior as a defect, check the code for explicit design intent (a comment, a named decision, an obvious deliberate branch). When the behavior is intentional and the problem is only a boundary consequence of that intent, frame the finding as a design-decision boundary — state the intent, the boundary where it breaks down, and leave the resolution to the user — instead of asserting a bug that would silently overturn an on-record decision.
- `OPT`: state the value, scope, risk, and why it remains within the standard. A proposal that needs a new token, a change to an existing token's defined value, or a visual pattern that exists nowhere in the project is `SPEC_CHANGE_REQUIRED`, not `OPT`; recombining existing tokens and existing patterns stays `OPT`.
- `SPEC_CHANGE_REQUIRED`: isolate any proposal that would create or change a design rule; it requires an explicit user decision.

Do not use "looks better" as the only rationale. Verify suspected geometry and style issues with DOM measurements or computed styles before filing. State what changed, why it matters, and how the project baseline or the external floor supports the judgment.

## Demo fidelity discipline

When you build A/B evidence, the A variant must reproduce the current product faithfully **in both directions**: not worse than reality — do not add alarm colours the product does not use, do not omit real affordances (existing CTAs, escape hatches, populated states) — and not better than reality either — do not humanize copy the product shows as raw enums, do not format values the product prints raw, do not colour states the product renders muted. A beautified A understates the defect and quietly weakens the case for B; dedicate one reviewer pass to A-fidelity in both directions. Keep any auditor annotation visually neutral and clearly labelled — never styled as product UI.

B variants carry their own fidelity duties: every enum value, state name, and copy string shown in B must exist in (or be explicitly proposed against) the product's real type definitions and canonical copy sources — an invented value domain survives every purely visual review; and privacy, legal, or consent disclosure copy must be preserved verbatim, with any reduction surfaced as its own decision item rather than folded into a "merge of duplicates". A B variant that only recombines existing tokens and patterns stays inside the standard; if it introduces or changes a design rule it is `SPEC_CHANGE_REQUIRED`. When a static mock only approximates the project's real token or pixel values, label it direction-only (not an implementation baseline) so a later implementer builds from the real primitives and tokens rather than copying the mock's literal values.
