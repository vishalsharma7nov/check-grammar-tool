# Where does my text go?

Check Grammar is local-first. This page is generated from the same flags the API uses (`LLM_PROVIDER`, request `mode`).

## Privacy mode (default in the web editor)

- Engine: `packages/engine` running in your browser (and optionally a WASM build).
- Network: **none** for checking. No analytics beacons on the check path.
- LLM: not used.

## Local API mode

- Engine: Go rule engine in `server/api` on `localhost` (or your VPS).
- LLM: if rewrite/explain is enabled, the API calls `LLM_BASE_URL` (default `http://127.0.0.1:8081/v1`). That process is **llama.cpp, MLX, or Ollama on the host**. Docker Compose does not run the model on macOS because Docker does not get Metal.
- Logs: prompt bodies are logged only when `LOG_PROMPTS=true` (debug).

## Hosted Pro (opt-in)

- Text is sent to Check Grammar cloud to run **our** GPU-hosted weights.
- Quotas apply to **rewrite**, not to rule underlines.
- Disabled unless you sign in and enable hosted inference.

## BYOK cloud (opt-in)

- You paste an OpenAI/Gemini key. Traffic goes to that vendor, not to us.
- Default: off.

## What we will not do

- Silently send demo traffic to OpenAI/Gemini.
- Train on your documents unless you opt in to a separate dataset with PII stripped.
