"""
Audio API — /api/v1/audio/speech
Text-to-Speech generation endpoint.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import get_adapter, AdapterError
from app.core.db import get_db_cursor

router = APIRouter(prefix="/api/v1/audio", tags=["audio"])


class SpeechRequest(BaseModel):
    model_id: str
    prompt: str
    voice: str | None = None
    speed: float | None = 1.0
    format: str | None = "mp3"


class SpeechResponse(BaseModel):
    success: bool
    audio_url: str | None = None
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


@router.post("/speech", response_model=SpeechResponse)
async def text_to_speech(req: SpeechRequest):
    """Text-to-Speech generation endpoint."""
    start = time.time()
    try:
        config = _get_model_config(req.model_id)
        adapter = get_adapter(config)

        params = {
            "model": config.get("modelId", ""),
            "prompt": req.prompt,
            "voice": req.voice,
            "speed": req.speed,
            "format": req.format,
        }

        result = await adapter.generate(params)

        latency_ms = int((time.time() - start) * 1000)
        return SpeechResponse(
            success=True,
            audio_url=result.get("audio_url"),
            latency_ms=latency_ms,
        )

    except AdapterError as e:
        latency_ms = int((time.time() - start) * 1000)
        return SpeechResponse(success=False, error=str(e), latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return SpeechResponse(success=False, error=str(e), latency_ms=latency_ms)