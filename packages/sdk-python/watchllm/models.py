from dataclasses import dataclass
from typing import Literal

SimStatus = Literal["queued", "running", "completed", "failed"]
RunStatus = Literal["pending", "running", "completed", "failed"]
AttackCategory = Literal[
    "prompt_injection",
    "tool_abuse",
    "hallucination",
    "context_poisoning",
    "infinite_loop",
    "jailbreak",
    "data_exfiltration",
    "role_confusion",
]


@dataclass
class SimRun:
    id: str
    simulation_id: str
    category: str
    status: RunStatus
    severity: float | None
    trace_r2_key: str | None
    created_at: int


@dataclass
class Simulation:
    id: str
    agent_id: str
    user_id: str
    status: SimStatus
    config_json: str
    created_at: int
    started_at: int | None
    completed_at: int | None
    runs: list[SimRun]
