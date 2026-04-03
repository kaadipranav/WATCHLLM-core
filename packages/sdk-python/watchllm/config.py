import json
import os
from pathlib import Path

from .exceptions import WatchLLMAuthError

CONFIG_PATH = Path.home() / ".watchllm" / "config"


def get_api_key() -> str:
    # 1. Environment variable
    key = os.environ.get("WATCHLLM_API_KEY")
    if key:
        return key

    # 2. Config file
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text())
            if isinstance(data, dict):
                config_key = data.get("api_key")
                if isinstance(config_key, str) and config_key:
                    return config_key
        except (json.JSONDecodeError, KeyError):
            pass

    raise WatchLLMAuthError(
        "No API key found. Set WATCHLLM_API_KEY or run `watchllm auth login`."
    )


def save_api_key(api_key: str) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps({"api_key": api_key}))
    CONFIG_PATH.chmod(0o600)  # Owner read/write only
