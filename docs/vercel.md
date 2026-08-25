# Deploy the web editor to Vercel (free)

The public demo is the **Next.js editor in Privacy mode**. Spelling and grammar run **in the visitor’s browser** via `@check-grammar/engine`. You do **not** need the Go API, Docker, or a GPU on Vercel.

**Bring-your-own keys:** full env var table, signup links (Groq, Winston, Ollama), and how to reuse the same names on any host → [README.md → Configuration](../README.md#configuration-bring-your-own-keys). Templates: [`.env.example`](../.env.example), [`deploy/.env.production.example`](../deploy/.env.production.example).

This project is **not** affiliated with Grammarly.

## Requirements checklist

| Requirement | Notes |
| --- | --- |
| GitHub (or GitLab/Bitbucket) account | Push this repo first |
| [Vercel](https://vercel.com) account | Free Hobby plan is enough |
| Node **20+** | Repo has `.nvmrc` → `20`; Vercel will pick it up |
| npm workspaces | Install/build from the monorepo root (see below) |
| Bundled word list committed | `packages/engine/src/wordlist.generated.ts` must be in git (~4MB). Do **not** rely on regenerating it on Vercel |
| No paid API keys | Privacy mode needs none. Leave `NEXT_PUBLIC_API_URL` unset |

Optional later (not required for the free demo):

- A separate always-on host for Go `/v1/check` or a local LLM
- Chrome Web Store listing for the extension
- Signed desktop app for Notes/Mail

## What works on Vercel

| Feature | On Vercel free? |
| --- | --- |
| Web editor (`/`, `/live`, `/privacy`, `/pricing`) | Yes |
| Privacy mode (in-browser spelling ~370k words, grammar, next-word) | Yes |
| Suggestion popup / underlines as you type | Yes |
| Plagiarism check (`POST /api/plagiarism`) | Yes — set `PLAGIARISM_API_KEY` (see below) |
| Cloud rewrite via Groq (`POST /api/rewrite`) | Yes — set `LLM_API_KEY` (see [Groq LLM](#groq-llm-on-vercel-free-cloud-rewrite)) |
| AI Write / draft from context (`POST /api/generate`) | Yes — same `LLM_API_KEY` (original drafts; not plagiarism) |
| Enhanced-lite check (`POST /api/check`) | Yes — engine in Node + optional Groq augment |
| Local API mode pointing at `localhost:8080` | No (browser cannot reach your laptop) |
| Go API / TypeScript shim | Not required for plagiarism/rewrite; optional for full LT Enhanced |
| Local LLM (MLX / llama.cpp) | No |
| Browser extension | No — load unpacked or publish to Chrome Web Store |
| VS Code / Tauri desktop | No — installable apps |

## Groq LLM on Vercel (free cloud rewrite)

The editor prefers same-origin `POST /api/rewrite` and `POST /api/check`. Those routes read **server-only** `LLM_*` env vars and call [Groq](https://console.groq.com)’s OpenAI-compatible API. You do **not** need Render or a Go API.

**AI Write** (`POST /api/generate`) uses the same `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` to draft **original** text from a topic or brief (100–2000 words). It is a writing assistant — **not** a plagiarism checker. Without a key, `/api/generate` returns **503** with a message to set the env on Vercel.

### Exact env vars (Vercel dashboard)

1. Open [vercel.com](https://vercel.com) → your project for this repo.
2. Go to **Settings** → **Environment Variables**.
3. Add (for **Production**, and Preview if you want):

```
LLM_API_KEY=gsk_...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-20b
```

(`llama-3.1-8b-instant` was retired by Groq on 2026-08-16; if you still have it in Vercel env, update `LLM_MODEL` and redeploy.)

4. Free signup: [console.groq.com](https://console.groq.com) → create an API key.
5. **Do not** prefix with `NEXT_PUBLIC_` — the key must never ship to the browser.
6. **Redeploy** after adding or changing vars.

Without a key, `/api/rewrite` returns rule-based variants with `skippedReason`, `/api/generate` returns 503, and `/api/healthz` reports `llmAvailable: false`.

### How to test Rewrite with Groq

1. Deploy (or `npm run dev -w @check-grammar/web` with the same env in `.env.local`).
2. Open the editor → confirm an **LLM · Groq** badge (from `GET /api/healthz`).
3. Paste a sentence, select it (or place the caret in it) → **Rewrite**.
4. You should get clarity / brevity / formality variants from Groq (`provider: "hosted"`).

### How to test AI Write (draft from context)

1. Same env as Rewrite (`LLM_API_KEY` required).
2. Editor toolbar → **AI Write** (next to Rewrite).
3. Enter a brief (topic, audience, key points) → choose **100** / **500** / **Custom** (≥100) → **Generate draft**.
4. **Insert into editor** or **Replace editor**, then grammar recheck runs as usual.

Privacy note: spelling/grammar can stay in-browser; rewrite, AI Write, and Enhanced-lite send text to Groq **only** when you use those actions or Enhanced mode with `includeLLM`.

## Plagiarism on Vercel (no Render)

The editor prefers same-origin `POST /api/plagiarism`. That route reads **server-only** env vars and calls Winston AI (or Prepostseo/generic). You do **not** need a hosted Go API on Render.

### Exact steps (Vercel dashboard)

1. Open [vercel.com](https://vercel.com) → your project for this repo.
2. Go to **Settings** → **Environment Variables**.
3. Add (for **Production**, and Preview if you want):
   - `PLAGIARISM_API_KEY` = your Winston AI token (from [gowinston.ai](https://gowinston.ai) → API tokens).
   - Optional: `PLAGIARISM_PROVIDER` = `winston` (default when only the key is set), `prepostseo`, or `generic`.
   - Optional: `PLAGIARISM_API_URL` = override endpoint (required for `generic`).
4. **Do not** prefix with `NEXT_PUBLIC_` — the key must never ship to the browser.
5. **Redeploy** (Deployments → … → Redeploy, or push a new commit). Env vars apply only after a new deployment.
6. On the live site, open the editor (Privacy mode is fine) → paste ≥100 characters → **Check plagiarism**.

Without a key, the route returns `200` with `skippedReason: "no provider configured"` and the UI explains how to add one.

**Privacy note:** Spelling/grammar stay in the browser. Plagiarism sends text to the provider **only** when the user clicks **Check plagiarism** (opt-in, not automatic).

## Step-by-step (dashboard)

1. Push this repository to GitHub.
2. Open [vercel.com/new](https://vercel.com/new) → **Import** the repo.
3. **Configure Project**
   - **Framework Preset:** Next.js  
   - **Root Directory:** `apps/web` (click Edit → select `apps/web`)  
   - **Install Command:** `cd ../.. && npm install` (already in `apps/web/vercel.json`)  
   - **Build Command:** `cd ../.. && npm run build -w @check-grammar/web`  
   - **Output:** leave default (Next.js)  
   - **Environment Variables:** none required for Privacy grammar. Optional:
     - `PLAGIARISM_API_KEY` — plagiarism (see [Plagiarism on Vercel](#plagiarism-on-vercel-no-render))
     - `LLM_API_KEY` (+ optional `LLM_BASE_URL`, `LLM_MODEL`) — Groq rewrite / Enhanced-lite (see [Groq LLM](#groq-llm-on-vercel-free-cloud-rewrite))
4. Click **Deploy**.
5. Open the `*.vercel.app` URL. Use **Privacy (in-browser)** — that is the default. With `LLM_API_KEY`, Rewrite and Enhanced-lite use Groq via `/api/*`.

CLI alternative (after `npm i -g vercel`):

```bash
# from repo root
npx vercel --cwd apps/web
```

Confirm Root Directory is `apps/web` when the CLI prompts.

## Verify after deploy

1. Open the site → editor should load empty (or use **Load example**).
2. Type `This helllo is wrong.` → `helllo` should underline; Accept → `hello`.
3. Confirm the banner still says spelling/grammar stay in the browser.
4. With `PLAGIARISM_API_KEY` set: paste ≥100 characters → **Check plagiarism** → score/sources (or a clear skip/error). Without a key: UI explains how to configure Winston.
5. With `LLM_API_KEY` set: select a sentence → **Rewrite** → clarity/brevity/formality from Groq; status bar shows **LLM · Groq**.

## Common failures

| Symptom | Fix |
| --- | --- |
| Build cannot resolve `@check-grammar/engine` | Root Directory must be `apps/web` and install must run at repo root (`cd ../.. && npm install`) |
| Missing wordlist / empty spelling | Commit `packages/engine/src/wordlist.generated.ts`; rebuild with `npm run wordlist -w @check-grammar/engine` if needed |
| “Local API” mode errors on the live site | Expected — that mode needs a public API URL. Stay on Privacy, or set `NEXT_PUBLIC_API_URL` to a hosted shim/API you control |
| Plagiarism says “no provider configured” | Add `PLAGIARISM_API_KEY` (not `NEXT_PUBLIC_`) → Redeploy |
| Rewrite stays on rules / no Groq badge | Add `LLM_API_KEY` (and optional `LLM_BASE_URL` / `LLM_MODEL`) → Redeploy; probe `/api/healthz` |
| Plagiarism times out on Hobby | Winston can be slow; Hobby function limit is short — retry or upgrade; `maxDuration` is set to 60s for Pro |
| Function size / memory warnings | The dictionary blob is large but client-bundled; if build OOM’s on Hobby, contact Vercel or shrink the list |

## Limits of the free Hobby plan

- Fine for a **demo** and light personal use.
- Cold starts and bandwidth quotas apply (see Vercel pricing).
- Not a substitute for Chrome extension / desktop overlay / Docs plugins.
- Not for serving your own GPU model weights.

For “where text goes” on a hosted Privacy demo, see [data-path.md](data-path.md) and the in-app `/privacy` page.
