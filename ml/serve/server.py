#!/usr/bin/env python3
"""OpenAI-compatible /v1/chat/completions on the HOST (Metal). Not for Docker on macOS.

When Ollama is running (http://127.0.0.1:11434 or OLLAMA_BASE_URL), proxies to it.
Otherwise falls back to a deterministic rule stub for local dev without a model.
"""
from __future__ import annotations

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from ollama import chat_completion, detect_ollama

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

GRAMMAR_SYSTEM = """You are an expert English grammar, spelling, and clarity checker.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"corrected":"<full corrected text>","changes":[{"from":"<exact substring in original>","to":"<replacement>","category":"spelling|grammar|clarity|punctuation","message":"<brief reason>"}]}

Rules:
- Preserve meaning and voice unless fixing errors.
- "from" must match the original text exactly (case-sensitive).
- If no changes are needed, return {"corrected":"<original>","changes":[]}.
- Follow the requested dialect (en-US, en-GB, en-IN, etc.)."""

REWRITE_SYSTEM = """You are Check Grammar's local writing assistant.

Return ONLY the rewritten text — no quotes, labels, markdown, or explanation.
Preserve factual meaning. Apply the user's rewrite goal precisely."""


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


def is_grammar_task(instruction: str) -> bool:
    lower = instruction.lower()
    return any(
        k in lower
        for k in ("grammar", "spelling", "clarity", "dialect", "residual", "fix grammar")
    )


class Handler(BaseHTTPRequestHandler):
    ollama: dict | None = None

    def log_message(self, fmt: str, *args) -> None:
        if self.headers.get("X-Log-Prompts") == "1":
            super().log_message(fmt, *args)

    def do_GET(self) -> None:
        if self.path in ("/healthz", "/v1/models"):
            models = [{"id": "check-gec-v0"}]
            backend = "stub"
            if Handler.ollama:
                backend = "ollama"
                models = [{"id": Handler.ollama["model"]}]
            self._json(
                200,
                {
                    "object": "list",
                    "data": models,
                    "backend": backend,
                    "ollama": Handler.ollama,
                },
            )
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
        system = ""
        for m in msgs:
            role = m.get("role")
            if role == "system":
                system = m.get("content") or ""
            elif role == "user":
                instruction, user_text = extract_payload(m.get("content") or "")

        model = body.get("model") or "check-gec-v0"
        temperature = float(body.get("temperature", 0.2))

        if Handler.ollama:
            text, used_model = self._ollama_reply(system, instruction, user_text, temperature)
            self._json(
                200,
                {
                    "id": "ollama",
                    "object": "chat.completion",
                    "model": used_model,
                    "choices": [{"index": 0, "message": {"role": "assistant", "content": text}}],
                },
            )
            return

        text = reply_text(instruction, user_text)
        self._json(
            200,
            {
                "id": "local-stub",
                "object": "chat.completion",
                "model": model,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": text}}],
            },
        )

    def _ollama_reply(
        self, system: str, instruction: str, user_text: str, temperature: float
    ) -> tuple[str, str]:
        assert Handler.ollama is not None
        ollama_model = Handler.ollama["model"]
        if is_grammar_task(instruction) or "corrected text" in system.lower():
            sys_prompt = GRAMMAR_SYSTEM
            if instruction:
                sys_prompt += "\n\n" + instruction
            user_prompt = user_text
        else:
            sys_prompt = REWRITE_SYSTEM
            user_prompt = (instruction + "\n\n---\n" + user_text) if instruction else user_text

        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return chat_completion(messages, model=ollama_model, temperature=temperature)

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

    Handler.ollama = detect_ollama()
    if Handler.ollama:
        print(
            f"Ollama detected at {Handler.ollama['base']} — model {Handler.ollama['model']}\n"
            f"OpenAI-compatible API: http://127.0.0.1:{args.port}/v1"
        )
    else:
        print(
            f"Ollama not found — using rule stub at http://127.0.0.1:{args.port}/v1\n"
            f"Start Ollama and run: ollama pull llama3.2"
        )

    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
