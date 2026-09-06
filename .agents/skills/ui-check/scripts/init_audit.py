#!/usr/bin/env python3
"""Create an isolated UI-check audit workspace and a minimal manifest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--audit-id", required=True)
    parser.add_argument("--scope", default="")
    parser.add_argument("--tier", default="STANDARD", choices=["QUICK", "STANDARD", "EXHAUSTIVE"])
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    root = args.output_dir
    try:
        if root.exists() and any(root.iterdir()) and not args.force:
            raise SystemExit(f"output directory is not empty: {root}; use --force only for an intentional audit reset")
        for name in ("reports", "screens", "demos", "fixtures", "acceptance"):
            (root / name).mkdir(parents=True, exist_ok=True)
    except (NotADirectoryError, OSError) as exc:
        raise SystemExit(f"cannot create audit workspace: {exc}")
    manifest = {
        "schema_version": "1.0",
        "audit_id": args.audit_id,
        "title": f"UI Audit Acceptance · {args.audit_id}",
        "scope": {"request": args.scope, "tier": args.tier, "platforms": [], "surfaces": [], "inferred": [], "included": [], "excluded": [], "blocked": []},
        "baseline": {"mode": "INFERRED", "sources": [], "references": [], "unknowns": []},
        "coverage_plan": {"critical_screens": [], "default_env_ids": [], "contrast_env_ids": [], "collapsed": [], "notes": ""},
        "environments": [], "screens": [], "states": [], "evidence": [], "findings": [], "demos": [], "reviews": [], "decisions": [],
        "artifacts": {"coverage": {}},
        "continuation": {}
    }
    path = root / "audit-manifest.json"
    try:
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"cannot write manifest: {exc}")
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
