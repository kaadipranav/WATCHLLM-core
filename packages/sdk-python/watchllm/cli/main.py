from __future__ import annotations

import importlib
import sys
import time
from collections import defaultdict
from typing import Any, Callable, cast, get_args

import click
import requests
from rich.console import Console
from rich.status import Status
from rich.table import Table
from rich.tree import Tree

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
console = Console()

_STATUS_STYLES = {
    "PASSED": "bold green",
    "FAILED": "bold red",
    "RUNNING": "cyan",
    "PENDING": "dim",
}


def _normalize_status_label(raw_status: Any) -> str:
    if not isinstance(raw_status, str):
        return "PENDING"

    normalized = raw_status.strip().lower()
    if normalized in {"passed", "pass", "completed", "success", "succeeded"}:
        return "PASSED"
    if normalized in {"failed", "failure", "error", "compromised"}:
        return "FAILED"
    if normalized in {"running", "processing", "in_progress", "in-progress"}:
        return "RUNNING"
    if normalized in {"pending", "queued", "waiting", "created"}:
        return "PENDING"
    return "PENDING"


def _status_style(status_label: str) -> str:
    return _STATUS_STYLES.get(status_label, "dim")


def _severity_text(raw_severity: Any) -> str:
    if isinstance(raw_severity, (int, float)):
        severity_value = float(raw_severity)
        severity_style = "bold red" if severity_value >= 0.7 else "dim"
        return f"[{severity_style}]{severity_value:.2f}[/]"
    return "[dim]-[/]"


