"""
Model Registry — per-project in-memory config store.

After resolution, a ResolvedConfig is cached here for the lifetime
of the application (or until the project config file changes).
"""

from typing import Callable

from .types import ResolvedConfig, ModelType, ModelConfigEntry


class ModelRegistry:
    """
    In-memory store for the resolved model configuration.

    Supports hot-reload via a callback registered with on_reload().
    """

    def __init__(self, config: ResolvedConfig | None = None):
        self._config = config or ResolvedConfig()
        self._reload_callbacks: list[Callable[[ResolvedConfig], None]] = []

    def get(self, model_type: ModelType) -> ModelConfigEntry | None:
        """Get the resolved config entry for a model type."""
        return getattr(self._config, model_type.value, None)

    @property
    def config(self) -> ResolvedConfig:
        """Expose the full resolved config."""
        return self._config

    def update(self, config: ResolvedConfig) -> None:
        """Replace the current config and notify all reload callbacks."""
        self._config = config
        for cb in self._reload_callbacks:
            cb(config)

    def on_reload(self, callback: Callable[[ResolvedConfig], None]) -> None:
        """Register a callback to be called whenever the config is reloaded."""
        self._reload_callbacks.append(callback)