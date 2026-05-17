"""
Images Generation API — /api/v1/images/generations
Text-to-image generation endpoint.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import get_adapter, AdapterError
from app.core.db import get_db_cursor

router = APIRouter(prefix="/api/v1/images", tags=["images"])


class ImageGenerateRequest(BaseModel):
    model_id: str
    prompt: str
    size: str | None = "1024x1024"
    n: int | None = 1
    seed: int | None = None
    quality: str | None = "standard"


class ImageGenerateResponse(BaseModel):
    success: bool
    images: list[str] = []
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
            raise HTTPException(status_code=404, detail=f"Model config '{model_id}' not found")
        return {
            "modelId": config["modelId"],
            "provider": config["provider"],
            "protocol": config["protocol"],
            "endpoint": config["endpoint"],
            "apiKey": config["apiKey"],
            "timeout": config["timeout"],
            "paramsSchema": config["paramsSchema"] or {},
        }


@router.post("/generations", response_model=ImageGenerateResponse)
async def generate_image(req: ImageGenerateRequest):
    """Text-to-image generation endpoint."""
    start = time.time()
    try:
        config = _get_model_config(req.model_id)
        adapter = get_adapter(config)

        params = {
            "model": config.get("modelId", ""),
            "prompt": req.prompt,
            "size": req.size,
            "n": req.n,
            "seed": req.seed,
            "quality": req.quality,
        }

        result = await adapter.generate(params)

        latency_ms = int((time.time() - start) * 1000)
        images = result.get("images", [])
        if not images and result.get("data"):
            images = [img.get("url") for img in result["data"] if img.get("url")]

        return ImageGenerateResponse(
            success=True,
            images=images,
            latency_ms=latency_ms,
        )

    except AdapterError as e:
        latency_ms = int((time.time() - start) * 1000)
        return ImageGenerateResponse(success=False, error=str(e), latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return ImageGenerateResponse(success=False, error=str(e), latency_ms=latency_ms)