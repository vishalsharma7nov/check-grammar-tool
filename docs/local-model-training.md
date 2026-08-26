# Fine-tune a local model for natural content writing

Train a **small local LLM** so Writer Studio / AI Write drafts sound more like *your* clear, human prose — varied sentences, concrete details, editable drafts.

This guide is **not** about AI-detector evasion, Quillbot/GPTZero score chasing, or “undetectable” text. Check Grammar is AI-assisted; you should still edit in your voice and disclose AI help when required.

## What you are optimizing for

| Do | Don’t |
| --- | --- |
| Natural rhythm (short + long sentences) | Detector bypass / “below 10% AI” loops |
| Concrete nouns, specific advice | Scraping copyrighted sites for training data |
| Your own past articles (rights you own) | OpenWebText-style dumps as a stand-in for *your* voice |
| Mild opinion and magazine/blog clarity | Training to fool originality checkers |

## Recommended data

Collect **50–500** of your best pieces (or high-quality public-domain / CC text you are allowed to use):

- **Best:** your own published posts, newsletters, docs (you own the rights)
- **Also fine:** Project Gutenberg public-domain prose (for general rhythm, not “your brand”)
- **CC-licensed blogs you wrote** and licensed openly
- **Avoid:** random web scrapes, paywalled news, other people’s blogs without a license

OpenWebText / Common Crawl style corpora teach *generic internet English*, not your voice. Prefer a small, clean set of *your* good writing.

### Dataset format (JSONL)

One object per line:

```json
{"instruction":"Write a ~100-word blog draft on the topic.","input":"Topic: why branded merch works for small shops\nAudience: indie founders\nTone: natural","output":"…your actual good human draft here…"}
```

- `instruction` — stable task wording (match how you use Writer Studio)
- `input` — brief / topic / audience / tone
- `output` — **your** polished human writing (the teaching signal)

Clean: strip tracking URLs, ads, “subscribe” footers. Keep citations honest if the piece had them.

## Practical stacks

### A0. Ready-made local writer (this repo)

On Apple Silicon, the fastest path is an Ollama **Modelfile** (system prompt + few-shots), not a full LoRA:

```bash
brew install ollama && brew services start ollama
./ml/writer-train/create-ollama-model.sh
```

That creates **`check-grammar-writer`** from `llama3.2:3b` with natural-prose instructions aligned to Writer Studio. Dataset scaffold for a later LoRA: `ml/writer-train/data/natural_writing.jsonl`. Details: [`ml/writer-train/README.md`](../ml/writer-train/README.md).

```bash
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=check-grammar-writer
LLM_API_KEY=ollama
OLLAMA_MODEL=check-grammar-writer
```

### A. Ollama only (simplest — no fine-tune)

Use a strong small base model and rely on Check Grammar’s natural-draft prompts:

```bash
ollama pull llama3.2
# or: ollama pull mistral
```

Point the app at Ollama (OpenAI-compatible `/v1`):

```bash
# .env — see .env.example
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=llama3.2
LLM_API_KEY=ollama   # any non-empty string; routes require a key to enable LLM calls
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

Or via the repo bridge: `npm run llm:serve` then `LLM_BASE_URL=http://127.0.0.1:8081/v1`.

### B. LoRA fine-tune (your voice) → Ollama or llama.cpp

Good starter bases: **Llama 3.2 3B** or **Mistral 7B** (fit consumer GPUs / Apple Silicon with QLoRA).

Typical tools:

- **[Unsloth](https://github.com/unslothai/unsloth)** — fast LoRA on Colab / local GPU
- **[Axolotl](https://github.com/OpenAccess-AI-Collective/axolotl)** — YAML configs, Alpaca/ShareGPT-style JSONL

High-level steps:

1. Collect 50–500 of your best posts → clean → JSONL as above  
2. LoRA train on the instruction format (few epochs; stop if it memorizes)  
3. Merge or export adapters → **GGUF** (llama.cpp) or import into **Ollama** via a Modelfile  
4. Serve locally and set `LLM_BASE_URL` / `LLM_MODEL` (and `OLLAMA_*` if using Ollama)

Example Modelfile after you have a GGUF (paths will match your machine):

```dockerfile
FROM ./your-natural-writer-q4_k_m.gguf
PARAMETER temperature 0.7
SYSTEM """You write natural magazine-style drafts for humans to edit. Vary sentence rhythm. Prefer concrete detail. Avoid AI filler. Do not evade detectors."""
```

```bash
ollama create natural-writer -f Modelfile
```

Then:

```bash
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=natural-writer
LLM_API_KEY=ollama
OLLAMA_MODEL=natural-writer
```

Restart `npm run dev:web` (and `npm run llm:serve` / Go API if you use them). Writer Studio and `POST /api/generate` / `/api/naturalize` will use that model.

## Wire-up checklist

| Env | Role |
| --- | --- |
| `LLM_BASE_URL` | OpenAI-compatible chat base (Groq, Ollama `/v1`, or `ml/serve` on `:8081`) |
| `LLM_MODEL` | Model name as the server expects it |
| `LLM_API_KEY` | Required non-empty for Next.js LLM routes (use a dummy for local Ollama) |
| `OLLAMA_BASE_URL` | Health / bridge auto-detect (`http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | Preferred Ollama tag for `ml/serve` |

Same names as [README → Configuration](../README.md#configuration-bring-your-own-keys) and [`.env.example`](../.env.example).

## Ethics and legal

- Do **not** scrape copyrighted sites for training.  
- Do **not** train to fool AI detectors or originality checkers.  
- Outputs remain **AI-assisted**; edit in your voice and cite sources.  
- For grammar-only MLX experiments in this repo, see [`ml/README.md`](../ml/README.md) (separate from this content-writing LoRA path).

## Related

- Writer Studio / open research: [docs/open-corpus.md](open-corpus.md)  
- Vercel env for cloud Groq: [docs/vercel.md](vercel.md)  
- Where text goes: [docs/data-path.md](data-path.md)
