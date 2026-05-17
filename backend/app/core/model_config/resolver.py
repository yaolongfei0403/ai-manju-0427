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
    """Deep merge for nested dicts, overlay wins. Treats None as delete signal in top-level."""
    if overlay is None:
        return base
    result = dict(base)
    for key, value in overlay.items():
        if value is None:
            result.pop(key, None)
        elif key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _load_yaml(path: Path | str) -> dict[str, Any] | None:
    """Load a YAML file, return None if not found."""
    if not path:
        return None
    path = Path(path)
    if not path.exists() or path.is_dir():
        return None
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _save_yaml(path: Path | str, data: dict[str, Any]) -> None:
    """Save data to a YAML file, creating parent directories if needed."""
    if not path:
        return
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


def _migrate_to_list_format(data: dict[str, Any]) -> dict[str, Any]:
    """Migrate old single-entry format to new list format for backward compatibility."""
    result = {}
    for key, value in data.items():
        if key in ("llm", "t2i", "t2v", "i2v_ff", "i2v_fflf", "video_edit",
                  "video_extend", "r2v", "a2v", "tts", "comfyui", "i2v"):
            if isinstance(value, dict):
                # Old single-entry format, wrap in list
                result[key] = [value]
            elif isinstance(value, list):
                result[key] = value
            else:
                result[key] = []
        else:
            result[key] = value
    return result


