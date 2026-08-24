# Desktop (Tauri)

Wraps the web editor. Core rules work offline once the UI is loaded; rewrite needs a host LLM sidecar (`llama-server` / MLX), not Docker, on Apple Silicon.

```bash
cd apps/desktop/src-tauri
cargo tauri dev
```

Requires the [Tauri CLI](https://tauri.app) and the web app dependencies.
