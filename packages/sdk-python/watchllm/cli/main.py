from __future__ import annotations

import importlib
import sys
import time
from collections import defaultdict
from typing import Any, Callable, cast, get_args

import click
import requests

from ..client import WatchLLMClient
from ..config import get_api_key, save_api_key
from ..decorator import TERMINAL_STATES, _evaluate_threshold, detect_framework
from ..exceptions import (
    WatchLLMAuthError,
    WatchLLMError,
    WatchLLMThresholdError,
    WatchLLMTimeoutError,
)
from ..models import AttackCategory

_ALLOWED_CATEGORIES = set(cast(tuple[str, ...], get_args(AttackCategory)))


def _parse_categories(raw_categories: str) -> list[str]:
    categories = [category.strip() for category in raw_categories.split(",") if category.strip()]
    if not categories:
        raise ValueError("At least one category is required.")

    invalid_categories = [category for category in categories if category not in _ALLOWED_CATEGORIES]
    if invalid_categories:
        joined = ", ".join(invalid_categories)
        raise ValueError(f"Invalid category values: {joined}")

    return categories


def _parse_agent_reference(agent_ref: str) -> tuple[str, str]:
    parts = agent_ref.rsplit(".", 1)
    if len(parts) != 2:
        raise ValueError("--agent must be module.function format")
    return parts[0], parts[1]


def _load_agent_function(agent_ref: str) -> Callable[..., Any]:
    module_path, function_name = _parse_agent_reference(agent_ref)
    module = importlib.import_module(module_path)
    function_obj = getattr(module, function_name, None)
    if not callable(function_obj):
        raise ValueError(f"Agent '{agent_ref}' is not callable.")
    return cast(Callable[..., Any], function_obj)


def _coerce_runs(raw_runs: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_runs, list):
        return []
    return [run for run in raw_runs if isinstance(run, dict)]


