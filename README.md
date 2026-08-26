# Check Grammar

**Privacy-first, open-source writing assistant** — spelling, grammar, rewrite, Writer Studio, AI Write, and optional plagiarism checks. Bring your own API keys (BYOK). Core checking runs in your browser by default; cloud LLM and plagiarism only when you opt in.

This project is **not** affiliated with Grammarly.

[License](#license) · [Configuration (BYOK)](#configuration-bring-your-own-keys) · [Hosting](#hosting)

---

## Features

| Feature | What it does | Needs a key? |
| --- | --- | --- |
| **Privacy engine** | Spelling (~370k words), grammar, punctuation, next-word — in the browser | No |
| **Writer Studio** | Research open-license sources → draft → naturalize → insert/export Markdown | Optional Groq (`LLM_API_KEY`); research/naturalize APIs when deployed |
| **Rewrite** | Clarity / brevity / formality variants | Optional Groq (`LLM_API_KEY`) or local Ollama |
| **AI Write** | Quick original draft from a brief (100–2000 words) | Groq / OpenAI-compatible `LLM_API_KEY` |
| **Plagiarism check** | Compare text to published sources so you can **cite** them (detection only) | Optional Winston AI (`PLAGIARISM_API_KEY`) |
| **Enhanced grammar** | Merges rule engine with optional [LanguageTool](https://languagetool.org) | Optional self-hosted LT (`LANGUAGETOOL_URL`) |
| **Local LLM** | Offline Enhanced + rewrite via [Ollama](https://ollama.com) | No cloud key — run Ollama on your machine |
| **Browser extension / VS Code** | Same check contract as the web editor | No (Privacy) or your API URL |

Surfaces in this monorepo: web editor (`apps/web`), extension (`apps/extension`), VS Code (`apps/vscode`), desktop (`apps/desktop`), Go API (`server/api`), in-browser engine (`packages/engine`).

---

## Quick start (local)

**Requirements:** Node 20+. Go 1.22+ is optional (preferred API); without Go, a TypeScript shim serves the same `/v1/check` contract.

```bash
git clone https://github.com/vishalsharma7nov/check-grammar-tool.git
cd check-grammar-tool
cp .env.example .env
# Edit .env — add Groq / Winston keys only if you want those features
npm install
npm run dev:web
```

In another terminal, pick one API:

```bash
npm run dev:api    # Go — preferred
# or
npm run dev:shim   # TypeScript engine, same JSON
```

Open [http://localhost:3000](http://localhost:3000). Default mode is **Privacy**: text stays in the tab. Spelling uses bundled open word lists (see [THIRD_PARTY.md](THIRD_PARTY.md)) — no dictionary API key.

---

## Configuration (bring your own keys)

All secrets live in **`.env`** (local) or your host’s environment dashboard (Vercel, Render, Docker). Never commit real keys. Never prefix secrets with `NEXT_PUBLIC_` — that would ship them to the browser.

Template: [`.env.example`](.env.example)  
Production / API host template: [`deploy/.env.production.example`](deploy/.env.production.example)

### Environment variables

| Variable | Required? | Where used | Description |
| --- | --- | --- | --- |
| `LLM_API_KEY` | Optional* | Vercel `/api/*`, Go API | Groq (or OpenAI-compatible) key for **Rewrite**, **AI Write**, Enhanced-lite |
| `LLM_BASE_URL` | Optional | Same | Default on Vercel: `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Optional | Same | Default: `openai/gpt-oss-20b` |
| `LLM_PROVIDER` | Optional | Go API | `local` (default) or `cloud` for BYOK cloud fallback |
| `OLLAMA_BASE_URL` | Optional | `ml/serve`, `/healthz` | Local Ollama, e.g. `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Optional | Same | e.g. `llama3.2` |
| `PLAGIARISM_API_KEY` | Optional | Vercel `/api/plagiarism`, Go `/v1/plagiarism` | Winston (or other) token; without it, check returns a friendly skip |
| `PLAGIARISM_PROVIDER` | Optional | Same | `winston` (default when key set), `prepostseo`, or `generic` |
| `PLAGIARISM_API_URL` | Optional | Same | Required for `generic`; optional endpoint override |
| `LANGUAGETOOL_URL` | Optional | Go API | Self-hosted LT, e.g. `http://localhost:8010` |
| `NEXT_PUBLIC_API_URL` | Optional | Web editor | Public URL of Go/shim API for **Enhanced** / Local API mode |
| `NEXT_PUBLIC_DEFAULT_MODE` | Optional | Web editor | `privacy` (default) or `enhanced` |
| `API_ADDR` | Local/API | Go API | Listen address, default `:8080` |
| `API_PUBLIC_URL` | Hosted API | Go API | Public URL of the API (CORS / links) |
| `WEB_ORIGIN` | Hosted API | Go API | Exact editor origin for CORS (no trailing slash) |
| `JWT_SECRET` | Hosted accounts | Go API | Long random string; change in production |
| `DATABASE_URL` | Optional | Go API | Postgres — accounts / saved docs (not needed for core check) |
| `REDIS_URL` | Optional | Go API | Rate limits for hosted rewrite |
| `CLOUD_LLM_*` | Optional | Go API | Opt-in cloud fallback when `LLM_PROVIDER=cloud` |
| `STRIPE_*` / `BILLING_ENABLED` | Optional | Hosted billing | Off by default for self-host |
| `HOSTED_REWRITE_MONTHLY_QUOTA` | Optional | Hosted SaaS | Free-tier rewrite quota |
| `LOG_LEVEL` | Optional | Go API | e.g. `info` |

\*Privacy-mode grammar needs **no** keys. Groq is required only for cloud **AI Write** (and recommended for strong **Rewrite**).

### Get free / local credentials

| Service | Signup | Used for |
| --- | --- | --- |
| [Groq](https://console.groq.com) | Free API key at console | Rewrite, AI Write, Enhanced-lite on Vercel |
| [Winston AI](https://gowinston.ai) | Free credits at signup (no card) | Plagiarism / originality check |
| [Ollama](https://ollama.com) | Install locally, `ollama pull llama3.2` | Offline LLM — no cloud key |
| LanguageTool | `docker compose up -d languagetool` | Optional Enhanced grammar |

**Example Groq block** (Vercel or `.env`):

```bash
LLM_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-20b
```

**Example Winston** (same hosts):

```bash
PLAGIARISM_API_KEY=your-token
# PLAGIARISM_PROVIDER=winston   # default when only the key is set
```

**Example local Ollama** (`.env`):

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
LLM_BASE_URL=http://127.0.0.1:8081/v1
LLM_MODEL=llama3.2
# then: npm run llm:serve && npm run dev:api && npm run dev:web
```

Copy the same names into your hosting dashboard — the app reads process env, not a special file format on Vercel/Render.

---

## Writer Studio

Content-writer workspace in the web editor toolbar (**Writer Studio**): research public-domain / open-license sources → generate a natural draft for you to edit → naturalize voice → insert into the editor or **Export Markdown** (with citations appendix).

- Not for plagiarism evasion or AI-detector bypass. AI-assisted — edit in your voice.
- Client calls: `POST /api/research`, `POST /api/generate` (`useResearch`, audience, tone), `POST /api/naturalize`.
- If a route returns 404, the UI shows a friendly redeploy message until those APIs are live.
- **AI Write** remains available for a quick one-shot draft.
- Fine-tune a local model for your natural writing style: **[docs/local-model-training.md](docs/local-model-training.md)**.

---

## Hosting

### Vercel (web editor — recommended free demo)

Deploy **`apps/web`** only. Privacy spelling/grammar run in the visitor’s browser.

1. Import the repo on [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `apps/web`.
3. Deploy. No env vars required for basic grammar.

**Optional env vars in Vercel → Settings → Environment Variables** (then **Redeploy**):

| Variable | Purpose |
| --- | --- |
| `LLM_API_KEY` | Groq rewrite + AI Write + `/api/check` LLM augment |
| `LLM_BASE_URL` | Default Groq OpenAI-compatible URL |
| `LLM_MODEL` | e.g. `openai/gpt-oss-20b` |
| `PLAGIARISM_API_KEY` | Winston plagiarism via `POST /api/plagiarism` |
| `PLAGIARISM_PROVIDER` / `PLAGIARISM_API_URL` | Optional provider overrides |
| `NEXT_PUBLIC_API_URL` | Only if you also host the Go API (Enhanced mode) |

Same-origin routes: `POST /api/rewrite`, `POST /api/generate`, `POST /api/research`, `POST /api/naturalize`, `POST /api/check`, `POST /api/plagiarism`, `GET /api/healthz`.

Step-by-step screenshots and troubleshooting: **[docs/vercel.md](docs/vercel.md)** (points back here for the full env table).

### Docker / docker-compose

Full stack except host LLM (run Ollama on the machine, not inside the Mac Docker VM):

```bash
cp .env.example .env
# or for prod-like: cp deploy/.env.production.example .env.prod
docker compose up --build
```

Editor: [http://localhost:3000](http://localhost:3000) · API: `:8080` · LanguageTool: `:8010`.

Pass secrets via compose `environment:` or `--env-file` — same variable names as `.env.example`. Production-oriented override: [`deploy/docker-compose.prod.yml`](deploy/docker-compose.prod.yml). Details: **[deploy/README.md](deploy/README.md)**.

### Render Blueprint (optional API + LanguageTool)

For **Enhanced** mode with a public API (pair with Vercel):

1. Render → **Blueprint** → path `deploy/render.yaml`.
2. On `check-grammar-api`, set `WEB_ORIGIN` (your Vercel URL), `API_PUBLIC_URL`, and optionally `PLAGIARISM_API_KEY` / LLM tunnel vars.
3. On Vercel, set `NEXT_PUBLIC_API_URL` to the Render API URL → redeploy.

LanguageTool needs **≥1 GB RAM**. Full guide: **[deploy/README.md](deploy/README.md)**.

---

## Development (monorepo)

```
apps/web          Next.js editor + Vercel API routes
apps/extension    Chrome MV3 overlay
apps/vscode       VS Code / Cursor extension
apps/desktop      Tauri shell
packages/engine   Privacy rule engine + word list
packages/protocol Shared types
server/api        Go check / plagiarism / rewrite API
server/shim       TypeScript /v1/check without Go
ml/               Optional MLX train + Ollama bridge (ml/serve)
deploy/           Render / Fly / Railway / Docker prod helpers
```

Useful scripts (from repo root):

| Script | Purpose |
| --- | --- |
| `npm run dev:web` | Next.js editor |
| `npm run dev:api` | Go API |
| `npm run dev:shim` | TS check server |
| `npm run llm:serve` | Ollama / rule-stub bridge on `:8081` |
| `npm run build:extension` | Build unpacked extension |
| `npm run test:engine` | Engine unit tests |

Where text goes in each mode: [docs/data-path.md](docs/data-path.md) and the in-app `/privacy` page.

Train a local LLM for natural content drafts (not detector evasion): [docs/local-model-training.md](docs/local-model-training.md).

---

## Contributing

Issues and pull requests are welcome. Keep Privacy mode free of required cloud keys. See [COMMUNITY.md](COMMUNITY.md) for what stays open forever, and [CLA.md](CLA.md) if contributing larger changes.

---

## License

[Apache License 2.0](LICENSE). You may use, modify, and self-host this software.

This project is an independent open-source writing tool and is **not** affiliated with, endorsed by, or connected to Grammarly Inc.
