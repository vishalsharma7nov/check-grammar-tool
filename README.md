# Check Grammar

An original, open-source writing assistant: spelling, grammar, punctuation, and clarity checks that run **on your machine by default**. Hosted cloud is optional. Paid plans sell hosted GPU inference of **our** weights, team style guides, and SSO — never the core checker.

This project is **not** affiliated with Grammarly.

## What you get

| Surface | Path | Talks to |
| --- | --- | --- |
| Web editor | `apps/web` | Go API and/or in-browser privacy engine |
| Browser extension (MV3) | `apps/extension` | Same `/v1/check` contract |
| VS Code / Cursor | `apps/vscode` | Same `/v1/check` contract |
| Desktop (Tauri) | `apps/desktop` | Bundled web UI + local API/sidecar |
| Check API | `server/api` | Rule engine + optional local LLM |
| Privacy engine | `packages/engine` | Runs in the browser, no network |
| Training | `ml/` | MLX from-scratch GEC on Apple Silicon |

## Quick start (rules-only demo)

Need **Node 20+**. Go 1.22+ is required for `server/api` (`brew install go`). Until Go is on PATH, a TypeScript shim serves the same `/v1/check` contract:

```bash
cp .env.example .env
npm install
# Web editor
npm run build -w @check-grammar/web && npm run start -w @check-grammar/web
# API (pick one)
npm run dev:api          # Go — preferred
npm run dev:shim         # TypeScript engine, same JSON
```

