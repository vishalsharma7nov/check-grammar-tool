#!/usr/bin/env python3
"""Tests for Ollama detection helpers (no running Ollama required)."""
from __future__ import annotations

import unittest
from unittest.mock import patch

from ollama import detect_ollama, pick_model


class PickModelTests(unittest.TestCase):
    def test_prefers_llama32(self) -> None:
        models = ["tiny:latest", "llama3.2:latest", "mistral:latest"]
        self.assertEqual(pick_model(models), "llama3.2:latest")

    def test_respects_env(self) -> None:
        models = ["llama3.2:latest", "mistral:latest"]
        with patch.dict("os.environ", {"OLLAMA_MODEL": "mistral"}):
            self.assertEqual(pick_model(models), "mistral:latest")

    def test_falls_back_to_first(self) -> None:
        models = ["custom-model:latest"]
        self.assertEqual(pick_model(models), "custom-model:latest")


class DetectOllamaTests(unittest.TestCase):
    def test_unreachable_returns_none(self) -> None:
        with patch("ollama.urllib.request.urlopen", side_effect=OSError("connection refused")):
            self.assertIsNone(detect_ollama(timeout=0.1))

    def test_empty_models_returns_none(self) -> None:
        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b'{"models": []}'

        with patch("ollama.urllib.request.urlopen", return_value=FakeResp()):
            self.assertIsNone(detect_ollama(timeout=0.1))

    def test_detects_models(self) -> None:
        class FakeResp:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b'{"models": [{"name": "llama3.2:latest"}]}'

        with patch("ollama.urllib.request.urlopen", return_value=FakeResp()):
            status = detect_ollama(timeout=0.1)
        self.assertIsNotNone(status)
        assert status is not None
        self.assertTrue(status["available"])
        self.assertEqual(status["model"], "llama3.2:latest")


if __name__ == "__main__":
    unittest.main()
