"""
Videos Generation API — /api/v1/videos/generations
Unified entry point for all video generation capabilities.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import (
    get_adapter,
    AdapterError,
    TaskFailedException,
    TaskTimeoutException,
)
from app.core.db import get_db_cursor
from app.core.config import settings

router = APIRouter(prefix="/api/v1/videos", tags=["videos"])


class VideoGenerateRequest(BaseModel):
    model_id: str
    mode: str = "t2v"
    prompt: str | None = None
    negative_prompt: str | None = None
    resolution: str | None = None
    duration: int | None = None
    ratio: str | None = None
    seed: int | None = None
    watermark: bool | None = None
    prompt_extend: bool | None = None
    first_frame_url: str | None = None
    last_frame_url: str | None = None
    first_clip_url: str | None = None
    video_url: str | None = None
    reference_image_url: str | None = None
    reference_images: list[dict] | None = None
    reference_videos: list[dict] | None = None
    audio_url: str | None = None
    custom_audio_url: str | None = None
    auto_background_audio: bool | None = None


class VideoGenerateResponse(BaseModel):
    success: bool
    task_id: str | None = None
    videos: list[str] = []
    error: str | None = None
    latency_ms: int | None = None


def _get_model_config(model_id: str) -> dict:
    """Fetch model config from DB using psycopg2."""
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
            "name": config["name"],
            "provider": config["provider"],
            "type": config["type"],
            "protocol": config["protocol"],
            "endpoint": config["endpoint"],
            "apiKey": config["apiKey"],
            "timeout": config["timeout"],
            "retryTimes": config["retryTimes"],
            "paramsSchema": config["paramsSchema"] or {},
            "customHeaders": config["customHeaders"] or {},
        }


@router.post("/generations", response_model=VideoGenerateResponse)
async def generate_video(req: VideoGenerateRequest):
    """
    Unified video generation endpoint.

    Supports:
    - T2V (text-to-video): mode="t2v"
    - I2V First Frame: mode="i2v_ff" with first_frame_url
    - I2V First+Last Frame: mode="i2v_fflf" with first_frame_url + last_frame_url
    - Video Edit: mode="video_edit" with video_url + prompt
    - Video Extend: mode="video_extend" with first_clip_url + prompt
    - R2V (reference-to-video): mode="r2v" with reference_images
    - A2V (audio-driven): mode="a2v" with audio_url + first_frame_url
    """
    start = time.time()
    try:
        config = _get_model_config(req.model_id)
        adapter = get_adapter(config)

        params = {
            "model": config.get("modelId", ""),
            "prompt": req.prompt or "",
            "resolution": req.resolution,
            "duration": req.duration,
            "ratio": req.ratio,
            "seed": req.seed,
            "watermark": req.watermark,
            "prompt_extend": req.prompt_extend,
            "first_frame_url": req.first_frame_url,
            "last_frame_url": req.last_frame_url,
            "first_clip_url": req.first_clip_url,
            "video_url": req.video_url,
            "reference_image_url": req.reference_image_url,
            "reference_images": req.reference_images,
            "reference_videos": req.reference_videos,
            "audio_url": req.audio_url,
            "custom_audio_url": req.custom_audio_url,
            "auto_background_audio": req.auto_background_audio,
            "negative_prompt": req.negative_prompt,
        }

        result = await adapter.generate(params)

        latency_ms = int((time.time() - start) * 1000)
        return VideoGenerateResponse(
            success=True,
            task_id=result.get("task_id"),
            videos=result.get("videos", [result.get("video_url")] if result.get("video_url") else []),
            latency_ms=latency_ms,
        )

    except TaskFailedException as e:
        latency_ms = int((time.time() - start) * 1000)
        return VideoGenerateResponse(
            success=False,
            error=f"Task failed: {e.status}",
            latency_ms=latency_ms,
        )
    except TaskTimeoutException as e:
        latency_ms = int((time.time() - start) * 1000)
        return VideoGenerateResponse(
            success=False,
            error=f"Task timed out: {e.task_id}",
            latency_ms=latency_ms,
        )
    except AdapterError as e:
        latency_ms = int((time.time() - start) * 1000)
        return VideoGenerateResponse(
            success=False,
            error=str(e),
            latency_ms=latency_ms,
        )
    except HTTPException:
        raise
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return VideoGenerateResponse(
            success=False,
            error=str(e),
            latency_ms=latency_ms,
        )