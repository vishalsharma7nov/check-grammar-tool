#!/usr/bin/env python3
"""Build a tiny local corpus + synthetic error pairs. No user documents."""
from __future__ import annotations

import argparse
import random
import re
from pathlib import Path

SEED = """The committee will meet tomorrow morning.
Please reply to this email before Friday.
She bought an apple and a university guidebook.
We should move the call earlier if everyone agrees.
In order to finish, we need many testers.
"""

TYPOS = [("the", "teh"), ("receive", "recieve"), ("separate", "seperate"), ("an apple", "a apple")]


def corrupt(s: str, rng: random.Random) -> str:
    out = s
    for a, b in TYPOS:
        if rng.random() < 0.5:
            out = re.sub(rf"\b{a}\b", b, out, count=1, flags=re.I)
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="ml/data/processed")
    args = p.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(7)
    lines = [ln.strip() for ln in SEED.splitlines() if ln.strip()]
    # Repeat so tokenizer/train loops have volume without huge downloads.
    lines = lines * 200
    (out / "corpus.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    pairs = []
    for s in lines:
        pairs.append(f"{corrupt(s, rng)}\t{s}")
    (out / "gec_pairs.tsv").write_text("\n".join(pairs) + "\n", encoding="utf-8")
    print(f"wrote {len(lines)} sentences to {out}")


if __name__ == "__main__":
    main()
