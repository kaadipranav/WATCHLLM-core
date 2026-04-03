from __future__ import annotations

import inspect
from typing import cast
from unittest.mock import MagicMock, patch

import pytest

from watchllm.decorator import test as watchllm_test
from watchllm.exceptions import WatchLLMThresholdError, WatchLLMTimeoutError


def test_decorator_preserves_signature() -> None:
    def agent(prompt: str, retries: int = 2) -> str:
        return prompt * retries

    wrapped = watchllm_test(categories=["prompt_injection"])(agent)

    assert inspect.signature(wrapped) == inspect.signature(agent)


def test_threshold_error_raised_when_severity_fails() -> None:
    with patch("watchllm.decorator.WatchLLMClient") as mock_client_cls:
        mock_client = cast(MagicMock, mock_client_cls.return_value)
        mock_client.register_agent.return_value = {"id": "agt_test"}
        mock_client.launch_simulation.return_value = {"id": "sim_test"}
        mock_client.get_simulation.return_value = {
            "status": "completed",
            "runs": [
                {
                    "category": "prompt_injection",
                    "status": "completed",
                    "severity": 0.8,
                }
            ],
        }

        @watchllm_test(
            categories=["prompt_injection"],
            threshold="severity < 0.3",
            wait=True,
            timeout=5,
        )
        def agent() -> str:
            return "ok"

        with pytest.raises(WatchLLMThresholdError):
            agent()


def test_timeout_error_raised_when_wait_exceeds_timeout() -> None:
    with patch("watchllm.decorator.WatchLLMClient") as mock_client_cls:
        mock_client = cast(MagicMock, mock_client_cls.return_value)
        mock_client.register_agent.return_value = {"id": "agt_test"}
        mock_client.launch_simulation.return_value = {"id": "sim_test"}

        @watchllm_test(
            categories=["prompt_injection"],
            wait=True,
            timeout=0,
        )
        def agent() -> str:
            return "ok"

        with pytest.raises(WatchLLMTimeoutError):
            agent()


def test_agent_registration_happens_once_per_wrapped_function() -> None:
    with patch("watchllm.decorator.WatchLLMClient") as mock_client_cls:
        mock_client = cast(MagicMock, mock_client_cls.return_value)
        mock_client.register_agent.return_value = {"id": "agt_test"}
        mock_client.launch_simulation.return_value = {"id": "sim_test"}

        @watchllm_test(categories=["prompt_injection"])
        def agent() -> str:
            return "ok"

        assert agent() == "ok"
        assert agent() == "ok"

        assert mock_client.register_agent.call_count == 1
        assert mock_client.launch_simulation.call_count == 2
