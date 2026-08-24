"""Ollama auto-detection and OpenAI-compatible chat proxy."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

DEFAULT_OLLAMA = "http://127.0.0.1:11434"
PREFERRED_MODELS = (
    "llama3.2",
    "llama3.2:latest",
    "mistral",
    "mistral:latest",
    "llama3",
    "llama3:latest",
    "gemma2",
    "gemma2:latest",
    "phi3",
    "phi3:latest",
)


def ollama_base() -> str:
    return os.environ.get("OLLAMA_BASE_URL", DEFAULT_OLLAMA).rstrip("/")


def pick_model(models: list[str]) -> str:
    env = (os.environ.get("OLLAMA_MODEL") or os.environ.get("LLM_MODEL") or "").strip()
    if env:
        for name in models:
            if name == env or name.startswith(env + ":"):
                return name
        base = env.split(":")[0]
        for name in models:
            if name == base or name.startswith(base + ":"):
                return name
    for pref in PREFERRED_MODELS:
        stem = pref.split(":")[0]
        for name in models:
            if name == pref or name.startswith(stem + ":"):
                return name
    return models[0] if models else "llama3.2"


def detect_ollama(timeout: float = 2.0) -> dict[str, Any] | None:
    """Return Ollama status or None when unreachable / no models."""
    url = f"{ollama_base()}/api/tags"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]
    if not models:
        return None
    return {
        "available": True,
        "base": ollama_base(),
        "models": models,
        "model": pick_model(models),
    }


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float = 0.2,
    timeout: float = 120.0,
) -> tuple[str, str]:
    """Proxy to Ollama OpenAI-compatible endpoint. Returns (content, model)."""
    base = ollama_base()
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/v1/chat/completions",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        parsed = json.loads(resp.read().decode("utf-8"))
    content = ""
    if parsed.get("choices"):
        content = (parsed["choices"][0].get("message") or {}).get("content") or ""
    out_model = parsed.get("model") or model
    return content.strip(), out_model
