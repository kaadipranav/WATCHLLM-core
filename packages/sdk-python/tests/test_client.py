from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast
from unittest.mock import Mock, patch

import pytest

from watchllm.client import WatchLLMClient
from watchllm.exceptions import WatchLLMAuthError, WatchLLMError


@dataclass
class FakeResponse:
    status_code: int
    payload: Any

    def json(self) -> Any:
        return self.payload


def test_request_raises_auth_error_on_401() -> None:
    client = WatchLLMClient(api_key="wllm_test")

    with patch.object(
        client._session,
        "request",
        return_value=FakeResponse(
            status_code=401,
            payload={"data": None, "error": {"message": "Unauthorized", "code": 401}},
        ),
    ):
        with pytest.raises(WatchLLMAuthError):
            client.get_simulation("sim_123")


def test_request_raises_watchllm_error_on_api_error_payload() -> None:
    client = WatchLLMClient(api_key="wllm_test")

    with patch.object(
        client._session,
        "request",
        return_value=FakeResponse(
            status_code=400,
            payload={"data": None, "error": {"message": "Bad request", "code": 400}},
        ),
    ):
        with pytest.raises(WatchLLMError, match="Bad request"):
            client.get_simulation("sim_123")


def test_register_agent_sends_expected_payload() -> None:
    client = WatchLLMClient(api_key="wllm_test")

    with patch.object(
        client._session,
        "request",
        return_value=FakeResponse(
            status_code=200,
            payload={"data": {"id": "agt_123"}, "error": None},
        ),
    ) as request_mock:
        result = client.register_agent(
            project_id="prj_123",
            name="module.function",
            framework="custom",
        )

    assert result["id"] == "agt_123"

    call_args = request_mock.call_args
    assert call_args is not None

    args, kwargs = call_args
    assert args[0] == "POST"
    assert isinstance(args[1], str)
    assert args[1].endswith("/api/v1/agents")

    payload = kwargs.get("json")
    assert isinstance(payload, dict)
    payload_dict = cast(dict[str, Any], payload)
    assert payload_dict["project_id"] == "prj_123"
    assert payload_dict["name"] == "module.function"
    assert payload_dict["framework"] == "custom"
