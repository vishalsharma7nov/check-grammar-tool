# Deploy the web editor to Vercel (free)

The public demo is the **Next.js editor in Privacy mode**. Spelling and grammar run **in the visitor’s browser** via `@check-grammar/engine`. You do **not** need the Go API, Docker, or a GPU on Vercel.

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
| Local API mode pointing at `localhost:8080` | No (browser cannot reach your laptop) |
| Go API / TypeScript shim | Not required for plagiarism; optional for Enhanced `/v1/check` |
| Local LLM (MLX / llama.cpp) | No |
| Browser extension | No — load unpacked or publish to Chrome Web Store |
| VS Code / Tauri desktop | No — installable apps |

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
   - **Environment Variables:** none required for Privacy grammar. For plagiarism, add `PLAGIARISM_API_KEY` (server-only — see [Plagiarism on Vercel](#plagiarism-on-vercel-no-render))
4. Click **Deploy**.
5. Open the `*.vercel.app` URL. Use **Privacy (in-browser)** — that is the default.

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

## Common failures

| Symptom | Fix |
| --- | --- |
| Build cannot resolve `@check-grammar/engine` | Root Directory must be `apps/web` and install must run at repo root (`cd ../.. && npm install`) |
| Missing wordlist / empty spelling | Commit `packages/engine/src/wordlist.generated.ts`; rebuild with `npm run wordlist -w @check-grammar/engine` if needed |
| “Local API” mode errors on the live site | Expected — that mode needs a public API URL. Stay on Privacy, or set `NEXT_PUBLIC_API_URL` to a hosted shim/API you control |
| Plagiarism says “no provider configured” | Add `PLAGIARISM_API_KEY` (not `NEXT_PUBLIC_`) → Redeploy |
| Plagiarism times out on Hobby | Winston can be slow; Hobby function limit is short — retry or upgrade; `maxDuration` is set to 60s for Pro |
| Function size / memory warnings | The dictionary blob is large but client-bundled; if build OOM’s on Hobby, contact Vercel or shrink the list |

## Limits of the free Hobby plan

- Fine for a **demo** and light personal use.
- Cold starts and bandwidth quotas apply (see Vercel pricing).
- Not a substitute for Chrome extension / desktop overlay / Docs plugins.
- Not for serving your own GPU model weights.

For “where text goes” on a hosted Privacy demo, see [data-path.md](data-path.md) and the in-app `/privacy` page.
