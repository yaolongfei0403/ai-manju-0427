"""
Model Config API — /api/v1/admin/models
Exposes the new model_config system via REST endpoints.
"""

import os
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from pydantic import BaseModel

from app.core.model_config import (
    ModelType,
    ModelConfigEntry,
    ResolvedConfig,
)
from app.core.model_config.resolver import ModelConfigResolver
from app.core.model_config.catalog import CapabilityCatalog
from app.core.model_config.factories import ModelServiceFactory
from app.core.model_config.registry import ModelRegistry

router = APIRouter(prefix="/api/v1/admin/models", tags=["admin models"])

# ─── Paths ────────────────────────────────────────────────────────────────────

DEFAULT_CAPABILITIES_YAML = Path(__file__).parent.parent.parent.parent / "model" / "config" / "capabilities.yaml"


# ─── Singleton resolver / registry ─────────────────────────────────────────────

_resolver: ModelConfigResolver | None = None
_registry: ModelRegistry | None = None
_catalog: CapabilityCatalog | None = None


def _get_resolver() -> ModelConfigResolver:
    global _resolver, _catalog
    if _resolver is None:
        _catalog = CapabilityCatalog.from_file(DEFAULT_CAPABILITIES_YAML)
        _resolver = ModelConfigResolver(capabilities_path=DEFAULT_CAPABILITIES_YAML)
    return _resolver


def _get_registry() -> ModelRegistry:
    global _registry, _catalog
    if _registry is None:
        resolver = _get_resolver()
        resolved = resolver.resolve()
        _registry = ModelRegistry(resolved)
    return _registry


def _get_catalog() -> CapabilityCatalog:
    global _catalog
    if _catalog is None:
        _catalog = CapabilityCatalog.from_file(DEFAULT_CAPABILITIES_YAML)
    return _catalog


# ─── Request / Response models ────────────────────────────────────────────────


class ConfigEntryResponse(BaseModel):
    provider: str
    model: str
    endpoint: str | None = None
    api_key: str | None = None
    timeout: int = 60
    extra: dict[str, Any] = {}


class ResolvedConfigResponse(BaseModel):
    llm: ConfigEntryResponse | None = None
    t2i: ConfigEntryResponse | None = None
    i2v: ConfigEntryResponse | None = None
    tts: ConfigEntryResponse | None = None


class CapabilityParamResponse(BaseModel):
    type: str
    options: list[str] | None = None
    range: list[float] | None = None
    default: Any = None


class ModelCapabilityResponse(BaseModel):
    model: str
    provider: str
    model_type: str
    params: dict[str, CapabilityParamResponse]


# ─── Helpers ────────────────────────────────────────────────────────────────────


def _entry_to_response(entry: ModelConfigEntry | None) -> ConfigEntryResponse | None:
    if entry is None:
        return None
    return ConfigEntryResponse(
        provider=entry.provider,
        model=entry.model,
        endpoint=entry.endpoint,
        api_key=entry.api_key,
        timeout=entry.timeout,
        extra=entry.extra or {},
    )


def _entry_from_request(data: dict[str, Any]) -> ModelConfigEntry:
    return ModelConfigEntry(
        provider=data.get("provider", "") or "",
        model=data.get("model", "") or "",
        api_key=data.get("api_key") or data.get("apiKey") or None,
        endpoint=data.get("endpoint") or None,
        timeout=int(data.get("timeout", 60)),
        extra=data.get("extra", {}) or {},
    )


# ─── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("", response_model=list[dict[str, Any]])
async def list_models(type: Annotated[str | None, Query(description="Filter by type: llm, t2i, i2v, tts")] = None):
    """
    List all currently configured model entries.
    GET /api/v1/admin/models?type=llm
    """
    registry = _get_registry()
    catalog = _get_catalog()

    types = [ModelType(t) for t in (type.split(",") if type else [ModelType.LLM, ModelType.T2I, ModelType.I2V, ModelType.TTS])]

    result = []
    for mt in types:
        entry = registry.get(mt)
        if entry is None:
            continue
        schema = catalog.get_schema(entry.provider, entry.model)
        item = {
            "type": mt.value,
            "provider": entry.provider,
            "model": entry.model,
            "endpoint": entry.endpoint,
            "timeout": entry.timeout,
            "extra": entry.extra or {},
            "has_schema": schema is not None,
            "params": (
                {
                    name: {
                        "type": p.type,
                        "options": p.options,
                        "range": p.range,
                        "default": p.default,
                    }
                    for name, p in schema.params.items()
                }
                if schema
                else {}
            ),
        }
        result.append(item)
    return result


@router.get("/config", response_model=ResolvedConfigResponse)
async def get_resolved_config():
    """
    Get the fully resolved config (all levels merged).
    GET /api/v1/admin/models/config
    """
    registry = _get_registry()
    config = registry.config
    return ResolvedConfigResponse(
        llm=_entry_to_response(config.llm),
        t2i=_entry_to_response(config.t2i),
        i2v=_entry_to_response(config.i2v),
        tts=_entry_to_response(config.tts),
    )


