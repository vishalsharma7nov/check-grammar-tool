#!/usr/bin/env bash
# Build the local Ollama model "check-grammar-writer" (natural prose SYSTEM + few-shots).
# Optionally rebuild open human JSONL first. Weights stay in ~/.ollama — not committed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
MODEL_NAME="${MODEL_NAME:-check-grammar-writer}"
BASE_MODEL="${BASE_MODEL:-llama3.2:3b}"
REBUILD_DATA="${REBUILD_DATA:-0}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install: brew install ollama && brew services start ollama"
  echo "Or: https://ollama.com/download"
  exit 1
fi

if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then
  echo "Ollama API not reachable at :11434. Start it: brew services start ollama"
  exit 1
fi

if [[ "$REBUILD_DATA" == "1" ]]; then
  echo "Rebuilding open human dataset…"
  node "$ROOT/build-open-human-data.mjs" --max "${MAX_EXAMPLES:-1500}"
fi

# Training JSONL used for Modelfile few-shot curation / future LoRA
MERGED="$ROOT/data/natural_writing_merged.jsonl"
OPEN="$ROOT/data/open_human_english.jsonl"
if [[ -f "$MERGED" ]]; then
  echo "Using merged dataset: $MERGED ($(wc -l < "$MERGED" | tr -d ' ') lines)"
elif [[ -f "$OPEN" ]]; then
  echo "Using open human dataset: $OPEN ($(wc -l < "$OPEN" | tr -d ' ') lines)"
else
  echo "Note: no JSONL yet. Run: node $ROOT/build-open-human-data.mjs"
fi

echo "Pulling base model: $BASE_MODEL"
ollama pull "$BASE_MODEL"

echo "Creating $MODEL_NAME from $ROOT/Modelfile"
# Ensure Modelfile FROM matches BASE_MODEL when overridden
if [[ "$BASE_MODEL" != "llama3.2:3b" ]]; then
  tmp="$(mktemp)"
  sed "1s/^FROM .*/FROM $BASE_MODEL/" "$ROOT/Modelfile" > "$tmp"
  ollama create "$MODEL_NAME" -f "$tmp"
  rm -f "$tmp"
else
  ollama create "$MODEL_NAME" -f "$ROOT/Modelfile"
fi

echo "Done. Try:"
echo "  ollama run $MODEL_NAME \"Write 80 words on branded clothes, natural blog style\""
echo ""
echo "Point the app at it (.env / apps/web/.env.local):"
echo "  LLM_BASE_URL=http://127.0.0.1:11434/v1"
echo "  LLM_MODEL=$MODEL_NAME"
echo "  LLM_API_KEY=ollama"
echo "  OLLAMA_MODEL=$MODEL_NAME"
echo ""
echo "Data paths:"
echo "  $OPEN"
echo "  $MERGED"
echo "Optional MLX LoRA (4bit, batch 1; works on ~8GB): $ROOT/try-mlx-lora.sh"
