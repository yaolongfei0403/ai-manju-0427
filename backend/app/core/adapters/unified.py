"""
Unified request/response models for the gateway API.
"""

from pydantic import BaseModel, Field
from typing import Any


class UnifiedRequest(BaseModel):
    """
    Unified request format for all model calls.

    Usage:
        POST /v1/videos/generations
        {
            "model_id": "happyhorse-t2v-prod",
            "mode": "t2v",
            "prompt": "...",
            "resolution": "1080P",
            "duration": 5
        }
    """
    model_id: str = Field(description="Model config ID (e.g. 'happyhorse-t2v-prod')")
    mode: str = Field(description="Capability mode: t2v, i2v_ff, i2v_fflf, video_edit, etc.")
    # Common params
    prompt: str | None = Field(default=None, description="Text prompt")
    negative_prompt: str | None = Field(default=None, description="Negative prompt")
    resolution: str | None = Field(default=None, description="Resolution: 720P, 1080P, etc.")
    duration: int | None = Field(default=None, description="Duration in seconds")
    ratio: str | None = Field(default=None, description="Aspect ratio: 16:9, 9:16, etc.")
    seed: int | None = Field(default=None, description="Random seed, -1 for random")
    watermark: bool | None = Field(default=None, description="Add watermark")
    prompt_extend: bool | None = Field(default=None, description="Enable prompt extension")
    # Media params
    first_frame_url: str | None = Field(default=None, description="First frame image URL")
    last_frame_url: str | None = Field(default=None, description="Last frame image URL")
    first_clip_url: str | None = Field(default=None, description="First video clip URL (for extend)")
    video_url: str | None = Field(default=None, description="Input video URL (for edit/extend)")
    reference_image_url: str | None = Field(default=None, description="Reference image URL")
    reference_images: list[dict[str, Any]] | None = Field(default=None, description="Multiple reference images")
    reference_videos: list[dict[str, Any]] | None = Field(default=None, description="Multiple reference videos")
    audio_url: str | None = Field(default=None, description="Audio URL (for A2V or background audio)")
    custom_audio_url: str | None = Field(default=None, description="Custom audio URL")
    auto_background_audio: bool | None = Field(default=None, description="Auto-generate background audio")
    # LLM params
    messages: list[dict[str, Any]] | None = Field(default=None, description="Chat messages")
    temperature: float | None = Field(default=None, description="Sampling temperature")
    max_tokens: int | None = Field(default=None, description="Max output tokens")
    stream: bool | None = Field(default=None, description="Enable streaming")
    # T2I params
    size: str | None = Field(default=None, description="Image size (e.g. 1024x1024)")
    n: int | None = Field(default=None, description="Number of images to generate")
    quality: str | None = Field(default=None, description="Image quality: standard, hd, ultra")
    # Video params
    fps: int | None = Field(default=None, description="Frame rate")
    guidance_scale: float | None = Field(default=None, description="Guidance scale for Seedance")
    num_inference_steps: int | None = Field(default=None, description="Number of inference steps")
    generate_audio: bool | None = Field(default=None, description="Generate audio for video")
    return_last_frame: bool | None = Field(default=None, description="Return last frame")
    shot_type: str | None = Field(default=None, description="Shot type: single or multi")
    # ComfyUI params
    checkpoint: str | None = Field(default=None, description="Checkpoint filename")
    width: int | None = Field(default=None, description="Width")
    height: int | None = Field(default=None, description="Height")
    steps: int | None = Field(default=None, description="Sampling steps")
    cfg: float | None = Field(default=None, description="CFG scale")
    sampler_name: str | None = Field(default=None, description="Sampler name")
    scheduler: str | None = Field(default=None, description="Scheduler")
    denoise: float | None = Field(default=None, description="Denoise strength")


class UnifiedResponse(BaseModel):
    """Unified response format."""
    success: bool
    task_id: str | None = None
    videos: list[str] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    content: str | None = None
    error: str | None = None
    latency_ms: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class TaskStatusResponse(BaseModel):
    """Task status query response."""
    task_id: str
    status: str  # pending, running, succeeded, failed
    progress: float | None = None
    result: dict[str, Any] | None = None
    error: str | None = None