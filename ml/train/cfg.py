from __future__ import annotations

import json
from pathlib import Path


def load_config(path: str) -> dict:
    text = Path(path).read_text(encoding="utf-8")
    if path.endswith(".json"):
        return json.loads(text)
    try:
        import yaml  # type: ignore

        return yaml.safe_load(text)
    except ImportError:
        return _mini_yaml(text)


def _mini_yaml(text: str) -> dict:
    """Enough for our nested two-level configs if PyYAML is missing."""
    root: dict = {}
    section: dict | None = None
    section_name = ""
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if not line.startswith(" ") and line.endswith(":"):
            section_name = line[:-1].strip()
            section = {}
            root[section_name] = section
            continue
        if ":" not in line:
            continue
        k, v = line.strip().split(":", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if v.replace(".", "", 1).isdigit():
            val: object = float(v) if "." in v else int(v)
        else:
            val = v
        if section is not None and line.startswith(" "):
            section[k] = val
        else:
            section = None
            root[k] = val
    return root
