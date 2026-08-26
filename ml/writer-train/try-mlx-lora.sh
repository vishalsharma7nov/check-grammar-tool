#!/usr/bin/env bash
# Best-effort tiny MLX LoRA on Apple Silicon (~8GB OK with 4bit + batch 1).
# Converts merged JSONL → data/mlx/{train,valid}.jsonl, then runs mlx_lm lora.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
DATA="$ROOT/data/natural_writing_merged.jsonl"
MLX_DIR="$ROOT/data/mlx"
ADAPTER_DIR="$ROOT/adapters/open-human-lora"
BASE_HF="${BASE_HF:-mlx-community/Llama-3.2-3B-Instruct-4bit}"
ITERS="${ITERS:-30}"
MAX_SEQ="${MAX_SEQ:-384}"
VENV="$ROOT/.venv"

if [[ ! -f "$DATA" ]]; then
  echo "Missing $DATA — run: node ml/writer-train/build-open-human-data.mjs"
  exit 1
fi

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Creating venv + installing mlx-lm…"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q mlx-lm
fi

"$VENV/bin/python" - <<'PY' "$DATA" "$MLX_DIR"
import json, random, sys
from pathlib import Path
src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
rows = []
for line in src.read_text().splitlines():
    if not line.strip():
        continue
    o = json.loads(line)
    user = o.get("instruction", "").strip()
    inp = (o.get("input") or "").strip()
    if inp:
        user = f"{user}\n\n{inp}"
    rows.append({"messages": [
        {"role": "user", "content": user},
        {"role": "assistant", "content": o["output"]},
    ]})
random.seed(42)
random.shuffle(rows)
rows = rows[:400]
n_val = max(20, len(rows) // 10)
val, train = rows[:n_val], rows[n_val:]
for name, data in [("train.jsonl", train), ("valid.jsonl", val)]:
    (out_dir / name).write_text("\n".join(json.dumps(r) for r in data) + "\n")
print(f"Wrote train={len(train)} valid={len(val)} → {out_dir}")
PY

mkdir -p "$ADAPTER_DIR"
echo "LoRA: base=$BASE_HF iters=$ITERS batch=1 layers=4 max_seq=$MAX_SEQ"
set +e
"$VENV/bin/python" -m mlx_lm lora \
  --model "$BASE_HF" \
  --train \
  --data "$MLX_DIR" \
  --adapter-path "$ADAPTER_DIR" \
  --batch-size 1 \
  --iters "$ITERS" \
  --learning-rate 1e-5 \
  --num-layers 4 \
  --steps-per-eval 15 \
  --save-every "$ITERS" \
  --max-seq-length "$MAX_SEQ" \
  --grad-checkpoint
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
  echo "MLX LoRA failed (exit $STATUS). Fall back: ./create-ollama-model.sh"
  exit $STATUS
fi
echo "Adapters → $ADAPTER_DIR"
echo "App still uses Ollama Modelfile model: ./create-ollama-model.sh"
