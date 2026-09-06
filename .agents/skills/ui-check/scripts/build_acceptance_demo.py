#!/usr/bin/env python3
"""Build a self-contained interactive UI-check acceptance HTML from a manifest."""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="audit-manifest.json")
    parser.add_argument("--output", required=True, type=Path, help="output HTML path")
    parser.add_argument("--template", type=Path, help="optional HTML template override")
    parser.add_argument("--title", help="optional page title")
    args = parser.parse_args()

    try:
        data = json.loads(args.input.read_text(encoding="utf-8"))
    except OSError as exc:
        raise SystemExit(f"cannot read manifest: {exc}")
    except json.JSONDecodeError as exc:
        raise SystemExit(f"manifest is not valid JSON: {exc}")
    if not isinstance(data, dict) or not data.get("audit_id"):
        raise SystemExit("manifest must be a JSON object with a non-empty audit_id")
    data = copy.deepcopy(data)
    if not isinstance(data.get("artifacts"), dict):
        data["artifacts"] = {}
    data["artifacts"]["manifest_path"] = str(args.input.resolve())
    data["artifacts"]["manifest_name"] = args.input.name
    # Manifest paths are relative to the manifest directory; HTML links are relative
    # to the generated HTML directory. Rewrite known artifact paths accordingly.
    manifest_root = args.input.parent.resolve()
    html_root = args.output.parent.resolve()

    def html_path(value):
        if not isinstance(value, str) or not value or value.startswith(("http://", "https://", "data:", "#")):
            return value
        try:
            # URLs always use forward slashes, so normalize os.sep (backslash on Windows).
            return os.path.relpath(manifest_root / value, html_root).replace(os.sep, "/")
        except ValueError:  # e.g. different drives on Windows
            return (manifest_root / value).resolve().as_posix()

    for evidence in data.get("evidence", []):
        if evidence.get("path"):
            evidence["path"] = html_path(evidence["path"])
    for demo in data.get("demos", []):
        for variant in (demo.get("a", {}), demo.get("b", {})):
            if variant.get("entry"):
                variant["entry"] = html_path(variant["entry"])
            if isinstance(variant.get("screenshots"), list):
                variant["screenshots"] = [html_path(item) for item in variant["screenshots"]]
    template_path = args.template or Path(__file__).resolve().parents[1] / "assets" / "acceptance-demo-template.html"
    try:
        template = template_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"cannot read template: {exc}")
    title = args.title or data.get("title") or f"UI Audit Acceptance · {data['audit_id']}"
    title_escaped = title.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Escape HTML-sensitive characters so JSON cannot close the data script element.
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    payload = payload.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    # Single-pass replacement so a placeholder-shaped title cannot be re-substituted.
    html = re.sub(
        "__TITLE__|__AUDIT_DATA__",
        lambda match: title_escaped if match.group(0) == "__TITLE__" else payload,
        template,
    )
    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(html, encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"cannot write output: {exc}")
    print(f"wrote {args.output} ({len(html)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
