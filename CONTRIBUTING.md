# Contributing to Check Grammar

Thank you. This repo is Apache-2.0. By opening a pull request you agree to the [Contributor License Agreement](CLA.md).

## Development

- Go 1.22+ for `server/api`
- Node 20+ for clients (`npm install` at the repo root)
- Python 3.10+ and MLX for `ml/` (Apple Silicon)

```bash
make test
```

Golden sentences live in `eval/golden.jsonl`. A change that makes the rule engine score worse than HEAD on that file will be asked to justify itself.

## Project layout

See the root README. Keep protocol changes in `server/api/api/openapi.yaml` and `packages/protocol` in sync.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
