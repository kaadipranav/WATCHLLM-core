from __future__ import annotations

import asyncio
import functools
import re
import sys
import time
from operator import eq, ge, gt, le, lt, ne
from typing import Any, Awaitable, Callable, ParamSpec, TypeVar

from .client import WatchLLMClient
from .exceptions import WatchLLMThresholdError, WatchLLMTimeoutError
from .models import AttackCategory

P = ParamSpec("P")
R = TypeVar("R")
AR = TypeVar("AR")

DEFAULT_PROJECT_ID = "default"
TERMINAL_STATES = {"completed", "failed"}

_THRESHOLD_RE = re.compile(r"^\s*severity\s*(<=|>=|<|>|==|!=)\s*([0-9]*\.?[0-9]+)\s*$")
_COMPARATORS: dict[str, Callable[[float, float], bool]] = {
    "<": lt,
    "<=": le,
    ">": gt,
    ">=": ge,
    "==": eq,
    "!=": ne,
}


def detect_framework() -> str:
    module_names = list(sys.modules.keys())
    if any("langchain" in name for name in module_names):
        return "langchain"
    if any("crewai" in name for name in module_names):
        return "crewai"
    if any("autogen" in name for name in module_names):
        return "autogen"
    return "custom"


def _parse_threshold(threshold: str) -> tuple[Callable[[float, float], bool], float]:
    match = _THRESHOLD_RE.match(threshold)
    if match is None:
        raise ValueError(f"Invalid threshold expression: {threshold}")

    operator_symbol = match.group(1)
    threshold_value = float(match.group(2))
    comparator = _COMPARATORS[operator_symbol]
    return comparator, threshold_value


def _coerce_runs(raw_runs: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_runs, list):
        return []
    return [run for run in raw_runs if isinstance(run, dict)]


def _evaluate_threshold(threshold: str, runs: list[dict[str, Any]]) -> None:
    """
    Parse and evaluate threshold expression against run results.
    Supported: severity < 0.3, severity > 0.5, severity <= 0.3
    Raises WatchLLMThresholdError if any category fails.
    """
    comparator, limit = _parse_threshold(threshold)

    for run in runs:
        status = run.get("status")
        if status != "completed":
            continue

        severity_raw = run.get("severity")
        if not isinstance(severity_raw, (int, float)):
            continue

        severity = float(severity_raw)
        passed = comparator(severity, limit)
        if passed:
            continue

        category_raw = run.get("category")
        category = category_raw if isinstance(category_raw, str) else "unknown"
        raise WatchLLMThresholdError(
            category=category,
            severity=severity,
            threshold=threshold,
        )


def _poll_simulation(
    client: WatchLLMClient,
    simulation_id: str,
    threshold: str | None,
    timeout: int,
) -> dict[str, Any]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        current = client.get_simulation(simulation_id)
        status_raw = current.get("status")
        status = status_raw if isinstance(status_raw, str) else ""

        if status in TERMINAL_STATES:
            if threshold:
                _evaluate_threshold(threshold, _coerce_runs(current.get("runs", [])))
            return current

        time.sleep(5)

    raise WatchLLMTimeoutError(
        f"Simulation {simulation_id} did not complete within {timeout}s"
    )


async def _poll_simulation_async(
    client: WatchLLMClient,
    simulation_id: str,
    threshold: str | None,
    timeout: int,
) -> dict[str, Any]:
    deadline = time.time() + timeout
    while time.time() < deadline:
        current = client.get_simulation(simulation_id)
        status_raw = current.get("status")
        status = status_raw if isinstance(status_raw, str) else ""

        if status in TERMINAL_STATES:
            if threshold:
                _evaluate_threshold(threshold, _coerce_runs(current.get("runs", [])))
            return current

        await asyncio.sleep(5)

    raise WatchLLMTimeoutError(
        f"Simulation {simulation_id} did not complete within {timeout}s"
    )


def test(
    categories: list[AttackCategory],
    threshold: str | None = None,
    project_id: str | None = None,
    wait: bool = False,
    timeout: int = 300,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        agent_id_cache: dict[str, str] = {}

        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            client = WatchLLMClient()

            # Register agent on first call (cache the ID)
            cache_key = f"{fn.__module__}.{fn.__qualname__}"
            if cache_key not in agent_id_cache:
                agent = client.register_agent(
                    project_id=project_id or DEFAULT_PROJECT_ID,
                    name=cache_key,
                    framework=detect_framework(),
                )
                agent_id_raw = agent.get("id")
                if not isinstance(agent_id_raw, str) or not agent_id_raw:
                    raise ValueError("Agent registration response missing id.")
                agent_id_cache[cache_key] = agent_id_raw

            agent_id = agent_id_cache[cache_key]

            # Launch simulation
            simulation = client.launch_simulation(
                agent_id=agent_id,
                categories=list(categories),
                threshold=threshold,
            )
            simulation_id_raw = simulation.get("id")
            if not isinstance(simulation_id_raw, str) or not simulation_id_raw:
                raise ValueError("Simulation response missing id.")

            # If wait=True, poll until terminal state
            if wait:
                _poll_simulation(client, simulation_id_raw, threshold, timeout)

            # Call original function normally
            return fn(*args, **kwargs)

        return wrapper

    return decorator


# Async variant
def test_async(
    categories: list[AttackCategory],
    threshold: str | None = None,
    project_id: str | None = None,
    wait: bool = False,
    timeout: int = 300,
) -> Callable[[Callable[P, Awaitable[AR]]], Callable[P, Awaitable[AR]]]:
    def decorator(fn: Callable[P, Awaitable[AR]]) -> Callable[P, Awaitable[AR]]:
        if not asyncio.iscoroutinefunction(fn):
            raise TypeError("test_async can only decorate async functions.")

        agent_id_cache: dict[str, str] = {}

        @functools.wraps(fn)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> AR:
            client = WatchLLMClient()

            cache_key = f"{fn.__module__}.{fn.__qualname__}"
            if cache_key not in agent_id_cache:
                agent = client.register_agent(
                    project_id=project_id or DEFAULT_PROJECT_ID,
                    name=cache_key,
                    framework=detect_framework(),
                )
                agent_id_raw = agent.get("id")
                if not isinstance(agent_id_raw, str) or not agent_id_raw:
                    raise ValueError("Agent registration response missing id.")
                agent_id_cache[cache_key] = agent_id_raw

            agent_id = agent_id_cache[cache_key]

            simulation = client.launch_simulation(
                agent_id=agent_id,
                categories=list(categories),
                threshold=threshold,
            )
            simulation_id_raw = simulation.get("id")
            if not isinstance(simulation_id_raw, str) or not simulation_id_raw:
                raise ValueError("Simulation response missing id.")

            if wait:
                await _poll_simulation_async(client, simulation_id_raw, threshold, timeout)

            return await fn(*args, **kwargs)

        return wrapper

    return decorator
