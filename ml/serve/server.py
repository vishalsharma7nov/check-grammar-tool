#!/usr/bin/env python3
"""OpenAI-compatible /v1/chat/completions on the HOST (Metal). Not for Docker on macOS."""
from __future__ import annotations

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

COMMON_TYPOS = {
    "teh": "the",
    "adn": "and",
    "recieve": "receive",
    "recieved": "received",
    "seperate": "separate",
    "definately": "definitely",
    "occured": "occurred",
    "untill": "until",
    "wierd": "weird",
    "grammer": "grammar",
    "writting": "writing",
}

WORDY = [
    (re.compile(r"\bin order to\b", re.I), "to"),
    (re.compile(r"\bdue to the fact that\b", re.I), "because"),
    (re.compile(r"\bat this point in time\b", re.I), "now"),
    (re.compile(r"\ba large number of\b", re.I), "many"),
]

FORMAL = [
    (re.compile(r"\bcan't\b", re.I), "cannot"),
    (re.compile(r"\bwon't\b", re.I), "will not"),
    (re.compile(r"\bdon't\b", re.I), "do not"),
    (re.compile(r"\bI'm\b"), "I am"),
    (re.compile(r"\bit's\b"), "it is"),
]


def extract_payload(content: str) -> tuple[str, str]:
    """Split instruction prefix from text after '---' separator."""
    if "\n---\n" in content:
        instruction, text = content.split("\n---\n", 1)
        return instruction.strip(), text.strip()
    return "", content.strip()


def apply_typos(text: str) -> str:
    out = text
    for wrong, right in COMMON_TYPOS.items():
        out = re.sub(rf"\b{re.escape(wrong)}\b", right, out, flags=re.I)
    return out


def apply_wordy(text: str) -> str:
    out = text
    for pat, repl in WORDY:
        out = pat.sub(repl, out)
    return out


def apply_formal(text: str) -> str:
    out = text
    for pat, repl in FORMAL:
        out = pat.sub(repl, out)
    return out


def reply_text(instruction: str, text: str) -> str:
    lower = instruction.lower()
    out = text
    out = apply_typos(out)
    if "brevity" in lower or "concise" in lower:
        out = apply_wordy(out)
        out = re.sub(r"\bvery\b", "", out, flags=re.I)
        out = re.sub(r"  +", " ", out)
    elif "formal" in lower or "professional" in lower:
        out = apply_formal(out)
    elif "clarity" in lower or "plain" in lower or "direct" in lower:
        out = apply_wordy(out)
    elif "residual issues" in lower or "grammar" in lower or "spelling" in lower:
        out = apply_typos(out)
        out = apply_wordy(out)
    return out.strip()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        if self.headers.get("X-Log-Prompts") == "1":
            super().log_message(fmt, *args)

    def do_GET(self) -> None:
        if self.path in ("/healthz", "/v1/models"):
            self._json(200, {"object": "list", "data": [{"id": "check-gec-v0"}]})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        n = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(n)
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._json(400, {"error": "bad json"})
            return
        msgs = body.get("messages") or []
        instruction, user_text = "", ""
        for m in msgs:
            if m.get("role") == "user":
                instruction, user_text = extract_payload(m.get("content") or "")
        text = reply_text(instruction, user_text)
        self._json(
            200,
            {
                "id": "local",
                "object": "chat.completion",
                "model": body.get("model") or "check-gec-v0",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": text}}],
            },
        )

    def _json(self, code: int, obj: dict) -> None:
        b = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8081)
    args = p.parse_args()
    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"local LLM stub http://127.0.0.1:{args.port}/v1  (replace with llama-server --port {args.port} when GGUF is ready)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
