#!/usr/bin/env python3
"""Tiny LM training loop. Uses MLX when present; otherwise a CPU numpy dry-run."""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from cfg import load_config


def try_mlx():
    try:
        import mlx.core as mx
        import mlx.nn as nn
        import mlx.optimizers as optim

        return mx, nn, optim
    except ImportError:
        return None, None, None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--config", default="ml/configs/m2-10m.yaml")
    args = p.parse_args()
    cfg = load_config(args.config)
    mx, nn, optim = try_mlx()
    out = Path(cfg["out"])
    out.mkdir(parents=True, exist_ok=True)
    if mx is None:
        (out / "DRY_RUN.txt").write_text(
            f"MLX not installed. Would train dim={cfg['model']['dim']} layers={cfg['model']['layers']} "
            f"batch={cfg['train']['batch_size']} seq={cfg['train']['seq_len']} on {cfg['train']['device']}.\n",
            encoding="utf-8",
        )
        print("dry-run (install mlx on Apple Silicon to train)")
        return

    class TinyGPT(nn.Module):
        def __init__(self):
            super().__init__()
            d, L, v = cfg["model"]["dim"], cfg["model"]["layers"], cfg["model"]["vocab"]
            self.tok = nn.Embedding(v, d)
            self.blocks = [nn.TransformerEncoderLayer(d, cfg["model"]["heads"]) for _ in range(L)]
            self.lm = nn.Linear(d, v)

        def __call__(self, x):
            h = self.tok(x)
            for b in self.blocks:
                h = b(h)
            return self.lm(h)

    model = TinyGPT()
    # One dummy step so the graph is real; full data loop is in later PRs.
    x = mx.zeros((1, min(32, cfg["train"]["seq_len"])), dtype=mx.int32)
    logits = model(x)
    loss = mx.mean(logits.astype(mx.float32) ** 2)
    mx.eval(loss)
    (out / "ok.txt").write_text(f"loss_shape_ok {tuple(logits.shape)} {float(loss)}\n", encoding="utf-8")
    print("mlx step ok", float(loss), "ppl_bound", math.exp(min(20, abs(float(loss)))))


if __name__ == "__main__":
    main()
