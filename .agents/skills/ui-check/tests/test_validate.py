#!/usr/bin/env python3
"""Unit tests for scripts/validate_audit_manifest.py (standard library only).

Run with:  python3 -m unittest discover tests
"""

from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_audit_manifest.py"


def base_manifest() -> dict:
    return {
        "schema_version": "1.0",
        "audit_id": "test",
        "scope": {"request": "x", "tier": "STANDARD"},
        "baseline": {
            "mode": "INFERRED",
            "sources": [],
            "references": [{"baseline_id": "BASELINE-001", "description": "d"}],
            "unknowns": [],
        },
        "coverage_plan": {"critical_screens": ["SCREEN-001"], "default_env_ids": ["ENV-001"], "contrast_env_ids": []},
        "environments": [{"env_id": "ENV-001", "status": "READY"}],
        "screens": [{"screen_id": "SCREEN-001"}],
        "states": [{"state_id": "STATE-001", "screen_id": "SCREEN-001"}],
        "evidence": [
            {
                "evidence_id": "EV-001",
                "screen_id": "SCREEN-001",
                "state_id": "STATE-001",
                "env_id": "ENV-001",
                "kind": "screenshot",
                "status": "PASS",
                "path": "shots/a.png",
                "tool": "browser",
            }
        ],
        "findings": [
            {
                "finding_id": "SPEC-001",
                "category": "SPEC",
                "severity": "P2",
                "evidence_ids": ["EV-001"],
                "code_refs": ["src/x.css:1"],
                "baseline_refs": ["BASELINE-001"],
                "demo_ids": [],
            }
        ],
        "demos": [],
        "reviews": [],
        "decisions": [],
        "artifacts": {},
        "continuation": {"note": "x"},
    }


class ValidateManifestTests(unittest.TestCase):
    def run_validator(self, manifest: dict) -> tuple[int, str]:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "shots").mkdir()
            (root / "shots" / "a.png").write_bytes(b"\x89PNG\r\n\x1a\n")
            path = root / "m.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            proc = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                capture_output=True,
                text=True,
            )
            return proc.returncode, proc.stdout

    def assert_valid(self, manifest: dict) -> str:
        code, out = self.run_validator(manifest)
        self.assertEqual(code, 0, out)
        self.assertIn("VALID", out)
        return out

    def assert_invalid(self, manifest: dict, expected_fragment: str) -> None:
        code, out = self.run_validator(manifest)
        self.assertEqual(code, 1, out)
        self.assertIn(expected_fragment, out)

    def test_minimal_valid(self):
        self.assert_valid(base_manifest())

    def test_dangling_baseline_ref(self):
        m = base_manifest()
        m["findings"][0]["baseline_refs"] = ["BASELINE-NOPE"]
        self.assert_invalid(m, "unknown baseline reference")

    def test_evidence_rejects_demo_status(self):
        m = base_manifest()
        m["evidence"][0]["status"] = "READY"
        self.assert_invalid(m, "invalid status")

    def test_remote_evidence_path_allowed(self):
        m = base_manifest()
        m["evidence"][0]["path"] = "https://cdn.example.com/a.png"
        self.assert_valid(m)

    def test_dangling_anchor_evidence(self):
        m = base_manifest()
        m["demos"] = [
            {
                "demo_id": "DEMO-001",
                "finding_ids": ["SPEC-001"],
                "status": "DRAFT",
                "a": {"anchor_evidence_id": "EV-404", "screenshots": []},
                "b": {"screenshots": []},
            }
        ]
        self.assert_invalid(m, "unknown anchor evidence")

    def test_decision_exactly_one_target(self):
        m = base_manifest()
        m["demos"] = [
            {"demo_id": "DEMO-001", "finding_ids": ["SPEC-001"], "status": "DRAFT", "a": {"screenshots": []}, "b": {"screenshots": []}}
        ]
        m["decisions"] = [{"demo_id": "DEMO-001", "finding_id": "SPEC-001", "status": "ACCEPTED"}]
        self.assert_invalid(m, "exactly one is allowed")

    def test_coverage_plan_ghost_screen(self):
        m = base_manifest()
        m["coverage_plan"]["critical_screens"] = ["SCREEN-404"]
        self.assert_invalid(m, "unknown critical screen")

    def test_finding_without_any_evidence(self):
        m = base_manifest()
        m["findings"][0]["evidence_ids"] = []
        m["findings"][0]["code_refs"] = []
        self.assert_invalid(m, "no evidence_ids and no code_refs")

    def test_screenshots_only_demo_is_valid(self):
        m = base_manifest()
        m["demos"] = [
            {
                "demo_id": "DEMO-001",
                "finding_ids": ["SPEC-001"],
                "status": "READY",
                "a": {"screenshots": ["shots/a.png"], "anchor_evidence_id": "EV-001", "fidelity": "structural"},
                "b": {"screenshots": ["shots/a.png"]},
                "env_ids": ["ENV-001"],
            }
        ]
        self.assert_valid(m)

    def test_state_ghost_screen(self):
        m = base_manifest()
        m["states"][0]["screen_id"] = "SCREEN-404"
        self.assert_invalid(m, "unknown screen")

    def test_invalid_review_disposition(self):
        m = base_manifest()
        m["reviews"] = [{"review_id": "R1", "disposition": "MAYBE"}]
        self.assert_invalid(m, "invalid disposition")

    def test_invalid_tier_and_mode(self):
        m = base_manifest()
        m["scope"]["tier"] = "TURBO"
        self.assert_invalid(m, "invalid tier")
        m2 = base_manifest()
        m2["baseline"]["mode"] = "GUESSED"
        self.assert_invalid(m2, "invalid mode")

    def test_duplicate_ids(self):
        m = base_manifest()
        m["screens"].append(copy.deepcopy(m["screens"][0]))
        self.assert_invalid(m, "duplicate SCREEN-001")


if __name__ == "__main__":
    unittest.main()