@router.post("/config", response_model=ResolvedConfigResponse)
async def update_config(data: dict[str, Any], project_path: Annotated[str | None, Query(description="Project path for project-level config")] = None):
    """
    Update config for a specific type (runtime override).
    POST /api/v1/admin/models/config
    Body: {"llm": {"provider": "...", "model": "...", "api_key": "..."}}
    """
    registry = _get_registry()
    resolver = _get_resolver()

    # Merge the update into current config
    current = registry.config
    merged_data = {}
    for mt in [ModelType.LLM, ModelType.T2I, ModelType.I2V, ModelType.TTS]:
        if mt.value in data:
            current_entry = getattr(current, mt.value)
            existing = {}
            if current_entry:
                existing = {
                    "provider": current_entry.provider,
                    "model": current_entry.model,
                    "endpoint": current_entry.endpoint,
                    "api_key": current_entry.api_key,
                    "timeout": current_entry.timeout,
                    "extra": current_entry.extra or {},
                }
            merged_data[mt.value] = {**existing, **data[mt.value]}

    new_config = resolver.resolve(project_path=project_path, overrides=merged_data)
    registry.update(new_config)

    return ResolvedConfigResponse(
        llm=_entry_to_response(new_config.llm),
        t2i=_entry_to_response(new_config.t2i),
        i2v=_entry_to_response(new_config.i2v),
        tts=_entry_to_response(new_config.tts),
    )


@router.get("/capabilities", response_model=list[ModelCapabilityResponse])
async def list_capabilities(provider: Annotated[str | None, Query(description="Filter by provider")] = None):
    """
    List all capability schemas (optionally filtered by provider).
    GET /api/v1/admin/models/capabilities
    """
    catalog = _get_catalog()
    result = []
    for prov, models in catalog.schemas.items():
        if provider and prov != provider:
            continue
        for model_name, schema in models.items():
            result.append(ModelCapabilityResponse(
                model=model_name,
                provider=prov,
                model_type=schema.type.value,
                params={
                    name: CapabilityParamResponse(
                        type=p.type,
                        options=p.options,
                        range=p.range,
                        default=p.default,
                    )
                    for name, p in schema.params.items()
                },
            ))
    return result


@router.post("/test", response_model=dict[str, Any])
async def test_model_connection(
    type: str = Query(..., description="Model type: llm, t2i, i2v, tts"),
    provider: str = Query(...),
    model: str = Query(...),
    api_key: str | None = None,
    endpoint: str | None = None,
    extra: dict[str, Any] | None = None,
):
    """
    Test connectivity to a model provider.
    POST /api/v1/admin/models/test?type=llm&provider=bailian&model=qwen-max
    """
    from fastapi import HTTPException

    catalog = _get_catalog()

    entry = ModelConfigEntry(
        provider=provider,
        model=model,
        api_key=api_key or "",
        endpoint=endpoint,
        timeout=60,
        extra=extra or {},
    )

    try:
        mt = ModelType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid model type: {type}")

    factory = ModelServiceFactory(_get_registry(), catalog)
    service = factory.for_type(mt)

    # For LLM, do a simple chat call; for others try generate with dummy input
    import time
    start = time.time()
    try:
        if mt == ModelType.LLM:
            # Simple chat test
            result = await service.chat(messages=[{"role": "user", "content": "Hi"}])
            latency_ms = int((time.time() - start) * 1000)
            return {"success": True, "latency": latency_ms, "message": "Connection OK", "result": result[:100]}
        else:
            # Try generate with minimal input
            if mt == ModelType.T2I:
                result = await service.generate(prompt="test", style="realistic", resolution="1024x1024")
            elif mt == ModelType.I2V:
                result = await service.generate(prompt="test", image_path=None)
            elif mt == ModelType.TTS:
                result = await service.generate(prompt="test")
            latency_ms = int((time.time() - start) * 1000)
            return {"success": True, "latency": latency_ms, "message": "Connection OK", "result": result}
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {"success": False, "latency": latency_ms, "message": str(e), "error": repr(e)}


@router.post("/validate-params", response_model=dict[str, Any])
async def validate_params(
    provider: str = Query(...),
    model: str = Query(...),
    params: dict[str, Any] = ...,  # request body
):
    """
    Validate params against a model's capability schema.
    POST /api/v1/admin/models/validate-params?provider=volc&model=seedance-2.0
    Body: {"duration": "5s", "motion_intensity": 0.7}
    """
    catalog = _get_catalog()
    validated, warnings = catalog.ensure_capability(params, provider, model)
    return {"valid": True, "validated": validated, "warnings": warnings}