Open [http://localhost:3000](http://localhost:3000). Suggestions appear **while you type**. Default mode is **Privacy**: text stays in the tab.

### Free spelling (no API key)

Spelling is the bundled open English word lists in `@check-grammar/engine` — not a paid dictionary API (no Grammarly, Oxford, etc.).

| Surface | Dictionary |
| --- | --- |
| Web editor **Privacy** mode | In-browser engine (~370k words) |
| Browser extension | Same bundled `engine.js` |
| `npm run dev:shim` | Same engine at `/v1/check` |
| `npm run dev:api` (Go) | Common-typo list only (~40 entries) |

Sources: [dwyl/english-words](https://github.com/dwyl/english-words) (Unlicense) and [google-10000-english](https://github.com/first20hours/google-10000-english) (MIT). See [THIRD_PARTY.md](THIRD_PARTY.md). Rebuild: `npm run wordlist -w @check-grammar/engine`.

**How it works:** pause ~0.3s while typing; the word under the caret is skipped until you move on. Unknown names or jargon → add to **Personal dict**. For full spelling over HTTP, use the shim (or Privacy mode) instead of the Go API alone.

**Optional later:** self-hosted [LanguageTool](https://languagetool.org) merges with the rule engine when `LANGUAGETOOL_URL` is set (see below). Core spelling does not require it.

### LanguageTool (optional)

Run the bundled LanguageTool container and point the API at it:

```bash
docker compose up -d languagetool
export LANGUAGETOOL_URL=http://localhost:8010
npm run dev:api
```

When `LANGUAGETOOL_URL` is set, `/v1/check` merges LanguageTool matches with the TS rule engine (deduped by offset). The API also exposes a LanguageTool-shaped `POST /v2/check` for existing LT clients.

### Plagiarism / originality check (optional, free tier)

**Check plagiarism** in the editor compares your text against published web sources and links each match so you can **cite it** — it detects overlap, it never helps hide it. Text is sent only when you click the button (opt-in).

**Vercel (no Render required):** set `PLAGIARISM_API_KEY` in the Vercel project env (server-side, **not** `NEXT_PUBLIC_`). The web app calls same-origin `POST /api/plagiarism`. For free cloud rewrite, also set `LLM_API_KEY` (Groq). See [docs/vercel.md](docs/vercel.md).

**Local Go API:**

1. Register at [Winston AI](https://gowinston.ai) → free API credits at signup, **no credit card** (plagiarism checks cost 2 credits/word).
2. Dashboard → API tokens → create a token.
3. Set it and restart the API:

```bash
export PLAGIARISM_API_KEY=your-token   # provider defaults to winston
npm run dev:api   # or dev:shim — both serve POST /v1/plagiarism
```

Without a key the endpoint still answers `200` with `skippedReason: "no provider configured"`, and the editor explains how to get a free key. Alternatives: `PLAGIARISM_PROVIDER=prepostseo` ([Prepostseo API](https://www.prepostseo.com/apis), free tier) or `PLAGIARISM_PROVIDER=generic` with `PLAGIARISM_API_URL` pointing at any REST endpoint that accepts `{"text"}` and returns `{score, matches: [{text, url, similarity}]}`.

### Browser overlay (any website text box)

```bash
npm run build:extension
```

Chrome → `chrome://extensions` → Load unpacked → `apps/extension`. Then type in Gmail, Slack web, LinkedIn, etc. Pause ~0.3s for underlines and a card. **Tab** inserts the first next-word chip. Native Mac apps (Notes, Mail.app) cannot be read without OS Accessibility; use the [live pad](http://localhost:3000/live) beside them.

## Free hosting on Vercel

Deploy the **web editor only** (Privacy mode) for free. Full steps and requirements: [docs/vercel.md](docs/vercel.md).

**Checklist:** GitHub repo · Vercel account · Node 20 · Root Directory = `apps/web` · commit `packages/engine/src/wordlist.generated.ts` · no env vars needed for grammar; optional `PLAGIARISM_API_KEY` (plagiarism) and `LLM_API_KEY` (Groq rewrite) — both **server-side only**.

**Quick steps:** Import the repo on [vercel.com/new](https://vercel.com/new) → set Root Directory to `apps/web` → Deploy. Use **Privacy (in-browser)** on the live site. For plagiarism without Render, set `PLAGIARISM_API_KEY`. For free cloud rewrite, set Groq vars (see below) and redeploy.

**Groq (free cloud LLM on Vercel, no Render):**

```
LLM_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-20b
```

Signup: [console.groq.com](https://console.groq.com). Same-origin routes: `POST /api/rewrite`, `POST /api/check`, `GET /api/healthz`. Details: [docs/vercel.md](docs/vercel.md).

| On Vercel | Not on Vercel |
| --- | --- |
| Editor, spelling, grammar, next-word (in browser); optional Groq rewrite + plagiarism | Go API, local Ollama, extension store, desktop/Notes overlay |

## Deploy Enhanced mode for free

Pair **Vercel** (editor) with a **free/cheap API host** (Render, Fly.io, or Railway) for Enhanced grammar via LanguageTool — no paid LLM APIs.

| Setup | Est. Grammarly parity | Cost |
| --- | --- | --- |
| Vercel Privacy only | ~50–55% | Free |
| Vercel + Render API + LanguageTool | ~63–68% | Free API tier + LT starter (~$7/mo on Render) |
| Local Docker + host Ollama | ~70–78% | Free (your hardware) |

**Step-by-step (Render + Vercel):**

1. Render → **Blueprint** → repo → Blueprint path `deploy/render.yaml` → Apply.
2. Set `WEB_ORIGIN` = your Vercel URL and `API_PUBLIC_URL` = Render API URL on the `check-grammar-api` service.
3. Vercel → project env `NEXT_PUBLIC_API_URL` = Render API URL → redeploy.
4. Open the site → **Enhanced** mode. Verify: `curl https://YOUR-API.onrender.com/healthz`.

LanguageTool needs **≥1 GB RAM** (documented in [deploy/README.md](deploy/README.md)). Ollama on cloud free tier is not practical — use LT + rules on Render (~65%) or local Ollama for full Enhanced.

Full guide: **[deploy/README.md](deploy/README.md)** (Fly.io, Railway, local prod Docker, Ollama tunnel).

Self-host everything except the LLM (Metal cannot run inside Docker on macOS):

```bash
docker compose up --build
```

Then start a local model server on the host (see [ml/README.md](ml/README.md)):

### Ollama (recommended for Enhanced mode + rewrites)

```bash
# Install Ollama from https://ollama.com then:
ollama pull llama3.2
# or: ollama pull mistral

# Bridge (auto-detects Ollama, falls back to rule stub without it):
npm run llm:serve
# or: python ml/serve/server.py --port 8081

# API + web (separate terminals):
npm run dev:api
npm run dev:web
```

Set in `.env`:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
LLM_BASE_URL=http://127.0.0.1:8081/v1
LLM_MODEL=llama3.2
```

Open the editor → **Enhanced** mode. `/healthz` reports `llmAvailable` and `llmBackend: ollama` when ready. Grammar check sends structured JSON corrections; **Rewrite** returns clarity / brevity / formality variants.

**Without Ollama**, the same bridge runs a deterministic rule stub (typo + wordiness fixes) for offline dev.

```bash
python ml/serve/server.py --port 8081
```

## Default data path

| Mode | Where text goes |
| --- | --- |
| Privacy | This device only (TypeScript/WASM engine) |
| Local API | Your Go process on localhost; optional local LLM at `LLM_BASE_URL` |
| Hosted Pro | Your Check Grammar cloud, GPU running **our** GGUF. Opt-in. |
| BYOK cloud | Provider you chose. Off by default. |

Details: [docs/data-path.md](docs/data-path.md) and the in-app `/privacy` page.

## License

Apache License 2.0. See [LICENSE](LICENSE), [COMMUNITY.md](COMMUNITY.md), [ENTERPRISE.md](ENTERPRISE.md), and [CLA.md](CLA.md).
