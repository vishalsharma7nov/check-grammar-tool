# MLX from-scratch GEC (MacBook Pro M2, 16GB)

This is **not** a 7B ChatGPT clone. We train two small models we own:

| Stage | What | Params (16GB cap) | Time on M2 |
| --- | --- | --- | --- |
| 0 | SentencePiece tokenizer | — | minutes |
| 1 | Tiny decoder proof | ~10M | hours |
| 2a | Detector (encoder, token tags) | ~40M | days |
| 2b | Fixer (T5-small class) | ~60–80M | days–weeks |
| 5 | 1B+ cluster | configs only | **not on this Mac** |

**Do not train and serve at the same time.** Close Chrome/Docker. `batch_size=1`, `seq_len=256`, grad accum 16–32.

Metal does not pass into Docker. Train and `serve/` run **natively**.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
```

MLX installs only on Apple Silicon. On other OSes the scripts still generate synthetic data and can no-op train with a warning.

## Commands

```bash
python ml/data/prepare.py
python ml/tokenizers/train_spm.py --vocab-size 32000 --input ml/data/processed/corpus.txt
python ml/train/train_tiny_lm.py --config ml/configs/m2-10m.yaml
python ml/train/train_detector.py --config ml/configs/m2-detector-40m.yaml
python ml/train/train_fixer.py --config ml/configs/m2-fixer-80m.yaml
python ml/eval/errant_stub.py --gold eval/golden.jsonl --pred /tmp/pred.jsonl
python ml/export/to_gguf_stub.py --src ml/checkpoints/fixer --out ml/export/check-gec-v0.gguf
python ml/serve/server.py --port 8081
```

Cluster scale (do not run on M2): `ml/configs/cluster-1b.yaml`.

Licenses for public GEC corpora: `ml/data/LICENSES.md`. Never train on user docs unless they opt in.
