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

**Optional later:** self-hosted [LanguageTool](https://languagetool.org) or another free-tier API could sit beside this; core spelling does not require one.

### Browser overlay (any website text box)

```bash
npm run build:extension
```

Chrome → `chrome://extensions` → Load unpacked → `apps/extension`. Then type in Gmail, Slack web, LinkedIn, etc. Pause ~0.3s for underlines and a card. **Tab** inserts the first next-word chip. Native Mac apps (Notes, Mail.app) cannot be read without OS Accessibility; use the [live pad](http://localhost:3000/live) beside them.

## Free hosting on Vercel

Deploy the **web editor only** (Privacy mode) for free. Full steps and requirements: [docs/vercel.md](docs/vercel.md).

**Checklist:** GitHub repo · Vercel account · Node 20 · Root Directory = `apps/web` · commit `packages/engine/src/wordlist.generated.ts` · no env vars needed.

**Quick steps:** Import the repo on [vercel.com/new](https://vercel.com/new) → set Root Directory to `apps/web` → Deploy. Use **Privacy (in-browser)** on the live site.

| On Vercel | Not on Vercel |
| --- | --- |
| Editor, spelling, grammar, next-word (in browser) | Go API, local LLM, extension store, desktop/Notes overlay |

Self-host everything except the LLM (Metal cannot run inside Docker on macOS):

```bash
docker compose up --build
```

Then start a local model server on the host (see [ml/README.md](ml/README.md)):

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
