#!/usr/bin/env python3
"""Train a SentencePiece model we own. Do not borrow a Llama tokenizer."""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    import sentencepiece as spm
except ImportError:
    spm = None


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", default="ml/data/processed/corpus.txt")
    p.add_argument("--vocab-size", type=int, default=8000)
    p.add_argument("--out-prefix", default="ml/tokenizers/check_spm")
    args = p.parse_args()
    Path(args.out_prefix).parent.mkdir(parents=True, exist_ok=True)
    if spm is None:
        Path(args.out_prefix + ".UNTRAINED").write_text(
            "pip install sentencepiece, then re-run. Placeholder so the repo is complete.\n",
            encoding="utf-8",
        )
        print("sentencepiece not installed; wrote placeholder")
        return
    spm.SentencePieceTrainer.train(
        input=args.input,
        model_prefix=args.out_prefix,
        vocab_size=args.vocab_size,
        character_coverage=1.0,
        model_type="unigram",
    )
    print("wrote", args.out_prefix + ".model")


if __name__ == "__main__":
    main()
