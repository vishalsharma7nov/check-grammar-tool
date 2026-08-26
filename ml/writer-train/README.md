# Local natural-writing model (Ollama)

Small Mac-friendly path for Writer Studio / AI Write: an Ollama model with Check Grammar’s
**natural prose** system prompt and a few hand-written examples baked in.

**Ethics:** train and prompt for natural rhythm and concrete clarity only — **not** AI-detector
evasion, Quillbot/GPTZero chasing, or “undetectable” text.

## What’s here

| Path | Purpose |
| --- | --- |
| `Modelfile` | Builds `check-grammar-writer` from `llama3.2:3b` + SYSTEM + few-shots |
| `data/natural_writing.jsonl` | 61 instruction→output samples (fashion, lifestyle, how-to) for later LoRA |
| `create-ollama-model.sh` | Pull base + `ollama create` |

Model **weights are not in git**. Ollama stores them under `~/.ollama`.

## Quick start (this Mac)

```bash
brew install ollama          # once
brew services start ollama
./ml/writer-train/create-ollama-model.sh
```

Smoke test:

```bash
ollama run check-grammar-writer "Write 80 words on branded clothes, natural blog style"
```

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

Restart `npm run dev:web`. Optional bridge: `npm run llm:serve` with the same model name.

## Add your own articles (for later LoRA)

Append JSONL lines (rights you own):

```json
{"instruction":"Write a blog draft on the topic. Match the audience and tone. Return only the draft.","input":"Topic: …\nAudience: …\nTone: natural\nWords: ~120","output":"…your polished human draft…"}
```

Clean ads/footers. Prefer your published posts over web scrapes. See also
[`docs/local-model-training.md`](../../docs/local-model-training.md).

## Later: light MLX LoRA (optional)

This Mac profile (Apple Silicon, modest RAM/disk) is a poor fit for a rushed LoRA in &lt;30 minutes.
When you have **≥16GB RAM**, free disk for adapters, and 50–500 of *your* pieces:

1. Convert JSONL to the chat/instruction format your trainer expects.
2. LoRA on **Llama 3.2 3B** with [MLX-LM](https://github.com/ml-explore/mlx-lm) or Unsloth on a GPU box.
3. Export GGUF / merge → new Ollama `FROM` in a Modelfile, or keep using the prompt-only model until then.

Do **not** train to fool detectors. Grammar-only MLX experiments remain under [`ml/README.md`](../README.md).
