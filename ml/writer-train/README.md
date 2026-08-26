# Local natural-writing model (Ollama + optional MLX LoRA)

Mac-friendly path for Writer Studio / AI Write: train on **open human English**
(Project Gutenberg PD + corpus seed), then serve as Ollama model
**`check-grammar-writer`**.

**Ethics:** natural rhythm and concrete clarity only — **not** AI-detector evasion,
Quillbot/GPTZero chasing, or “undetectable” text. No copyrighted scrapes.

## What’s here

| Path | Purpose |
| --- | --- |
| `build-open-human-data.mjs` | Download curated Gutenberg texts → JSONL instruction pairs |
| `data/open_human_english.jsonl` | ~1100+ PD/CC human paragraphs (rebuilt by script) |
| `data/natural_writing.jsonl` | 61 hand-written fashion/lifestyle scaffolds |
| `data/natural_writing_merged.jsonl` | Scaffold + open human (LoRA / archive) |
| `data/open_human_sources.json` | Book list + licenses + counts |
| `Modelfile` | SYSTEM + modern blog few-shots + PD prose few-shots → Ollama |
| `create-ollama-model.sh` | Pull base + `ollama create check-grammar-writer` |
| `try-mlx-lora.sh` | Best-effort tiny MLX LoRA (works on ~8GB with 4bit + batch 1) |
| `adapters/open-human-lora/` | Small LoRA adapters from a successful local run (~13MB) |

Base weights live under `~/.ollama` and Hugging Face cache — **not** in git.
Gutenberg raw cache: `data/gutenberg-cache/` (gitignored).

## Data used (this Mac run)

- **Project Gutenberg** (public domain): ~23 classic books truncated (~176KB each),
  chunked to mid-length paragraphs. Examples: *Pride and Prejudice*, *Sherlock Holmes*,
  *Walden*, *Frankenstein*, *Huckleberry Finn*, *Dracula*, *Jane Eyre*, *Call of the Wild*, …
- **`packages/corpus` seed**: PD / CC0 / CC-BY / CC-BY-SA excerpts with attribution in `input`
- **`natural_writing.jsonl`**: hand-written blog scaffolds (merch, lifestyle, how-to)

Labels are **authentic human text** as `output` (no AI-fabricated “human” targets).

### Rebuild / expand dataset

```bash
# Re-download (polite) + rebuild JSONL (default max 1500)
node ml/writer-train/build-open-human-data.mjs --max 1500

# Use existing gutenberg-cache only
node ml/writer-train/build-open-human-data.mjs --skip-download --max 1500
```

To expand: add more Gutenberg IDs in `GUTENBERG_BOOKS` inside `build-open-human-data.mjs`,
or append owned articles to `natural_writing.jsonl`, then rebuild.

## Quick start — Ollama (app default)

```bash
brew install ollama && brew services start ollama
./ml/writer-train/create-ollama-model.sh
# optional: REBUILD_DATA=1 ./ml/writer-train/create-ollama-model.sh
```

Smoke test:

```bash
ollama run check-grammar-writer "Write 80 words on branded clothes, natural blog style"
```

## Optional — MLX LoRA (Apple Silicon)

Succeeded on M2 / ~8GB with 4-bit Llama 3.2 3B, batch 1, 4 LoRA layers, 30 iters
(peak ~2.6GB). Adapters: `adapters/open-human-lora/`.

```bash
cd ml/writer-train
python3 -m venv .venv && .venv/bin/pip install mlx-lm
# prepare data/mlx/{train,valid}.jsonl via try-mlx-lora.sh or build script notes
./try-mlx-lora.sh
```

Serving path for the web app remains **Ollama** `check-grammar-writer` (Modelfile).
MLX adapters are for further local experiments / fuse→GGUF later; they are not
auto-loaded by Ollama.

## Point Check Grammar at it

Root `.env` and/or `apps/web/.env.local`:

```bash
LLM_PROVIDER=local
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=check-grammar-writer
LLM_API_KEY=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=check-grammar-writer
```

Restart `npm run dev:web`. Optional bridge: `npm run llm:serve`.

See also [`docs/local-model-training.md`](../../docs/local-model-training.md).
