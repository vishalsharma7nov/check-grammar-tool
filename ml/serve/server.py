#!/usr/bin/env python3
"""OpenAI-compatible /v1/chat/completions on the HOST (Metal). Not for Docker on macOS."""
from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def reply_text(user: str) -> str:
    # Until GGUF weights exist, echo a deterministic local rewrite so the Go client can be tested.
    return user.replace("teh", "the").replace("recieve", "receive")


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
        user = ""
        for m in msgs:
            if m.get("role") == "user":
                user = m.get("content") or ""
        text = reply_text(user)
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
