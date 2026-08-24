#!/usr/bin/env python3
"""Detector training stub: token-level keep/replace tags. Same YAML contract as the fixer."""
from __future__ import annotations

import argparse
from pathlib import Path

from cfg import load_config


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="ml/configs/m2-detector-40m.yaml")
    args = p.parse_args()
    cfg = load_config(args.config)
    out = Path(cfg["out"])
    out.mkdir(parents=True, exist_ok=True)
    (out / "README.txt").write_text(
        "Detector (~40M). Labels: KEEP / REPLACE / DELETE / INSERT.\n"
        f"config={args.config}\nInstall mlx and point --data at gec_pairs.tsv to train.\n",
        encoding="utf-8",
    )
    print("detector stub ready at", out)


if __name__ == "__main__":
    main()