def _extract_nodes(payload: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = payload.get("nodes")
    if isinstance(nodes, list):
        return [node for node in nodes if isinstance(node, dict)]

    trace_graph = payload.get("trace_graph")
    if isinstance(trace_graph, dict):
        graph_nodes = trace_graph.get("nodes")
        if isinstance(graph_nodes, list):
            return [node for node in graph_nodes if isinstance(node, dict)]

    return []


def _extract_edges(payload: dict[str, Any]) -> list[dict[str, Any]]:
    edges = payload.get("edges")
    if isinstance(edges, list):
        return [edge for edge in edges if isinstance(edge, dict)]

    trace_graph = payload.get("trace_graph")
    if isinstance(trace_graph, dict):
        graph_edges = trace_graph.get("edges")
        if isinstance(graph_edges, list):
            return [edge for edge in graph_edges if isinstance(edge, dict)]

    return []


def _node_failed(node: dict[str, Any]) -> bool:
    severity = node.get("severity")
    if isinstance(severity, (int, float)) and float(severity) >= 0.7:
        return True

    metadata = node.get("metadata")
    if isinstance(metadata, dict):
        meta_severity = metadata.get("severity")
        if isinstance(meta_severity, (int, float)) and float(meta_severity) >= 0.7:
            return True

    return False


def _print_replay_tree(payload: dict[str, Any]) -> None:
    nodes = _extract_nodes(payload)
    if not nodes:
        click.echo("No replay graph nodes found.")
        return

    edges = _extract_edges(payload)

    nodes_by_id: dict[str, dict[str, Any]] = {}
    for node in nodes:
        node_id = node.get("id")
        if isinstance(node_id, str) and node_id:
            nodes_by_id[node_id] = node

    children: dict[str, list[str]] = defaultdict(list)
    child_nodes: set[str] = set()

    has_parent_ids = False
    for node_id, node in nodes_by_id.items():
        parent_id = node.get("parent_id")
        if isinstance(parent_id, str) and parent_id:
            children[parent_id].append(node_id)
            child_nodes.add(node_id)
            has_parent_ids = True

    if not has_parent_ids:
        for edge in edges:
            edge_from = edge.get("from")
            edge_to = edge.get("to")
            if isinstance(edge_from, str) and isinstance(edge_to, str):
                if edge_from in nodes_by_id and edge_to in nodes_by_id:
                    children[edge_from].append(edge_to)
                    child_nodes.add(edge_to)

    roots = [node_id for node_id in nodes_by_id if node_id not in child_nodes]
    if not roots:
        roots = list(nodes_by_id.keys())

    visited: set[str] = set()

    def visit(node_id: str, depth: int) -> None:
        if node_id in visited:
            return
        visited.add(node_id)

        node = nodes_by_id[node_id]
        node_type_raw = node.get("type")
        node_type = node_type_raw if isinstance(node_type_raw, str) else "unknown"

        latency_raw = node.get("latency_ms")
        if isinstance(latency_raw, (int, float)):
            latency_text = f"{float(latency_raw):.0f} ms"
        else:
            latency_text = "n/a"

        failed_marker = " [FAILED]" if _node_failed(node) else ""
        click.echo(f"{'  ' * depth}- {node_type} ({latency_text}){failed_marker}")

        for child in children.get(node_id, []):
            visit(child, depth + 1)

    for root in roots:
        visit(root, 0)


@click.group()
def cli() -> None:
    """WatchLLM - Agent reliability testing."""


@cli.group()
def auth() -> None:
    """Authentication commands."""


@auth.command("login")
def login() -> None:
    """Authenticate with WatchLLM via API key."""
    click.echo("Get your API key at: https://watchllm.dev/settings/keys")
    api_key = click.prompt("Paste your API key", hide_input=True)

    if not api_key.startswith("wllm_"):
        click.echo("Error: Invalid key format.", err=True)
        sys.exit(1)

    save_api_key(api_key)
    click.echo("API key saved to ~/.watchllm/config")


@cli.command()
@click.option("--agent", required=True, help="Python path to agent function (module.function)")
@click.option("--categories", required=True, help="Comma-separated attack categories")
@click.option("--threshold", default=None, help='e.g. "severity < 0.3"')
@click.option("--timeout", default=300, help="Seconds to wait for completion")
def simulate(agent: str, categories: str, threshold: str | None, timeout: int) -> None:
    """Launch a simulation and wait for results."""
    try:
        category_list = _parse_categories(categories)
        _load_agent_function(agent)

        click.echo(f"Launching simulation for {agent}...")

        client = WatchLLMClient()
        agent_payload = client.register_agent(
            project_id="default",
            name=agent,
            framework=detect_framework(),
        )
        agent_id_raw = agent_payload.get("id")
        if not isinstance(agent_id_raw, str) or not agent_id_raw:
            raise WatchLLMError("Agent registration response missing id.")

        simulation = client.launch_simulation(
            agent_id=agent_id_raw,
            categories=category_list,
            threshold=threshold,
        )
        simulation_id_raw = simulation.get("id")
        if not isinstance(simulation_id_raw, str) or not simulation_id_raw:
            raise WatchLLMError("Simulation launch response missing id.")

        click.echo(f"Simulation {simulation_id_raw} launched. Waiting for results...")

        deadline = time.time() + timeout
        while time.time() < deadline:
            current = client.get_simulation(simulation_id_raw)
            status_raw = current.get("status")
            status = status_raw if isinstance(status_raw, str) else "unknown"
            click.echo(f"  status: {status}")

            if status in TERMINAL_STATES:
                runs = _coerce_runs(current.get("runs", []))
                if threshold:
                    _evaluate_threshold(threshold, runs)

                for run in runs:
                    category = run.get("category")
                    run_status = run.get("status")
                    severity = run.get("severity")

                    category_text = category if isinstance(category, str) else "unknown"
                    status_text = run_status if isinstance(run_status, str) else "unknown"
                    if isinstance(severity, (int, float)):
                        severity_text = f"{float(severity):.2f}"
                    else:
                        severity_text = "pending"

                    click.echo(
                        f"  {category_text}: {status_text} (severity: {severity_text})"
                    )

                click.echo("Simulation completed.")
                sys.exit(0)

            time.sleep(5)

        raise WatchLLMTimeoutError(
            f"Simulation {simulation_id_raw} did not complete within {timeout}s"
        )

    except WatchLLMThresholdError as exc:
        click.echo(f"FAILED: {exc}", err=True)
        sys.exit(1)
    except WatchLLMTimeoutError as exc:
        click.echo(f"TIMEOUT: {exc}", err=True)
        sys.exit(3)
    except (WatchLLMError, WatchLLMAuthError, ImportError, AttributeError, ValueError) as exc:
        click.echo(f"ERROR: {exc}", err=True)
        sys.exit(2)


@cli.command()
@click.option("--simulation", required=True, help="Simulation ID (sim_xxx)")
def status(simulation: str) -> None:
    """Check simulation status and severity scores."""
    try:
        client = WatchLLMClient()
        simulation_data = client.get_simulation(simulation)
    except (WatchLLMError, WatchLLMAuthError) as exc:
        click.echo(f"ERROR: {exc}", err=True)
        sys.exit(2)

    status_raw = simulation_data.get("status")
    status_text = status_raw if isinstance(status_raw, str) else "unknown"
    click.echo(f"Status: {status_text}")

    for run in _coerce_runs(simulation_data.get("runs", [])):
        category = run.get("category")
        run_status = run.get("status")
        severity = run.get("severity")

        category_text = category if isinstance(category, str) else "unknown"
        run_status_text = run_status if isinstance(run_status, str) else "unknown"
        if isinstance(severity, (int, float)):
            severity_text = f"{float(severity):.2f}"
        else:
            severity_text = "pending"

        click.echo(f"  {category_text}: {run_status_text} (severity: {severity_text})")


@cli.command()
@click.option("--simulation", required=True, help="Simulation ID")
def replay(simulation: str) -> None:
    """Print execution graph tree to terminal."""
    try:
        client = WatchLLMClient()
        replay_payload = client.get_replay(simulation)
    except (WatchLLMError, WatchLLMAuthError) as exc:
        click.echo(f"ERROR: {exc}", err=True)
        sys.exit(2)

    _print_replay_tree(replay_payload)


@cli.command()
def doctor() -> None:
    """Diagnose your WatchLLM setup."""
    checks: list[tuple[str, bool]] = []

    # Check API key
    try:
        get_api_key()
        checks.append(("API key found", True))
    except WatchLLMAuthError:
        checks.append(("API key found", False))

    # Check API reachability
    try:
        response = requests.get("https://api.watchllm.dev/health", timeout=5)
        checks.append(("API reachable", response.status_code == 200))
    except Exception:
        checks.append(("API reachable", False))

    # Print results
    for label, passed in checks:
        icon = "✓" if passed else "✗"
        click.echo(f"  {icon} {label}")

    all_pass = all(passed for _, passed in checks)
    sys.exit(0 if all_pass else 1)
