"""
Capability Catalog — loads and queries model capability schemas from YAML.
"""

from pathlib import Path
from typing import Any

import yaml

from .types import (
    CapabilitySchema,
    CapabilityParam,
    ModelType,
    ConfigurationError,
    CapabilityError,
)


class CapabilityCatalog:
    """
    Loads `capabilities.yaml` at startup and provides validation
    against per-model parameter schemas.

    Usage:
        catalog = CapabilityCatalog.from_file("model/config/capabilities.yaml")
        catalog.validate("wanx", "wan2.7-image", {"size": "2K"})
    """

    def __init__(self, schemas: dict[str, dict[str, CapabilitySchema]]):
        """
        Args:
            schemas: {provider: {model_name: CapabilitySchema}}
        """
        self.schemas = schemas

    @classmethod
    def from_file(cls, path: str | Path) -> "CapabilityCatalog":
        """Load catalog from a YAML file."""
        path = Path(path)
        if not path.exists():
            raise ConfigurationError(f"Capability catalog not found: {path}")

        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)

        capabilities: dict = data.get("capabilities", {})
        schemas: dict[str, dict[str, CapabilitySchema]] = {}

        for provider, models in capabilities.items():
            schemas[provider] = {}
            for model_name, spec in models.items():
                params: dict[str, CapabilityParam] = {}
                for param_name, param_spec in spec.get("params", {}).items():
                    params[param_name] = CapabilityParam(
                        type=param_spec["type"],
                        range=param_spec.get("range"),
                        options=param_spec.get("options"),
                        default=param_spec.get("default"),
                    )
                schemas[provider][model_name] = CapabilitySchema(
                    type=ModelType(spec["type"]),
                    provider=provider,
                    params=params,
                )

        return cls(schemas=schemas)

    def get_schema(self, provider: str, model: str) -> CapabilitySchema | None:
        """Get the capability schema for a specific provider/model, or None if not found."""
        return self.schemas.get(provider, {}).get(model)

    def validate(
        self,
        provider: str,
        model: str,
        params: dict[str, Any],
    ) -> tuple[dict[str, Any], list[str]]:
        """
        Validate a dict of params against the model's capability schema.

        Returns:
            (validated_params, warnings) — warnings for unknown params;
            raises CapabilityError for out-of-range / invalid options.

        Raises:
            CapabilityError: if any param is out of range or has an invalid option.
        """
        schema = self.get_schema(provider, model)
        if schema is None:
            # No schema — pass through with warning
            return params, [f"No capability schema for {provider}/{model}"]

        validated = {}
        warnings = []

        for param_name, value in params.items():
            if param_name not in schema.params:
                warnings.append(f"Unknown param '{param_name}' for {provider}/{model}, ignoring")
                continue

            spec = schema.params[param_name]

            if spec.type == "float" or spec.type == "int":
                numeric_value = float(value)
                if spec.range:
                    lo, hi = spec.range[0], spec.range[1]
                    if not (lo <= numeric_value <= hi):
                        raise CapabilityError(
                            f"Param '{param_name}' value {value} out of range [{lo}, {hi}] "
                            f"for {provider}/{model}"
                        )
                validated[param_name] = value

            elif spec.type == "str":
                if spec.options and value not in spec.options:
                    raise CapabilityError(
                        f"Param '{param_name}' value '{value}' not in allowed options "
                        f"{spec.options} for {provider}/{model}"
                    )
                validated[param_name] = value

            elif spec.type == "bool":
                validated[param_name] = bool(value)

            else:
                validated[param_name] = value

        return validated, warnings

    def get_defaults(self, provider: str, model: str) -> dict[str, Any]:
        """Return a dict of default param values for a model."""
        schema = self.get_schema(provider, model)
        if schema is None:
            return {}
        return {k: v.default for k, v in schema.params.items() if v.default is not None}

    def ensure_capability(
        self,
        params: dict[str, Any],
        provider: str,
        model: str,
    ) -> tuple[dict[str, Any], list[str]]:
        """
        Fill in defaults then validate params against the model's capability schema.

        Args:
            params: Raw params dict (may be missing fields that have defaults).
            provider: Provider identifier (e.g. "wanx", "volc").
            model: Model identifier (e.g. "wan2.7-image").

        Returns:
            (final_params, warnings) — warnings for unknown params.
            Raises CapabilityError for out-of-range / invalid-option params.
        """
        defaults = self.get_defaults(provider, model)
        # Fill in defaults where not already set
        merged = {**defaults, **params}
        return self.validate(provider, model, merged)