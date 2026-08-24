# Competing with Grammarly (honest guide)

Check Grammar is an **original, Apache-2.0** writing assistant. It is **not affiliated with Grammarly**. This guide explains how to get the most parity using **only free and open-source** components — no paid cloud APIs required.

## Quick parity estimate

| Area | Approx. parity vs Grammarly Free | Notes |
| --- | --- | --- |
| Spelling | **~85%** | ~370k-word on-device list + context rules |
| Basic grammar | **~70%** | Subject–verb, articles, fragments, Indian English |
| Homophones / clarity | **~60%** | Rule-based; not ML-scale |
| Tone badge | **~50%** | Heuristic formal / casual / confident |
| Next-word hints | **~40%** | Local n-gram-style chips, not LLM |
| Inclusive language | **~55%** | Curated style rules (chairman → chair, blocklist, etc.) |
| Rewrite / clarity AI | **~35%** free / **~75%** with Ollama | Rules locally; LLM optional |
| Plagiarism | **0%** | Not in scope |
| Mobile keyboard | **0%** | Web + extension only |
| **Privacy** | **100% win** | Default Privacy mode = in-browser only |
| **Cost** | **100% win** | Free forever, self-hostable |

**Overall:** ~**55–65%** of day-to-day Grammarly Free value in Privacy mode; ~**75–80%** when you self-host LanguageTool + Ollama (still no text sent to Grammarly or us).

## Free stack setup (recommended)

### Tier 1 — Zero install (Privacy mode)

1. `npm install && npm run build -w @check-grammar/web && npm run start -w @check-grammar/web`
2. Open [http://localhost:3000](http://localhost:3000)
3. Stay on **Privacy (in-browser)** — text never leaves the tab
4. Deploy to Vercel (see [docs/vercel.md](vercel.md)) for a free public editor

**You get:** spelling, grammar rules, homophones, inclusive language, tone badge, 3 next-word chips, style guide YAML, export corrected text.

### Tier 2 — Local API (LanguageTool, still free)

```bash
docker compose up -d languagetool   # if bundled in repo
export LANGUAGETOOL_URL=http://localhost:8010
npm run dev:api                     # or npm run dev:shim
```

Set mode to **Local API** or **Enhanced** in the web editor. Checks hit your machine only.

### Tier 3 — Local LLM (Ollama, free)

```bash
ollama pull llama3.2:3b             # or another small model
ollama serve
# Point API at Ollama — see README and ml/serve/
npm run dev:api
```

Enhanced mode merges rule engine + LanguageTool + optional Ollama grammar/rewrite.

### Browser extension

```bash
npm run build:extension
# Chrome → chrome://extensions → Load unpacked → apps/extension
```

Configure **API URL** and **Enhanced mode** in extension Options. Default overlay uses the bundled on-device engine (no network).

## Where we win

- **Privacy:** Default in-browser engine; no account; no upload
- **Free:** Apache-2.0, no subscription for core checks
- **Self-host:** Full API, LanguageTool, Ollama on your hardware
- **Auditable:** Open rules and word lists ([THIRD_PARTY.md](../THIRD_PARTY.md))
- **Indian English:** Dialect pack (prepone, revert, etc.) as features, not bugs

## Honest limitations

| Grammarly feature | Check Grammar today |
| --- | --- |
| Proprietary ML on billions of edits | Rule engine + optional LT + small local LLM |
| Works everywhere (mobile, desktop, all sites) | Web, extension on most sites; no Google Docs; no native Mac text fields |
| Brand recognition & polish | Smaller team, fewer surfaces |
| Plagiarism / citation | Not planned for core OSS |
| Enterprise SSO / teams | Stub / roadmap ([COMMUNITY.md](../COMMUNITY.md)) |
| Real-time generative rewrite quality | Rules + Ollama; quality depends on model you run |

## Feature checklist (Privacy mode)

Verify in the web editor after **Try example**:

- [ ] Red wavy underlines — spelling (`recieve`, `teh`)
- [ ] Amber underlines — grammar (`a apple`, `He go`)
- [ ] Blue/style — inclusive (`chairman`, `blacklist`, `manpower`)
- [ ] Tone badge — Formal / Casual / Confident
- [ ] Three next-word chips + Tab
- [ ] Click underline → suggestion popup
- [ ] Copy corrected / Download

## Extension install

1. `npm run build:extension` from repo root
2. Load `apps/extension` unpacked in Chrome/Edge
3. Open **Options** → set API URL if using Enhanced
4. Type in Gmail, Slack web, LinkedIn, etc.

## When Grammarly is still the better fit

- You need plagiarism or citation tools
- You want a polished mobile keyboard everywhere
- You prefer zero setup and accept cloud processing
- You need Google Docs deep integration today

## When Check Grammar is the better fit

- Privacy policy, HIPAA-adjacent, or “no third-party NLP” requirements
- Free deployment for a team or classroom
- Custom style rules as code (YAML)
- Self-hosted air-gapped environment
- Indian English / Hinglish workflows

---

*Last updated with the free product enhancement pass. Re-run `npm run eval` after rule changes.*
