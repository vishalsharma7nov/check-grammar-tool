# VS Code / Cursor

Press F5 from this folder (or copy into `~/.vscode/extensions`).

## How it checks

1. **Primary:** POST `http://127.0.0.1:8080/v1/check` (Go API + TypeScript engine shim).
2. **Fallback:** If the API is down and `checkGrammar.useBundledEngine` is true (default), the extension runs `server/shim/check-cli.mjs` via Node — same privacy engine, no network.

Diagnostics are **Warning** severity. Lightbulb **Quick Fix** actions appear when replacements exist (`Accept: …`).

## Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `checkGrammar.apiUrl` | `http://127.0.0.1:8080` | Local API |
| `checkGrammar.dialect` | `en-IN` | Dialect lock |
| `checkGrammar.useBundledEngine` | `true` | Node shim fallback when API unreachable |
| `checkGrammar.personalDictionary` | `[]` | Custom words to allow |
