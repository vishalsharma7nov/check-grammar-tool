#!/usr/bin/env bash
# Build the local Ollama model "check-grammar-writer" (natural prose SYSTEM + few-shots).
# Weights stay in Ollama's store (~/.ollama) — not committed to git.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
MODEL_NAME="${MODEL_NAME:-check-grammar-writer}"
BASE_MODEL="${BASE_MODEL:-llama3.2:3b}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install: brew install ollama && brew services start ollama"
  echo "Or: https://ollama.com/download"
  exit 1
fi

if ! curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then
  echo "Ollama API not reachable at :11434. Start it: brew services start ollama"
  exit 1
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
