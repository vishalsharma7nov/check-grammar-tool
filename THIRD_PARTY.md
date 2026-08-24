# Third-party notices

This repository is original work under Apache-2.0.

It may *depend on* (not vendor) the following at build/runtime:

- Go chi router (MIT)
- Next.js / React (MIT)
- SentencePiece (Apache-2.0)
- MLX (MIT) when installed
- Tauri (Apache-2.0 / MIT)

## Bundled English word list (privacy engine)

Spelling in the in-browser engine and extension uses an on-device list, not a paid dictionary API (not Oxford, not Grammarly).

- [dwyl/english-words](https://github.com/dwyl/english-words) `words_alpha.txt` — Unlicense
- [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english) `20k.txt` — MIT (frequency ranking for replacement order)

The generated file is `packages/engine/src/wordlist.generated.ts`. Rebuild (needs network):

```bash
node packages/engine/scripts/fetch-wordlist.mjs
```

Raw copies under `packages/engine/data/*.txt` are regenerable and gitignored.

No Grammarly source, models, or trademarks are included.
