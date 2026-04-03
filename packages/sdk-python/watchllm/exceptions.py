class WatchLLMError(Exception):
    pass


class WatchLLMAuthError(WatchLLMError):
    """Raised when API key is missing or invalid."""


class WatchLLMThresholdError(WatchLLMError):
    """Raised when simulation severity exceeds threshold."""

    def __init__(self, category: str, severity: float, threshold: str) -> None:
        self.category = category
        self.severity = severity
        self.threshold = threshold
        super().__init__(
            f"Severity {severity:.2f} in '{category}' failed threshold '{threshold}'"
        )


class WatchLLMTimeoutError(WatchLLMError):
    """Raised when wait=True and simulation doesn't complete within timeout."""
