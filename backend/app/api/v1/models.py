"""
Model Config API — /api/v1/admin/models
Exposes the new model_config system via REST endpoints.
"""

import os
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from pydantic import BaseModel, Field

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

DEFAULT_CAPABILITIES_YAML = Path(__file__).parent.parent.parent.parent.parent / "model" / "config" / "capabilities.yaml"


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
    display_name: str | None = None
    endpoint: str | None = None
    api_key: str | None = None
    timeout: int = 60
    extra: dict[str, Any] = {}
    test_passed: bool = False


class ResolvedConfigResponse(BaseModel):
    llm: list[ConfigEntryResponse] = Field(default_factory=list)
    t2i: list[ConfigEntryResponse] = Field(default_factory=list)
    t2v: list[ConfigEntryResponse] = Field(default_factory=list)
    i2v_ff: list[ConfigEntryResponse] = Field(default_factory=list)
    i2v_fflf: list[ConfigEntryResponse] = Field(default_factory=list)
    video_edit: list[ConfigEntryResponse] = Field(default_factory=list)
    video_extend: list[ConfigEntryResponse] = Field(default_factory=list)
    r2v: list[ConfigEntryResponse] = Field(default_factory=list)
    a2v: list[ConfigEntryResponse] = Field(default_factory=list)
    tts: list[ConfigEntryResponse] = Field(default_factory=list)
    comfyui: list[ConfigEntryResponse] = Field(default_factory=list)
    i2v: list[ConfigEntryResponse] = Field(default_factory=list)


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
        display_name=entry.display_name,
        endpoint=entry.endpoint,
        api_key=entry.api_key,
        timeout=entry.timeout,
        extra=entry.extra or {},
        test_passed=entry.test_passed,
    )


def _entries_to_response(entries: list[ModelConfigEntry]) -> list[ConfigEntryResponse]:
    return [_entry_to_response(e) for e in entries if e is not None]


def _entry_from_request(data: dict[str, Any]) -> ModelConfigEntry:
    return ModelConfigEntry(
        provider=data.get("provider", "") or "",
        model=data.get("model", "") or "",
        display_name=data.get("display_name") or None,
        api_key=data.get("api_key") or data.get("apiKey") or None,
        endpoint=data.get("endpoint") or None,
        timeout=int(data.get("timeout", 60)),
        extra=data.get("extra", {}) or {},
        test_passed=data.get("test_passed", False),
    )


# ─── Endpoints ──────────────────────────────────────────────────────────────────


@router.get("", response_model=list[dict[str, Any]])
async def list_models(type: Annotated[str | None, Query(description="Filter by type: llm, t2i, t2v, i2v_ff, i2v_fflf, video_edit, video_extend, r2v, a2v, tts, comfyui")] = None):
    """
    List all model entries: registered (active) + catalog (available).
    GET /api/v1/admin/models?type=llm
    """
    registry = _get_registry()
    catalog = _get_catalog()

    all_types = [mt.value for mt in ModelType]
    types = [ModelType(t) for t in (type.split(",") if type else all_types)]

    result = []
    seen_keys: set[str] = set()

    # First pass: registered entries from the registry (active config)
    for mt in types:
        entries = registry.get(mt)  # Now returns list
        for entry in entries:
            key = f"{mt.value}:{entry.provider}:{entry.model}"
            seen_keys.add(key)
            schema = catalog.get_schema(entry.provider, entry.model)
            item = {
                "type": mt.value,
                "provider": entry.provider,
                "model": entry.model,
                "display_name": entry.display_name,
                "endpoint": entry.endpoint,
                "timeout": entry.timeout,
                "extra": entry.extra or {},
                "active": True,
                "has_schema": schema is not None,
                "test_passed": entry.test_passed,
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

    # Second pass: catalog capability entries (available but not registered)
    for mt in types:
        for prov, models_map in catalog.schemas.items():
            for model_name, schema in models_map.items():
                if schema.type != mt:
                    continue
                key = f"{mt.value}:{prov}:{model_name}"
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                result.append({
                    "type": mt.value,
                    "provider": prov,
                    "model": model_name,
                    "display_name": model_name,
                    "endpoint": None,
                    "timeout": 60,
                    "extra": {},
                    "active": False,
                    "has_schema": True,
                    "test_passed": False,
                    "params": {
                        name: {
                            "type": p.type,
                            "options": p.options,
                            "range": p.range,
                            "default": p.default,
                        }
                        for name, p in schema.params.items()
                    },
                })

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
        llm=_entries_to_response(config.llm),
        t2i=_entries_to_response(config.t2i),
        t2v=_entries_to_response(config.t2v),
        i2v_ff=_entries_to_response(config.i2v_ff),
        i2v_fflf=_entries_to_response(config.i2v_fflf),
        video_edit=_entries_to_response(config.video_edit),
        video_extend=_entries_to_response(config.video_extend),
        r2v=_entries_to_response(config.r2v),
        a2v=_entries_to_response(config.a2v),
        tts=_entries_to_response(config.tts),
        comfyui=_entries_to_response(config.comfyui),
        i2v=_entries_to_response(config.i2v),
    )


