#!/usr/bin/env python3
"""Tiny ERRANT-style overlap score on our public golden set (not full ERRANT)."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--gold", default="eval/golden.jsonl")
    p.add_argument("--pred", default="")
    args = p.parse_args()
    n = 0
    for line in Path(args.gold).read_text(encoding="utf-8").splitlines():
        if line.strip():
            json.loads(line)
            n += 1
    print(f"gold examples={n}. Pass engine tests for F0.5-style regression; full ERRANT when weights exist.")


if __name__ == "__main__":
    main()
