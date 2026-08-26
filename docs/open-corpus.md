# Open-license corpus research

Offline, citation-first research for content writers. **Not** detector evasion.

## What it is

A curated seed of **public-domain** and **open-licensed** passages (Project Gutenberg–style classics plus Wikipedia-style CC educational briefs) bundled with the app. Lexical BM25-style search ranks passages for a topic — no paid vector database and no runtime download of multi-GB dumps (Vercel-friendly).

Allowed licenses only: `public-domain`, `CC0`, `CC-BY`, `CC-BY-SA`.

## API

`POST /api/research`

```json
{ "topic": "democracy", "limit": 5 }
```

Success:

```json
{
  "provider": "open-corpus",
  "passages": [
    {
      "title": "Democracy (overview)",
      "sourceUrl": "https://en.wikipedia.org/wiki/Democracy",
      "license": "CC-BY-SA",
      "text": "...",
      "score": 2.451
    }
  ]
}
```

Empty or missing `topic` → `400` `{ "error": "topic required" }`.

`limit` defaults to 5 (clamped 1–20).

## Programmatic import

Other packages/agents can import the same contract:

```ts
import {
  searchCorpus,
  researchResponse,
  SEED_CORPUS,
  type ResearchPassage,
  type ResearchResponse,
} from "@check-grammar/corpus";

const passages = searchCorpus("climate change", { limit: 5 });
```

## Expand the seed

See `packages/corpus/scripts/build-seed.mjs` for how to add more Gutenberg public-domain excerpts offline. Keep the bundled seed roughly **30–80** chunks.

```bash
npm run build-seed -w @check-grammar/corpus
npm test -w @check-grammar/corpus
```

## Citation

When writers reuse material, surface **title**, **sourceUrl**, and **license** (and share-alike obligations for CC-BY-SA). Prefer paraphrase + citation over long verbatim quotes unless the license and context clearly allow it.

## Env

No `CORPUS_*` variables required — the seed ships in-repo.
