# Browser extension (MV3)

Load unpacked from this folder in Chrome/Edge (`chrome://extensions` → Developer mode).

The content script paints a **shadow-root overlay**. It does not wrap the page's own nodes (that corrupts React/ProseMirror).

**Spelling:** bundled `@check-grammar/engine` in `engine.js` (~370k-word free list, no API key). Rebuild with `npm run build:extension` from the repo root. If the bundle fails to load, the extension falls back to `POST /v1/check` on localhost (use `npm run dev:shim` for the same dictionary over HTTP).

**Unsupported:** Google Docs (canvas + gated annotation APIs). See `docs/known-gaps.md`.
