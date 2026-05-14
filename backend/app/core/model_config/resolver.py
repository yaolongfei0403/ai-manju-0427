"""
Config Resolver — loads and merges YAML configs from multiple levels.

Hierarchy (override priority, highest wins):
    System config  →  User config (~/.ai_manhua/)  →  Project config  →  Runtime kwargs

Env var substitution: ${VAR} in values are resolved from os.environ.
"""

import os
import re
from pathlib import Path
from typing import Any

import yaml

from .types import ModelType, ResolvedConfig, ModelConfigEntry, ConfigurationError
from .catalog import CapabilityCatalog


# Pattern: ${VAR} or ${VAR:default}
ENV_VAR_PATTERN = re.compile(r"\$\{([^}:]+)(?::([^}]*))?\}")


def _resolve_env_vars(value: str) -> str:
    """Resolve ${VAR} and ${VAR:default} patterns in a string value."""
    if not isinstance(value, str):
        return value

    def replacer(m: re.Match) -> str:
        var_name = m.group(1)
        default = m.group(2)
        return os.environ.get(var_name, default if default is not None else "")

    return ENV_VAR_PATTERN.sub(replacer, value)


def _resolve_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively resolve env vars in a dict (shallow, top-level only)."""
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = _resolve_env_vars(value)
        elif isinstance(value, dict):
            result[key] = _resolve_dict(value)
        elif isinstance(value, list):
            result[key] = [
                _resolve_env_vars(v) if isinstance(v, str) else v
                for v in value
            ]
        else:
            result[key] = value
    return result


def _deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    """Deep merge overlay into base (overlay wins)."""
    result = dict(base)
    for key, value in overlay.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _load_yaml(path: Path | str) -> dict[str, Any] | None:
    """Load a YAML file, return None if not found."""
    path = Path(path)
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


class ModelConfigResolver:
    """
    Resolves model config from multiple YAML sources with override priority.

    Usage:
        resolver = ModelConfigResolver()
        config = resolver.resolve(
            project_path="/path/to/project",
            overrides={"llm": {"provider": "deepseek", "api_key": "sk-..."}}
        )
    """

    def __init__(self, capabilities_path: str | Path | None = None):
        self._capabilities_path = capabilities_path
        self._catalog: CapabilityCatalog | None = None

    @property
    def catalog(self) -> CapabilityCatalog:
        if self._catalog is None:
            if self._capabilities_path:
                self._catalog = CapabilityCatalog.from_file(self._capabilities_path)
            else:
                raise ConfigurationError(
                    "No capabilities.yaml path provided to resolver"
                )
        return self._catalog

    def _load_user_config(self) -> dict[str, Any]:
        """Load user-level config from ~/.ai_manhua/config.yaml"""
        home = Path.home()
        return _load_yaml(home / ".ai_manhua" / "config.yaml") or {}

    def _load_project_config(self, project_path: str | Path | None) -> dict[str, Any]:
        """Load project-level config from {project_path}/.ai_manhua/config.yaml"""
        if not project_path:
            return {}
        return _load_yaml(Path(project_path) / ".ai_manhua" / "config.yaml") or {}

    def _load_system_config(self) -> dict[str, Any]:
        """Load system-level config from CONFIG_PATH env var or default."""
        config_path = os.getenv("CONFIG_PATH", "")
        if config_path:
            return _load_yaml(config_path) or {}
        return {}

    def _parse_entry(self, data: dict[str, Any], model_type: str) -> ModelConfigEntry | None:
        """Parse a model config entry dict into a ModelConfigEntry, or None if empty."""
        if not data or not any(data.values()):
            return None
        return ModelConfigEntry(
            provider=data.get("provider", ""),
            model=data.get("model", ""),
            api_key=data.get("api_key", "") or data.get("apiKey", "") or None,
            endpoint=data.get("endpoint", "") or None,
            timeout=data.get("timeout", 60),
            extra=data.get("extra", {}) or {},
        )

    def _build_resolved_config(
        self,
        system: dict[str, Any],
        user: dict[str, Any],
        project: dict[str, Any],
        runtime: dict[str, Any],
    ) -> ResolvedConfig:
        """Build ResolvedConfig from merged sources."""
        # Merge in order: system → user → project → runtime
        merged_llm = _deep_merge(
            system.get("llm", {}),
            _deep_merge(user.get("llm", {}), _deep_merge(project.get("llm", {}), runtime.get("llm", {})))
        )
        merged_t2i = _deep_merge(
            system.get("t2i", {}),
            _deep_merge(user.get("t2i", {}), _deep_merge(project.get("t2i", {}), runtime.get("t2i", {})))
        )
        merged_i2v = _deep_merge(
            system.get("i2v", {}),
            _deep_merge(user.get("i2v", {}), _deep_merge(project.get("i2v", {}), runtime.get("i2v", {})))
        )
        merged_tts = _deep_merge(
            system.get("tts", {}),
            _deep_merge(user.get("tts", {}), _deep_merge(project.get("tts", {}), runtime.get("tts", {})))
        )

        def resolve_entry(data: dict[str, Any]) -> ModelConfigEntry | None:
            if not data or not any(v for v in data.values() if v):
                return None
            return self._parse_entry(data, "model")

        return ResolvedConfig(
            llm=resolve_entry(merged_llm),
            t2i=resolve_entry(merged_t2i),
            i2v=resolve_entry(merged_i2v),
            tts=resolve_entry(merged_tts),
        )

    def resolve(
        self,
        project_path: str | Path | None = None,
        overrides: dict[str, Any] | None = None,
    ) -> ResolvedConfig:
        """
        Resolve model config from all sources.

        Args:
            project_path: Path to project (for project-level config).
            overrides: Runtime overrides (highest priority).

        Returns:
            ResolvedConfig with merged entries from all levels.
        """
        system = _resolve_dict(_load_yaml(os.getenv("CONFIG_PATH", "")) or {})
        user = _resolve_dict(self._load_user_config())
        project = _resolve_dict(self._load_project_config(project_path))
        runtime = _resolve_dict(overrides or {})

        return self._build_resolved_config(system, user, project, runtime)

    def resolve_type(
        self,
        model_type: ModelType,
        project_path: str | Path | None = None,
        overrides: dict[str, Any] | None = None,
    ) -> ModelConfigEntry | None:
        """Resolve a single model type's config entry."""
        config = self.resolve(project_path, overrides)
        return getattr(config, model_type.value, None)