# Privacy engine

TypeScript implementation of `/v1/check` that runs **in the browser** (web editor privacy mode).

A WASM build can wrap the same logic later (`wasm-pack` / AssemblyScript). Isolation today: no network in privacy mode; the worker/page never posts text to the API.

Spelling is checked against a bundled free English word list (dwyl/english-words, Unlicense) plus Indian English extras, dialect variants, and the user's personal dictionary. Rebuild the list with `node packages/engine/scripts/fetch-wordlist.mjs` (see [THIRD_PARTY.md](../../THIRD_PARTY.md)).

Golden tests: `src/engine.test.ts` and `eval/golden.jsonl`.
