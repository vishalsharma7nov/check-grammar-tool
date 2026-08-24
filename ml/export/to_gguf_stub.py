#!/usr/bin/env python3
"""Placeholder GGUF exporter. Real conversion: python -m mlx_lm.convert + llama.cpp convert_hf_to_gguf.py"""
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--src", default="ml/checkpoints/fixer-80m")
    p.add_argument("--out", default="ml/export/check-gec-v0.gguf")
    args = p.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(b"GGUF-STUB\n")  # not a real GGUF; keeps the pipeline wired
    print("wrote stub", out)


if __name__ == "__main__":
    main()
