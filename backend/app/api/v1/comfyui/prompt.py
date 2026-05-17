"""
ComfyUI API — /api/v1/comfyui/prompt
ComfyUI workflow submission and WebSocket progress.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import get_adapter, AdapterError

router = APIRouter(prefix="/api/v1/comfyui", tags=["comfyui"])


class ComfyUIPromptRequest(BaseModel):
    model_id: str
    prompt: str | None = None
    negative_prompt: str | None = None
    seed: int | None = None
    steps: int | None = None
    cfg: float | None = None
    sampler_name: str | None = None
    scheduler: str | None = None
    denoise: float | None = None
    checkpoint: str | None = None
    width: int | None = None
    height: int | None = None


class ComfyUIPromptResponse(BaseModel):
    success: bool
    prompt_id: str | None = None
    media: list[dict] = []
    error: str | None = None
    latency_ms: int | None = None


def _get_model_config(model_id: str) -> dict:
    with get_db_cursor() as cursor:
        cursor.execute(
            'SELECT * FROM "ModelConfig" WHERE "modelId" = %s',
            (model_id,)
        )
        config = cursor.fetchone()
        if not config:
            raise HTTPException(status_code=404, detail=f"ComfyUI config '{model_id}' not found")
        return {
            "modelId": config["modelId"],
            "provider": config["provider"],
            "protocol": config["protocol"],
            "endpoint": config["endpoint"],
            "apiKey": config["apiKey"],
            "timeout": config["timeout"],
            "paramsSchema": config["paramsSchema"] or {},
        }


@router.post("/prompt", response_model=ComfyUIPromptResponse)
async def submit_prompt(req: ComfyUIPromptRequest):
    """Submit a prompt to ComfyUI queue."""
    start = time.time()
    try:
        config = _get_model_config(req.model_id)
        adapter = get_adapter(config)

        params = {
            "model": config.get("modelId", ""),
            "prompt": req.prompt or "",
            "negative_prompt": req.negative_prompt,
            "seed": req.seed,
            "steps": req.steps,
            "cfg": req.cfg,
            "sampler_name": req.sampler_name,
            "scheduler": req.scheduler,
            "denoise": req.denoise,
            "checkpoint": req.checkpoint,
            "width": req.width,
            "height": req.height,
        }

        result = await adapter.generate(params)

        latency_ms = int((time.time() - start) * 1000)
        return ComfyUIPromptResponse(
            success=True,
            prompt_id=result.get("prompt_id"),
            media=result.get("media", []),
            latency_ms=latency_ms,
        )

    except AdapterError as e:
        latency_ms = int((time.time() - start) * 1000)
        return ComfyUIPromptResponse(success=False, error=str(e), latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return ComfyUIPromptResponse(success=False, error=str(e), latency_ms=latency_ms)