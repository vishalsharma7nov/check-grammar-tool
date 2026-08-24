#!/usr/bin/env python3
"""Fixer (~60–80M) encoder-decoder stub. params_cap_million must stay <= 80 on M2 16GB."""
from __future__ import annotations

import argparse
from pathlib import Path

from cfg import load_config


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="ml/configs/m2-fixer-80m.yaml")
    args = p.parse_args()
    cfg = load_config(args.config)
    cap = cfg["model"].get("params_cap_million", 80)
    if cap > 80:
        raise SystemExit("refusing to train >80M on the 16GB M2 config")
    out = Path(cfg["out"])
    out.mkdir(parents=True, exist_ok=True)
    (out / "README.txt").write_text(
        f"Fixer cap={cap}M. Seq {cfg['train']['seq_len']}, batch {cfg['train']['batch_size']}.\n",
        encoding="utf-8",
    )
    print("fixer stub ready at", out)


if __name__ == "__main__":
    main()
