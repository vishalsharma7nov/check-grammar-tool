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
| Local API mode pointing at `localhost:8080` | No (browser cannot reach your laptop) |
| Go API / TypeScript shim | Not on Vercel unless you deploy them elsewhere |
| Local LLM (MLX / llama.cpp) | No |
| Browser extension | No — load unpacked or publish to Chrome Web Store |
| VS Code / Tauri desktop | No — installable apps |

## Step-by-step (dashboard)

1. Push this repository to GitHub.
2. Open [vercel.com/new](https://vercel.com/new) → **Import** the repo.
3. **Configure Project**
   - **Framework Preset:** Next.js  
   - **Root Directory:** `apps/web` (click Edit → select `apps/web`)  
   - **Install Command:** `cd ../.. && npm install` (already in `apps/web/vercel.json`)  
   - **Build Command:** `cd ../.. && npm run build -w @check-grammar/web`  
   - **Output:** leave default (Next.js)  
   - **Environment Variables:** none required for Privacy mode
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
3. Confirm the banner still says text stays in the browser.

## Common failures

| Symptom | Fix |
| --- | --- |
| Build cannot resolve `@check-grammar/engine` | Root Directory must be `apps/web` and install must run at repo root (`cd ../.. && npm install`) |
| Missing wordlist / empty spelling | Commit `packages/engine/src/wordlist.generated.ts`; rebuild with `npm run wordlist -w @check-grammar/engine` if needed |
| “Local API” mode errors on the live site | Expected — that mode needs a public API URL. Stay on Privacy, or set `NEXT_PUBLIC_API_URL` to a hosted shim/API you control |
| Function size / memory warnings | The dictionary blob is large but client-bundled; if build OOM’s on Hobby, contact Vercel or shrink the list |

## Limits of the free Hobby plan

- Fine for a **demo** and light personal use.
- Cold starts and bandwidth quotas apply (see Vercel pricing).
- Not a substitute for Chrome extension / desktop overlay / Docs plugins.
- Not for serving your own GPU model weights.

For “where text goes” on a hosted Privacy demo, see [data-path.md](data-path.md) and the in-app `/privacy` page.