def _build_runs_table(runs: list[dict[str, Any]]) -> tuple[Table, bool, bool]:
    table = Table(header_style="bold", show_header=True)
    table.add_column("Category", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Severity", justify="right")

    has_failed = False
    has_incomplete = False

    if not runs:
        table.add_row("-", "[dim]PENDING[/]", "[dim]-[/]", style="dim")
        return table, has_failed, True

    for run in runs:
        category = run.get("category")
        category_text = category if isinstance(category, str) else "unknown"

        status_label = _normalize_status_label(run.get("status"))
        status_style = _status_style(status_label)

        if status_label == "FAILED":
            has_failed = True
        if status_label in {"RUNNING", "PENDING"}:
            has_incomplete = True

        row_style = ""
        if status_label == "FAILED":
            row_style = "red"
        elif status_label == "PASSED":
            row_style = "green"
        elif status_label == "PENDING":
            row_style = "dim"

        table.add_row(
            category_text,
            f"[{status_style}]{status_label}[/]",
            _severity_text(run.get("severity")),
            style=row_style,
        )

    return table, has_failed, has_incomplete


def _print_error(message: str, hint: str | None = "watchllm doctor") -> None:
    console.print(f"[bold red]✖ Error:[/] {message}")
    if hint:
        console.print(f"[yellow]→ Try:[/] {hint}")


def _print_metadata(entries: list[tuple[str, Any]]) -> None:
    parts: list[str] = []
    for key, value in entries:
        if value is None:
            continue
        parts.append(f"{key}: {value}")

    if parts:
        console.print(f"[dim]{' | '.join(parts)}[/]")


def _print_check(label: str, passed: bool) -> None:
    if passed:
        console.print(f"[bold green]✔[/] {label} [bold green]PASSED[/]")
    else:
        console.print(f"[bold red]✖[/] {label} [bold red]FAILED[/]")


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


def _print_replay_tree(payload: dict[str, Any], simulation_id: str) -> tuple[bool, int]:
    nodes = _extract_nodes(payload)
    if not nodes:
        console.print("[bold yellow]⚠ Replay graph is empty[/]")
        return False, 0

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
    failed_nodes = 0
    tree = Tree(f"[cyan]Simulation[/] [dim]{simulation_id}[/]")

    def visit(node_id: str, branch: Tree) -> None:
        nonlocal failed_nodes
        if node_id in visited:
            return
        visited.add(node_id)

        node = nodes_by_id[node_id]
        node_type_raw = node.get("type")
        node_type = node_type_raw if isinstance(node_type_raw, str) else "unknown"

        latency_raw = node.get("latency_ms")
        if isinstance(latency_raw, (int, float)):
            latency_text = f"{float(latency_raw):.0f}"
        else:
            latency_text = "n/a"

        node_label = f"{node_type} [dim]({latency_text} ms)[/]"
        if _node_failed(node):
            failed_nodes += 1
            node_label = f"[red]{node_type}[/] [dim]({latency_text} ms)[/] [red][FAILED][/red]"

        child_branch = branch.add(node_label)

        for child in children.get(node_id, []):
            visit(child, child_branch)

    for root in roots:
        visit(root, tree)

    console.print(tree)
    return failed_nodes > 0, len(nodes_by_id)


@click.group()
def cli() -> None:
    """WatchLLM - Agent reliability testing."""


@cli.group()
def auth() -> None:
    """Authentication commands."""


@auth.command("login")
def login() -> None:
    """Authenticate with WatchLLM via API key."""
    console.print("[cyan]▶ Authentication[/]")
    console.print("[dim]→ Get your API key at: https://watchllm.dev/settings/keys[/]")
    api_key = click.prompt("Paste your API key", hide_input=True)

    if not api_key.startswith("wllm_"):
        console.print("[bold red]✖ Invalid API key format[/]")
        sys.exit(1)

    save_api_key(api_key)
    console.print("[bold green]✔ API key saved[/]")
    console.print("[dim]path: ~/.watchllm/config[/]")


@cli.command()
@click.option("--agent", required=True, help="Python path to agent function (module.function)")
@click.option("--categories", required=True, help="Comma-separated attack categories")
@click.option("--threshold", default=None, help='e.g. "severity < 0.3"')
@click.option("--timeout", default=300, help="Seconds to wait for completion")
def simulate(agent: str, categories: str, threshold: str | None, timeout: int) -> None:
    """Launch a simulation and wait for results."""
    simulation_id_raw: str | None = None

    try:
        category_list = _parse_categories(categories)
        _load_agent_function(agent)

        console.print(f"[cyan]▶ Launching simulation[/] [dim]agent={agent}[/]")

        client = WatchLLMClient()
        with console.status("[cyan]⏳ Registering agent and creating simulation[/]", spinner="dots") as progress:
            progress = cast(Status, progress)
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

            progress.update(
                f"[cyan]⏳ Monitoring simulation[/] [dim]simulation_id={simulation_id_raw}[/]"
            )

            deadline = time.time() + timeout
            terminal_payload: dict[str, Any] | None = None

            while time.time() < deadline:
                current = client.get_simulation(simulation_id_raw)
                normalized = _normalize_status_label(current.get("status"))
                progress.update(
                    "[cyan]⏳ Monitoring simulation[/] "
                    f"[dim]simulation_id={simulation_id_raw} status={normalized}[/]"
                )

                status_raw = current.get("status")
                status_text = status_raw if isinstance(status_raw, str) else ""
                if status_text in TERMINAL_STATES:
                    terminal_payload = current
                    break

                time.sleep(5)

            if terminal_payload is None:
                raise WatchLLMTimeoutError(
                    f"Simulation {simulation_id_raw} did not complete within {timeout}s"
                )

        runs = _coerce_runs(terminal_payload.get("runs", []))
        runs_table, has_failed, _ = _build_runs_table(runs)
        console.print(runs_table)

        if threshold:
            _evaluate_threshold(threshold, runs)

        if has_failed:
            console.print("[bold red]✖ Vulnerabilities detected[/]")
        else:
            console.print("[bold green]✔ All checks passed[/]")

        console.print(f"[dim]simulation_id: {simulation_id_raw}[/]")
        sys.exit(0)

    except WatchLLMThresholdError as exc:
        _print_error("Threshold breached", hint="watchllm doctor")
        console.print(f"[dim]{exc}[/]")
        console.print("[bold red]✖ Vulnerabilities detected[/]")
        if simulation_id_raw:
            console.print(f"[dim]simulation_id: {simulation_id_raw}[/]")
        sys.exit(1)
    except WatchLLMTimeoutError as exc:
        _print_error("Simulation timed out", hint="watchllm doctor")
        console.print(f"[dim]{exc}[/]")
        if simulation_id_raw:
            console.print(f"[dim]simulation_id: {simulation_id_raw}[/]")
        sys.exit(3)
    except (WatchLLMError, WatchLLMAuthError, ImportError, AttributeError, ValueError) as exc:
        _print_error(str(exc), hint="watchllm doctor")
        if simulation_id_raw:
            console.print(f"[dim]simulation_id: {simulation_id_raw}[/]")
        sys.exit(2)


@cli.command()
@click.option("--simulation", required=True, help="Simulation ID (sim_xxx)")
def status(simulation: str) -> None:
    """Check simulation status and severity scores."""
    console.print(f"[cyan]▶ Simulation status[/] [dim]{simulation}[/]")

    try:
        with console.status("[cyan]⏳ Fetching status[/]", spinner="dots"):
            client = WatchLLMClient()
            simulation_data = client.get_simulation(simulation)
    except (WatchLLMError, WatchLLMAuthError) as exc:
        _print_error(str(exc), hint="watchllm doctor")
        sys.exit(2)

    runs = _coerce_runs(simulation_data.get("runs", []))
    runs_table, has_failed, has_incomplete = _build_runs_table(runs)
    console.print(runs_table)

    overall_status = _normalize_status_label(simulation_data.get("status"))
    if has_failed or overall_status == "FAILED":
        console.print("[bold red]✖ Vulnerabilities detected[/]")
    elif has_incomplete or overall_status in {"RUNNING", "PENDING"}:
        console.print("[cyan]⏳ RUNNING[/]")
    else:
        console.print("[bold green]✔ All checks passed[/]")

    _print_metadata([
        ("simulation_id", simulation),
        ("status", overall_status),
    ])


@cli.command()
@click.option("--simulation", required=True, help="Simulation ID")
def replay(simulation: str) -> None:
    """Print execution graph tree to terminal."""
    console.print(f"[cyan]▶ Replay graph[/] [dim]{simulation}[/]")

    try:
        with console.status("[cyan]⏳ Fetching replay graph[/]", spinner="dots"):
            client = WatchLLMClient()
            replay_payload = client.get_replay(simulation)
    except (WatchLLMError, WatchLLMAuthError) as exc:
        _print_error(str(exc), hint="watchllm doctor")
        sys.exit(2)

    has_failed_nodes, total_nodes = _print_replay_tree(replay_payload, simulation)

    if has_failed_nodes:
        console.print("[bold red]✖ Vulnerabilities detected[/]")
    else:
        console.print("[bold green]✔ All checks passed[/]")

    _print_metadata([
        ("simulation_id", simulation),
        ("nodes", total_nodes),
    ])


@cli.command()
def doctor() -> None:
    """Diagnose your WatchLLM setup."""
    console.print("[cyan]▶ Running diagnostics[/]")

    checks: list[tuple[str, bool]] = []
    api_key_value: str | None = None

    with console.status("[cyan]⏳ Executing checks[/]", spinner="dots"):
        try:
            api_key_value = get_api_key()
            checks.append(("API key found", True))
        except WatchLLMAuthError:
            checks.append(("API key found", False))

        try:
            response = requests.get("https://api.watchllm.dev/health", timeout=5)
            checks.append(("API reachable", response.status_code == 200))
        except Exception:
            checks.append(("API reachable", False))

    config_valid = bool(api_key_value and api_key_value.startswith("wllm_"))
    checks.append(("Config valid", config_valid))

    for label, passed in checks:
        _print_check(label, passed)

    all_pass = all(passed for _, passed in checks)
    if all_pass:
        console.print("[bold green]✔ All systems operational[/]")
    else:
        console.print("[bold red]✖ Issues detected[/]")
        console.print("[yellow]→ Run:[/] watchllm auth login")

    passed_count = sum(1 for _, passed in checks if passed)
    _print_metadata([
        ("checks", len(checks)),
        ("passed", passed_count),
        ("failed", len(checks) - passed_count),
    ])

    sys.exit(0 if all_pass else 1)
