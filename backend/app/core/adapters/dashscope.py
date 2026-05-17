"""
DashScope adapter — supports HappyHorse and WanX 2.7 series.
"""

import asyncio
import json
from typing import Any
import httpx
from jinja2 import Template
from .base import ModelAdapter, AdapterError, TaskFailedException, TaskTimeoutException, TaskStatus


class DashscopeAdapter(ModelAdapter):
    """
    Adapter for Alibaba DashScope API (HappyHorse, WanX 2.7).

    Handles:
    - T2V (text-to-video)
    - I2V (image-to-video)
    - R2V (reference-to-video)
    - Video Edit
    - Video Extend
    - A2V (audio-driven video)
    - TTS
    """

    ASYNC_HEADER = "X-DashScope-Async"
    ASYNC_VALUE = "enable"
    POLL_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
    SUBMIT_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"

    def build_headers(self) -> dict[str, str]:
        headers = super().build_headers()
        headers["Authorization"] = f"Bearer {self.api_key}"
        headers[self.ASYNC_HEADER] = self.ASYNC_VALUE
        return headers

    def convert_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Convert unified request to DashScope format using Jinja2 template.

        Expected params:
            model: str (e.g. "happyhorse-1.0-t2v", "wan2.7-t2v-2026-04-25")
            prompt: str
            resolution: str (optional, default "720P")
            duration: int (optional, default 5)
            ratio: str (optional, default "16:9")
            reference_images: list[dict] (optional)
            video_url: str (optional, for edit/extend)
            reference_image_url: str (optional)
            first_frame_url: str (optional)
            last_frame_url: str (optional)
            first_clip_url: str (optional)
            audio_url: str (optional)
            negative_prompt: str (optional)
            watermark: bool (optional)
            prompt_extend: bool (optional)
            seed: int (optional)
        """
        model = params.get("model", "")
        params_schema = self.config.get("paramsSchema") or {}

        # Use Jinja2 template from paramsSchema if available
        request_template = params_schema.get("requestTemplate")
        if request_template:
            template = Template(str(request_template))
            rendered = template.render(**params)
            return json.loads(rendered)

        # Fallback: build request based on model type
        if "happyhorse" in model:
            return self._build_happyhorse_request(params)
        elif "wan2.7" in model:
            return self._build_wanx_request(params)
        else:
            return self._build_generic_request(params)

    def _build_happyhorse_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """Build HappyHorse series request."""
        model = params.get("model", "happyhorse-1.0-t2v")
        request = {
            "model": model,
            "input": {
                "prompt": params.get("prompt", ""),
            },
            "parameters": {
                "resolution": params.get("resolution", "1080P"),
                "duration": params.get("duration", 5),
            },
        }

        # Add ratio for T2V
        if "t2v" in model:
            request["parameters"]["ratio"] = params.get("ratio", "16:9")

        # Add media for R2V
        if "r2v" in model:
            ref_images = params.get("reference_images", [])
            request["input"]["media"] = [
                {"type": "reference_image", "url": img["url"]}
                for img in ref_images
            ]

        # Add media for video edit
        if "video-edit" in model or "video_edit" in model:
            video_url = params.get("video_url")
            ref_image_url = params.get("reference_image_url")
            request["input"]["media"] = []
            if video_url:
                request["input"]["media"].append({"type": "video", "url": video_url})
            if ref_image_url:
                request["input"]["media"].append({"type": "reference_image", "url": ref_image_url})

        return request

    def _build_wanx_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """Build WanX 2.7 series request."""
        model = params.get("model", "wan2.7-t2v-2026-04-25")
        request = {
            "model": model,
            "input": {
                "prompt": params.get("prompt", ""),
                "negative_prompt": params.get("negative_prompt", ""),
            },
            "parameters": {
                "resolution": params.get("resolution", "720P"),
                "duration": params.get("duration", 5),
                "watermark": params.get("watermark", False),
                "prompt_extend": params.get("prompt_extend", False),
            },
        }

        # Add ratio for T2V
        if "t2v" in model:
            request["parameters"]["ratio"] = params.get("ratio", "16:9")
            request["parameters"]["seed"] = params.get("seed", -1)
            if params.get("auto_background_audio"):
                request["input"]["auto_background_audio"] = True
            if params.get("custom_audio_url"):
                request["input"]["custom_audio_url"] = params["custom_audio_url"]

        # Add media types for I2V
        media = []
        if params.get("first_frame_url"):
            media.append({"type": "first_frame", "url": params["first_frame_url"]})
        if params.get("last_frame_url"):
            media.append({"type": "last_frame", "url": params["last_frame_url"]})
        if params.get("first_clip_url"):
            media.append({"type": "first_clip", "url": params["first_clip_url"]})
        if params.get("audio_url"):
            media.append({"type": "driving_audio", "url": params["audio_url"]})
        if media:
            request["input"]["media"] = media

        # Add reference videos/images for R2V
        ref_videos = params.get("reference_videos", [])
        ref_images = params.get("reference_images", [])
        for video in ref_videos:
            request["input"].setdefault("media", []).append(
                {"type": "reference_video", "url": video["url"]}
            )
        for img in ref_images:
            request["input"].setdefault("media", []).append(
                {"type": "reference_image", "url": img["url"]}
            )

        # Add video for edit
        if params.get("video_url"):
            request["input"].setdefault("media", []).append(
                {"type": "video", "url": params["video_url"]}
            )
        if params.get("reference_image_url"):
            request["input"].setdefault("media", []).append(
                {"type": "reference_image", "url": params["reference_image_url"]}
            )

        return request

    def _build_generic_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """Generic fallback request builder."""
        return {
            "model": params.get("model", ""),
            "input": {
                "prompt": params.get("prompt", ""),
            },
            "parameters": {
                "resolution": params.get("resolution", "720P"),
                "duration": params.get("duration", 5),
            },
        }

    def parse_response(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """
        Parse DashScope response.

        Returns unified format with task_id for async tasks.
        """
        output = raw_response.get("output", {})
        return {
            "task_id": output.get("task_id", ""),
            "request_id": raw_response.get("request_id", ""),
            "status": output.get("task_status", "UNKNOWN"),
        }

    async def poll_task(self, task_id: str) -> dict[str, Any]:
        """
        Poll DashScope task until completion.

        Uses polling config from paramsSchema if available.
        """
        params_schema = self.config.get("paramsSchema") or {}
        polling = params_schema.get("polling", {})
        interval_ms = polling.get("intervalMs", 15000)
        max_attempts = polling.get("maxAttempts", 120)

        poll_url = self.POLL_URL.format(task_id=task_id)
        headers = self.build_headers()

        for attempt in range(max_attempts):
            async with self.http.get(poll_url, headers=headers) as resp:
                data = resp.json()
                status = data.get("output", {}).get("task_status", "UNKNOWN")

                if status == "SUCCEEDED":
                    return self._extract_results(data)
                elif status in ("FAILED", "CANCELLED"):
                    raise TaskFailedException(status, data)

                await asyncio.sleep(interval_ms / 1000)

        raise TaskTimeoutException(task_id)

    def _extract_results(self, data: dict[str, Any]) -> dict[str, Any]:
        """Extract video URLs from successful response."""
        results = data.get("output", {}).get("results", [])
        videos = [r.get("url", "") for r in results if r.get("url")]
        return {
            "status": "succeeded",
            "videos": videos,
            "task_id": data.get("output", {}).get("task_id", ""),
        }

    async def submit_task(self, request: dict[str, Any]) -> str:
        """
        Submit async task and return task_id.
        """
        headers = self.build_headers()
        resp = await self.http.post(
            self.SUBMIT_URL,
            json=request,
            headers=headers,
        )
        data = resp.json()
        if resp.status_code != 200:
            raise AdapterError(f"DashScope submit failed: {data}")
        return data.get("output", {}).get("task_id", "")

    async def generate(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Full generate pipeline: submit -> poll -> parse.
        """
        request = self.convert_request(params)
        task_id = await self.submit_task(request)
        return await self.poll_task(task_id)