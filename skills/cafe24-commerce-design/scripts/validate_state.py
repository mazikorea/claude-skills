#!/usr/bin/env python3
"""Validate the minimal durable state required by the Cafe24 workflow."""

import json
import sys
from pathlib import Path

REQUIRED = {
    "objective",
    "production_mutated",
    "last_known_good",
    "phase",
    "entities",
    "completed_steps",
    "pending_validations",
    "next_action",
}


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_state.py STATE_LEDGER.json", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    missing = sorted(REQUIRED - data.keys())
    if missing:
        print("FAIL: missing keys: " + ", ".join(missing), file=sys.stderr)
        return 1
    if data["production_mutated"] not in (True, False):
        print("FAIL: production_mutated must be boolean", file=sys.stderr)
        return 1
    print("PASS: durable state ledger is valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
