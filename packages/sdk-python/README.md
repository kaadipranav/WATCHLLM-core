# watchllm

Agent reliability testing for AI engineers.

## Install

```bash
pip install -e packages/sdk-python
```

## Quick Start

```python
import watchllm

@watchllm.test(categories=["prompt_injection"], wait=True, threshold="severity < 0.3")
def my_agent(prompt: str) -> str:
    return f"Echo: {prompt}"

my_agent("hello")
```

## CLI

```bash
watchllm auth login
watchllm simulate --agent mymodule.my_agent --categories prompt_injection,hallucination --threshold "severity < 0.3"
watchllm status --simulation sim_xxx
watchllm replay --simulation sim_xxx
watchllm doctor
```

## Environment

- `WATCHLLM_API_KEY`: API key override.
- Config fallback: `~/.watchllm/config`.
