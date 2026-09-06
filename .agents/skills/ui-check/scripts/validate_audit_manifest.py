#!/usr/bin/env python3
"""Validate UI-check manifest IDs, references, decisions, and evidence paths."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


EVIDENCE_STATUS = {"PASS", "FAIL", "BLOCKED", "NOT_RUN", "NOT_SUPPORTED"}
EVIDENCE_KINDS = {"screenshot", "video", "console", "network", "dom", "code", "design", "test"}
DEMO_STATUS = {"DRAFT", "READY", "BLOCKED", "REVIEWED", "STALE"}
ENV_STATUS = {"READY", "BLOCKED", "NOT_SUPPORTED"}
DECISIONS = {"PENDING_CONFIRMATION", "ACCEPTED", "REJECTED", "NEEDS_REVISION", "DEFERRED"}
CATEGORIES = {"SPEC", "POLISH", "EDGE", "OPT", "SPEC_CHANGE_REQUIRED"}
SEVERITIES = {"P0", "P1", "P2", "P3"}
BASELINE_MODES = {"EXPLICIT", "HYBRID", "INFERRED", "ABSENT"}
TIERS = {"QUICK", "STANDARD", "EXHAUSTIVE"}
FIDELITY = {"pixel", "structural", "schematic"}
REVIEW_DISPOSITIONS = {"ACCEPT", "PARTIAL", "REJECT", "DEFER"}
REMOTE_PREFIXES = ("http://", "https://", "data:")


def ids(items, key, label, errors):
    seen = set()
    for item in items:
        value = item.get(key)
        if not value:
            errors.append(f"{label}: missing {key}")
        elif value in seen:
            errors.append(f"{label}: duplicate {value}")
        else:
            seen.add(value)
    return seen


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--allow-missing-artifacts", action="store_true")
    args = parser.parse_args()
    errors: list[str] = []
    warnings: list[str] = []
    try:
        data = json.loads(args.manifest.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - argparse-facing error path
        print(f"ERROR: cannot read JSON: {exc}", file=sys.stderr)
        return 2
    if not isinstance(data, dict):
        errors.append("manifest must be a JSON object")
        data = {}
    for field in ("schema_version", "audit_id", "scope", "baseline"):
        if not data.get(field):
            errors.append(f"missing top-level field: {field}")
    rows = lambda key: data.get(key) or []  # tolerate explicit null arrays
    env_ids = ids(rows("environments"), "env_id", "environment", errors)
    screen_ids = ids(rows("screens"), "screen_id", "screen", errors)
    state_ids = ids(rows("states"), "state_id", "state", errors)
    evidence_ids = ids(rows("evidence"), "evidence_id", "evidence", errors)
    finding_ids = ids(rows("findings"), "finding_id", "finding", errors)
    demo_ids = ids(rows("demos"), "demo_id", "demo", errors)
    baseline_ids = ids((data.get("baseline") or {}).get("references") or [], "baseline_id", "baseline reference", errors)
    root = args.manifest.parent

    def check_artifact(path: str, message: str) -> None:
        if path.startswith(REMOTE_PREFIXES):
            return
        if not (root / path).exists():
            (warnings if args.allow_missing_artifacts else errors).append(message)

    scope = data.get("scope", {}) or {}
    if scope.get("tier") is not None and scope.get("tier") not in TIERS:
        errors.append(f"scope: invalid tier {scope.get('tier')}")
    for item in rows("environments"):
        if item.get("status") not in ENV_STATUS | {None}:
            errors.append(f"environment {item.get('env_id')}: invalid status")
    for item in rows("states"):
        if item.get("screen_id") and item["screen_id"] not in screen_ids:
            errors.append(f"state {item.get('state_id')}: unknown screen {item['screen_id']}")
    for item in rows("evidence"):
        if item.get("status") not in EVIDENCE_STATUS:
            errors.append(f"evidence {item.get('evidence_id')}: invalid status")
        if item.get("kind") is not None and item.get("kind") not in EVIDENCE_KINDS:
            errors.append(f"evidence {item.get('evidence_id')}: invalid kind {item.get('kind')}")
        for key, pool, label in (("screen_id", screen_ids, "screen"), ("state_id", state_ids, "state"), ("env_id", env_ids, "environment")):
            if item.get(key) and item[key] not in pool:
                errors.append(f"evidence {item.get('evidence_id')}: unknown {label} {item[key]}")
        path = item.get("path")
        if path and item.get("status") not in {"BLOCKED", "NOT_RUN", "NOT_SUPPORTED"}:
            check_artifact(path, f"evidence {item.get('evidence_id')}: missing artifact {path}")
    for item in rows("findings"):
        if item.get("category") not in CATEGORIES:
            errors.append(f"finding {item.get('finding_id')}: invalid category")
        if item.get("severity") is not None and item.get("severity") not in SEVERITIES:
            errors.append(f"finding {item.get('finding_id')}: invalid severity {item.get('severity')}")
        for key, pool, label in (("screen_ids", screen_ids, "screen"), ("state_ids", state_ids, "state"), ("env_ids", env_ids, "environment"), ("evidence_ids", evidence_ids, "evidence"), ("demo_ids", demo_ids, "demo"), ("baseline_refs", baseline_ids, "baseline reference")):
            for value in item.get(key, []) or []:
                if value not in pool:
                    errors.append(f"finding {item.get('finding_id')}: unknown {label} {value}")
        if not (item.get("evidence_ids") or []) and not (item.get("code_refs") or []):
            errors.append(f"finding {item.get('finding_id')}: no evidence_ids and no code_refs")
        elif not (item.get("evidence_ids") or []):
            warnings.append(f"finding {item.get('finding_id')}: no evidence_ids (code refs only)")
    for item in rows("demos"):
        for value in item.get("finding_ids", []) or []:
            if value not in finding_ids:
                errors.append(f"demo {item.get('demo_id')}: unknown finding {value}")
        for value in item.get("env_ids", []) or []:
            if value not in env_ids:
                errors.append(f"demo {item.get('demo_id')}: unknown environment {value}")
        for value in item.get("baseline_refs", []) or []:
            if value not in baseline_ids:
                errors.append(f"demo {item.get('demo_id')}: unknown baseline reference {value}")
        if item.get("status") and item["status"] not in DEMO_STATUS:
            errors.append(f"demo {item.get('demo_id')}: invalid status")
        variant_a = item.get("a", {}) or {}
        anchor = variant_a.get("anchor_evidence_id")
        if anchor and anchor not in evidence_ids:
            errors.append(f"demo {item.get('demo_id')}.a: unknown anchor evidence {anchor}")
        if variant_a.get("fidelity") is not None and variant_a.get("fidelity") not in FIDELITY:
            errors.append(f"demo {item.get('demo_id')}.a: invalid fidelity {variant_a.get('fidelity')}")
        if item.get("status") in {"READY", "REVIEWED"}:
            for variant_name in ("a", "b"):
                variant = item.get(variant_name, {}) or {}
                entry = variant.get("entry")
                screenshots = variant.get("screenshots", []) or []
                if entry:
                    entry_path = re.split(r"[?#]", entry, maxsplit=1)[0]
                    if not entry_path.startswith(REMOTE_PREFIXES) and not (root / entry_path).exists():
                        message = f"demo {item.get('demo_id')}.{variant_name}: missing entry {entry}"
                        (warnings if args.allow_missing_artifacts else errors).append(message)
                if not screenshots:
                    errors.append(f"demo {item.get('demo_id')}.{variant_name}: missing screenshots")
                for screenshot in screenshots:
                    if isinstance(screenshot, str):
                        check_artifact(screenshot, f"demo {item.get('demo_id')}.{variant_name}: missing screenshot {screenshot}")
    for item in rows("reviews"):
        if item.get("disposition") is not None and item.get("disposition") not in REVIEW_DISPOSITIONS:
            errors.append(f"review {item.get('review_id') or item.get('reviewer_role')}: invalid disposition {item.get('disposition')}")
    for item in rows("decisions"):
        if item.get("demo_id") and item.get("finding_id"):
            errors.append(f"decision: both demo_id and finding_id set ({item['demo_id']}, {item['finding_id']}); exactly one is allowed")
        target = item.get("demo_id") or item.get("finding_id")
        if not target or target not in demo_ids | finding_ids:
            errors.append(f"decision: unknown target {target}")
        if item.get("status") not in DECISIONS:
            errors.append(f"decision {target}: invalid status")
    plan = data.get("coverage_plan", {}) or {}
    for value in plan.get("critical_screens", []) or []:
        if value not in screen_ids:
            errors.append(f"coverage_plan: unknown critical screen {value}")
    for key in ("default_env_ids", "contrast_env_ids"):
        for value in plan.get(key, []) or []:
            if value not in env_ids:
                errors.append(f"coverage_plan.{key}: unknown environment {value}")
    baseline = data.get("baseline", {}) or {}
    if baseline.get("mode") is not None and baseline.get("mode") not in BASELINE_MODES:
        errors.append(f"baseline: invalid mode {baseline.get('mode')}")
    if baseline.get("mode") == "EXPLICIT" and not baseline.get("sources") and not baseline.get("references"):
        warnings.append("baseline is EXPLICIT but has no sources or references")
    if baseline.get("mode") in {"INFERRED", "HYBRID"} and not baseline.get("references"):
        warnings.append(f"baseline is {baseline.get('mode')} but has no inferred rules in references")
    if data.get("demos") and not data.get("continuation"):
        warnings.append("demos exist but continuation packet metadata is empty")
    if errors:
        print("INVALID")
        for error in errors:
            print(f"- {error}")
        for warning in warnings:
            print(f"WARNING: {warning}")
        return 1
    print("VALID")
    print(f"screens={len(screen_ids)} states={len(state_ids)} environments={len(env_ids)} evidence={len(evidence_ids)} findings={len(finding_ids)} demos={len(demo_ids)}")
    for warning in warnings:
        print(f"WARNING: {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