@router.post("/config", response_model=ResolvedConfigResponse)
async def update_config(data: dict[str, Any], project_path: Annotated[str | None, Query(description="Project path for project-level config")] = None):
    """
    Update config for a specific type (append or replace entries).
    POST /api/v1/admin/models/config
    Body: {"llm": [{"provider": "...", "model": "...", "api_key": "..."}]}
    """
    registry = _get_registry()
    resolver = _get_resolver()

    # Build merged data - now supports lists
    merged_data = {}
    for mt in ModelType:
        if mt.value in data:
            new_entries = data[mt.value]
            # Convert single entry to list for backward compatibility
            if isinstance(new_entries, dict):
                new_entries = [new_entries]
            if isinstance(new_entries, list):
                # Get current entries for this type
                current_entries = getattr(registry.config, mt.value, [])
                existing_models = {e.model for e in current_entries}
                # Merge: update existing by model, append new ones
                merged_entries = list(current_entries)
                for new_entry in new_entries:
                    model_id = new_entry.get("model", "")
                    if model_id:
                        # Check if this model already exists
                        found = False
                        for i, existing in enumerate(merged_entries):
                            if existing.model == model_id:
                                merged_entries[i] = ModelConfigEntry(
                                    provider=new_entry.get("provider", "") or existing.provider,
                                    model=model_id,
                                    display_name=new_entry.get("display_name") or existing.display_name,
                                    api_key=new_entry.get("api_key") or new_entry.get("apiKey") or existing.api_key,
                                    endpoint=new_entry.get("endpoint") or existing.endpoint,
                                    timeout=int(new_entry.get("timeout", 60)),
                                    extra=new_entry.get("extra", {}) or {},
                                    test_passed=new_entry.get("test_passed", existing.test_passed),
                                )
                                found = True
                                break
                        if not found:
                            merged_entries.append(ModelConfigEntry(
                                provider=new_entry.get("provider", "") or "",
                                model=model_id,
                                display_name=new_entry.get("display_name") or None,
                                api_key=new_entry.get("api_key") or new_entry.get("apiKey") or None,
                                endpoint=new_entry.get("endpoint") or None,
                                timeout=int(new_entry.get("timeout", 60)),
                                extra=new_entry.get("extra", {}) or {},
                                test_passed=new_entry.get("test_passed", False),
                            ))
                merged_data[mt.value] = [
                    {
                        "provider": e.provider,
                        "model": e.model,
                        "display_name": e.display_name,
                        "endpoint": e.endpoint,
                        "api_key": e.api_key,
                        "timeout": e.timeout,
                        "extra": e.extra or {},
                        "test_passed": e.test_passed,
                    }
                    for e in merged_entries
                ]

    new_config = resolver.resolve(project_path=project_path, overrides=merged_data)
    registry.update(new_config)

    # Persist to user config YAML file
    resolver.save(merged_data, project_path=project_path)

    return ResolvedConfigResponse(
        llm=_entries_to_response(new_config.llm),
        t2i=_entries_to_response(new_config.t2i),
        t2v=_entries_to_response(new_config.t2v),
        i2v_ff=_entries_to_response(new_config.i2v_ff),
        i2v_fflf=_entries_to_response(new_config.i2v_fflf),
        video_edit=_entries_to_response(new_config.video_edit),
        video_extend=_entries_to_response(new_config.video_extend),
        r2v=_entries_to_response(new_config.r2v),
        a2v=_entries_to_response(new_config.a2v),
        tts=_entries_to_response(new_config.tts),
        comfyui=_entries_to_response(new_config.comfyui),
        i2v=_entries_to_response(new_config.i2v),
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


class TestConnectionRequest(BaseModel):
    type: str
    provider: str
    model: str
    api_key: str | None = None
    endpoint: str | None = None
    extra: dict[str, Any] | None = None


@router.post("/test", response_model=dict[str, Any])
async def test_model_connection(request: TestConnectionRequest):
    """
    Test connectivity to a model provider.
    POST /api/v1/admin/models/test
    Body: {"type": "llm", "provider": "siliconflow", "model": "...", "api_key": "...", "endpoint": "..."}
    """
    from fastapi import HTTPException

    catalog = _get_catalog()

    entry = ModelConfigEntry(
        provider=request.provider,
        model=request.model,
        api_key=request.api_key or "",
        endpoint=request.endpoint,
        timeout=60,
        extra=request.extra or {},
    )

    try:
        mt = ModelType(request.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid model type: {request.type}")

    # Create service directly from entry (bypass registry requirement)
    provider_lower = request.provider.lower()
    import time
    start = time.time()
    try:
        if mt == ModelType.LLM:
            if provider_lower in ("deepseek", "openai", "siliconflow"):
                from ...services.llm_service import OpenAILLMService
                service = OpenAILLMService(entry.api_key, entry.endpoint or "", entry.model)
                # Use _call_llm directly for test
                result = await service._call_llm([{"role": "user", "content": "Hi"}])
                latency_ms = int((time.time() - start) * 1000)
                return {"success": True, "latency": latency_ms, "message": "Connection OK", "result": result[:100], "test_passed": True}
            else:
                # Try via factory for other providers
                factory = ModelServiceFactory(_get_registry(), catalog)
                service = factory.for_type(mt)
                result = await service.chat(messages=[{"role": "user", "content": "Hi"}])
                latency_ms = int((time.time() - start) * 1000)
                return {"success": True, "latency": latency_ms, "message": "Connection OK", "result": result[:100], "test_passed": True}
        else:
            factory = ModelServiceFactory(_get_registry(), catalog)
            service = factory.for_type(mt)
            if mt == ModelType.T2I:
                result = await service.generate(prompt="test", style="realistic", resolution="1024x1024")
            elif mt == ModelType.I2V:
                result = await service.generate(prompt="test", image_path=None)
            elif mt == ModelType.TTS:
                result = await service.generate(prompt="test")
            latency_ms = int((time.time() - start) * 1000)
            return {"success": True, "latency": latency_ms, "message": "Connection OK", "result": result, "test_passed": True}
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {"success": False, "latency": latency_ms, "message": str(e), "error": repr(e), "test_passed": False}


@router.post("/test/save", response_model=ResolvedConfigResponse)
async def save_test_result(request: TestConnectionRequest):
    """
    Save the test result (test_passed) to the model config.
    POST /api/v1/admin/models/test/save
    """
    registry = _get_registry()
    resolver = _get_resolver()

    try:
        mt = ModelType(request.type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid model type: {request.type}")

    # Find entry by model and update test_passed
    current = registry.config
    current_entries = getattr(current, mt.value, [])
    found = False
    updated_entries = []
    for entry in current_entries:
        if entry.model == request.model:
            # Create updated entry with test_passed=True
            updated_entries.append(ModelConfigEntry(
                provider=entry.provider,
                model=entry.model,
                display_name=entry.display_name,
                api_key=entry.api_key,
                endpoint=entry.endpoint,
                timeout=entry.timeout,
                extra=entry.extra or {},
                test_passed=True,
            ))
            found = True
        else:
            updated_entries.append(entry)

    if not found:
        raise HTTPException(status_code=404, detail=f"Model not found: {request.model}")

    # Build merged data for save
    merged_data = {
        mt.value: [
            {
                "provider": e.provider,
                "model": e.model,
                "display_name": e.display_name,
                "endpoint": e.endpoint,
                "api_key": e.api_key,
                "timeout": e.timeout,
                "extra": e.extra or {},
                "test_passed": e.test_passed,
            }
            for e in updated_entries
        ]
    }

    new_config = resolver.resolve(overrides=merged_data)
    registry.update(new_config)
    resolver.save(merged_data)

    return ResolvedConfigResponse(
        llm=_entries_to_response(new_config.llm),
        t2i=_entries_to_response(new_config.t2i),
        t2v=_entries_to_response(new_config.t2v),
        i2v_ff=_entries_to_response(new_config.i2v_ff),
        i2v_fflf=_entries_to_response(new_config.i2v_fflf),
        video_edit=_entries_to_response(new_config.video_edit),
        video_extend=_entries_to_response(new_config.video_extend),
        r2v=_entries_to_response(new_config.r2v),
        a2v=_entries_to_response(new_config.a2v),
        tts=_entries_to_response(new_config.tts),
        comfyui=_entries_to_response(new_config.comfyui),
        i2v=_entries_to_response(new_config.i2v),
    )


@router.delete("", response_model=ResolvedConfigResponse)
async def delete_model_config(
    model_type: Annotated[str, Query(description="Model type to delete: llm, t2i, t2v, i2v_ff, i2v_fflf, video_edit, video_extend, r2v, a2v, tts, comfyui")],
    model: Annotated[str, Query(description="Model identifier to delete from the type list")],
    project_path: Annotated[str | None, Query(description="Project path for project-level config")] = None,
):
    """
    Delete a specific model entry from a type's list.
    DELETE /api/v1/admin/models?model_type=llm&model=deepseek-ai/DeepSeek-V4-Flash
    """
    registry = _get_registry()
    resolver = _get_resolver()

    try:
        mt = ModelType(model_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid model type: {model_type}")

    # Remove entry by model identifier
    current = registry.config
    current_entries = getattr(current, mt.value, [])
    filtered_entries = [e for e in current_entries if e.model != model]

    # Build merged data with filtered list
    merged_data = {
        mt.value: [
            {
                "provider": e.provider,
                "model": e.model,
                "display_name": e.display_name,
                "endpoint": e.endpoint,
                "api_key": e.api_key,
                "timeout": e.timeout,
                "extra": e.extra or {},
                "test_passed": e.test_passed,
            }
            for e in filtered_entries
        ]
    }

    new_config = resolver.resolve(overrides=merged_data)
    registry.update(new_config)
    resolver.save(merged_data, project_path=project_path)

    return ResolvedConfigResponse(
        llm=_entries_to_response(new_config.llm),
        t2i=_entries_to_response(new_config.t2i),
        t2v=_entries_to_response(new_config.t2v),
        i2v_ff=_entries_to_response(new_config.i2v_ff),
        i2v_fflf=_entries_to_response(new_config.i2v_fflf),
        video_edit=_entries_to_response(new_config.video_edit),
        video_extend=_entries_to_response(new_config.video_extend),
        r2v=_entries_to_response(new_config.r2v),
        a2v=_entries_to_response(new_config.a2v),
        tts=_entries_to_response(new_config.tts),
        comfyui=_entries_to_response(new_config.comfyui),
        i2v=_entries_to_response(new_config.i2v),
    )

    new_config = resolver.resolve(project_path=project_path, overrides=merged_data)
    registry.update(new_config)

    # Persist to user config YAML file
    resolver.save(merged_data, project_path=project_path)

    return ResolvedConfigResponse(
        llm=_entry_to_response(new_config.llm),
        t2i=_entry_to_response(new_config.t2i),
        t2v=_entry_to_response(new_config.t2v),
        i2v_ff=_entry_to_response(new_config.i2v_ff),
        i2v_fflf=_entry_to_response(new_config.i2v_fflf),
        video_edit=_entry_to_response(new_config.video_edit),
        video_extend=_entry_to_response(new_config.video_extend),
        r2v=_entry_to_response(new_config.r2v),
        a2v=_entry_to_response(new_config.a2v),
        tts=_entry_to_response(new_config.tts),
        comfyui=_entry_to_response(new_config.comfyui),
        i2v=_entry_to_response(new_config.i2v),
    )


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