class ModelConfigResolver:
    """
    Resolves model config from multiple YAML sources with override priority.

    Usage:
        resolver = ModelConfigResolver()
        config = resolver.resolve(
            project_path="/path/to/project",
            overrides={"llm": [{"provider": "deepseek", "api_key": "sk-..."}]}
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
        data = _load_yaml(home / ".ai_manhua" / "config.yaml") or {}
        return _migrate_to_list_format(data)

    def _user_config_path(self) -> Path:
        """Return the user config file path."""
        return Path.home() / ".ai_manhua" / "config.yaml"

    def _save_user_config(self, data: dict[str, Any]) -> None:
        """Save data to user-level config ~/.ai_manhua/config.yaml"""
        _save_yaml(self._user_config_path(), data)

    def _load_project_config(self, project_path: str | Path | None) -> dict[str, Any]:
        """Load project-level config from {project_path}/.ai_manhua/config.yaml"""
        if not project_path:
            return {}
        data = _load_yaml(Path(project_path) / ".ai_manhua" / "config.yaml") or {}
        return _migrate_to_list_format(data)

    def _load_system_config(self) -> dict[str, Any]:
        """Load system-level config from CONFIG_PATH env var or default."""
        config_path = os.getenv("CONFIG_PATH", "")
        if config_path:
            data = _load_yaml(config_path) or {}
            return _migrate_to_list_format(data)
        return {}

    def _parse_entry(self, data: dict[str, Any]) -> ModelConfigEntry | None:
        """Parse a single model config entry dict into a ModelConfigEntry, or None if empty."""
        if not data or not any(data.values()):
            return None
        return ModelConfigEntry(
            provider=data.get("provider", ""),
            model=data.get("model", ""),
            display_name=data.get("display_name") or None,
            api_key=data.get("api_key", "") or data.get("apiKey", "") or None,
            endpoint=data.get("endpoint", "") or None,
            timeout=data.get("timeout", 60),
            extra=data.get("extra", {}) or {},
            test_passed=data.get("test_passed", False),
        )

    def _parse_entries(self, data: list[dict] | dict | None) -> list[ModelConfigEntry]:
        """Parse config data (list or single entry) into list of ModelConfigEntry."""
        if not data:
            return []
        # Handle old single-entry format (dict) by wrapping in list
        if isinstance(data, dict):
            data = [data]
        entries = []
        for entry_data in data:
            entry = self._parse_entry(entry_data)
            if entry:
                entries.append(entry)
        return entries

    def _build_resolved_config(
        self,
        system: dict[str, Any],
        user: dict[str, Any],
        project: dict[str, Any],
        runtime: dict[str, Any],
    ) -> ResolvedConfig:
        """Build ResolvedConfig from merged sources."""
        model_types = [
            "llm", "t2i", "t2v", "i2v_ff", "i2v_fflf",
            "video_edit", "video_extend", "r2v", "a2v", "tts", "comfyui"
        ]
        merged = {}
        for mt in model_types:
            runtime_val = runtime.get(mt) if runtime else None
            project_val = project.get(mt, []) if project else []
            user_val = user.get(mt, []) if user else []
            system_val = system.get(mt, []) if system else []

            # Handle backward compatibility: if values are dicts (old format), wrap in list
            def to_list(val):
                if isinstance(val, dict):
                    return [val]
                return val if isinstance(val, list) else []

            runtime_list = to_list(runtime_val)
            project_list = to_list(project_val)
            user_list = to_list(user_val)
            system_list = to_list(system_val)

            # Merge all lists (runtime highest priority, then project, user, system)
            # Use model identifier as key for deduplication
            seen: dict[str, dict[str, Any]] = {}
            for source in [system_list, user_list, project_list, runtime_list]:
                for entry in source:
                    if isinstance(entry, dict) and entry.get("model"):
                        seen[entry["model"]] = entry

            merged[mt] = list(seen.values())

        def resolve_entries(data: list[dict]) -> list[ModelConfigEntry]:
            return self._parse_entries(data)

        return ResolvedConfig(
            **{mt: resolve_entries(merged[mt]) for mt in model_types}
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
        system = _migrate_to_list_format(system) if system else {}
        user = _resolve_dict(self._load_user_config())
        project = _resolve_dict(self._load_project_config(project_path))
        runtime = _resolve_dict(overrides or {}) if overrides else {}

        return self._build_resolved_config(system, user, project, runtime)

    def resolve_type(
        self,
        model_type: ModelType,
        project_path: str | Path | None = None,
        overrides: dict[str, Any] | None = None,
    ) -> list[ModelConfigEntry]:
        """Resolve a single model type's config entries."""
        config = self.resolve(project_path, overrides)
        return getattr(config, model_type.value, [])

    def _config_entry_to_dict(self, entry: ModelConfigEntry) -> dict[str, Any]:
        """Convert a ModelConfigEntry to a dict for YAML serialization."""
        return {
            "provider": entry.provider,
            "model": entry.model,
            "display_name": entry.display_name,
            "endpoint": entry.endpoint,
            "api_key": entry.api_key,
            "timeout": entry.timeout,
            "extra": entry.extra or {},
            "test_passed": entry.test_passed,
        }

    def save(
        self,
        overrides: dict[str, Any],
        project_path: str | Path | None = None,
    ) -> None:
        """
        Save runtime overrides to user config YAML file.

        Args:
            overrides: Dict of model type -> list of config entries
            project_path: If provided, save to project-level config instead
        """
        # Load existing user config (or empty)
        if project_path:
            existing = _load_yaml(Path(project_path) / ".ai_manhua" / "config.yaml") or {}
            existing = _migrate_to_list_format(existing)
            save_path = Path(project_path) / ".ai_manhua" / "config.yaml"
        else:
            existing = self._load_user_config()
            save_path = self._user_config_path()

        # Deep merge overrides into existing
        for mt, value in overrides.items():
            if isinstance(value, list) and len(value) > 0:
                # Get existing entries for this type
                existing_entries = existing.get(mt, [])
                if not isinstance(existing_entries, list):
                    existing_entries = []
                # Merge: update existing entries by model, append new ones
                seen_models = set()
                for entry in value:
                    if isinstance(entry, dict) and entry.get("model"):
                        model_id = entry["model"]
                        seen_models.add(model_id)
                        # Check if this model already exists in existing_entries
                        found = False
                        for i, existing_entry in enumerate(existing_entries):
                            if isinstance(existing_entry, dict) and existing_entry.get("model") == model_id:
                                existing_entries[i] = entry
                                found = True
                                break
                        if not found:
                            existing_entries.append(entry)
                existing[mt] = existing_entries
            elif isinstance(value, list) and len(value) == 0:
                # Clear this model type if empty list
                existing[mt] = []
            elif value is None:
                existing.pop(mt, None)

        # Save back to YAML
        _save_yaml(save_path, existing)