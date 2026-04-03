from __future__ import annotations

from typing import Any

import requests
from requests import Response
from requests.exceptions import RequestException

from .config import get_api_key
from .exceptions import WatchLLMAuthError, WatchLLMError

BASE_URL = "https://api.watchllm.dev/api/v1"


class WatchLLMClient:
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or get_api_key()
        self._session = requests.Session()
        self._session.headers.update(
            {
                "X-WatchLLM-Api-Key": self._api_key,
                "Content-Type": "application/json",
            }
        )

    def _parse_json(self, response: Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError as exc:
            raise WatchLLMError("Invalid JSON response from WatchLLM API.") from exc

        if not isinstance(payload, dict):
            raise WatchLLMError("Unexpected response format from WatchLLM API.")

        return payload

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = f"{BASE_URL}{path}"

        try:
            response = self._session.request(method, url, **kwargs)
        except RequestException as exc:
            raise WatchLLMError(f"Request to WatchLLM failed: {exc}") from exc

        if response.status_code == 401:
            raise WatchLLMAuthError("Invalid or expired API key.")

        data = self._parse_json(response)

        error_obj = data.get("error")
        if isinstance(error_obj, dict):
            message = error_obj.get("message")
            if isinstance(message, str):
                raise WatchLLMError(message)
            raise WatchLLMError("WatchLLM API returned an error.")

        data_obj = data.get("data")
        if not isinstance(data_obj, dict):
            raise WatchLLMError("WatchLLM API response missing data payload.")

        return data_obj

    def register_agent(self, project_id: str, name: str, framework: str) -> dict[str, Any]:
        return self._request(
            "POST",
            "/agents",
            json={
                "project_id": project_id,
                "name": name,
                "framework": framework,
            },
        )

    def launch_simulation(
        self,
        agent_id: str,
        categories: list[str],
        threshold: str | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/simulations",
            json={
                "agent_id": agent_id,
                "categories": categories,
                "threshold": threshold,
            },
        )

    def get_simulation(self, simulation_id: str) -> dict[str, Any]:
        return self._request("GET", f"/simulations/{simulation_id}")

    def get_replay(self, simulation_id: str) -> dict[str, Any]:
        return self._request("GET", f"/simulations/{simulation_id}/replay")
