"""
Volcengine Ark adapter — supports Seedance 2.0 and Seedream.
"""

import asyncio
import json
from typing import Any
import httpx
from jinja2 import Template
from .base import ModelAdapter, TaskFailedException, TaskTimeoutException


class VolcengineArkAdapter(ModelAdapter):
    """
    Adapter for Volcano Engine Ark API (Seedance 2.0, Seedream).

    Handles:
    - T2V (text-to-video)
    - I2V (image-to-video, with FirstFrame/LastFrame)
    - R2V (reference-to-video)
    - Video Edit
    - Video Extend
    - A2V (audio-driven video)
    - T2I (text-to-image with Seedream)
    """

    SUBMIT_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks"
    POLL_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}"
    DELETE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{task_id}"

    def build_headers(self) -> dict[str, str]:
        headers = super().build_headers()
        headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def convert_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Convert unified request to Volcengine Ark format.

        Expected params:
            model: str (e.g. "doubao-seedance-2-0-260128")
            prompt: str
            duration: int (optional, default 5)
            resolution: str (optional, default "1080p")
            aspect_ratio: str (optional, default "16:9")
            seed: int (optional, default -1)
            guidance_scale: float (optional)
            num_inference_steps: int (optional)
            generate_audio: bool (optional)
            return_last_frame: bool (optional)
            first_frame_url: str (optional)
            last_frame_url: str (optional)
            reference_images: list[dict] (optional)
            reference_videos: list[dict] (optional)
            audio_url: str (optional)
        """
        params_schema = self.config.get("paramsSchema") or {}
        request_template = params_schema.get("requestTemplate")

        if request_template:
            template = Template(str(request_template))
            rendered = template.render(**params)
            return json.loads(rendered)

        # Build content array
        content = []
        prompt = params.get("prompt", "")
        if prompt:
            content.append({"type": "text", "text": prompt})

        # FirstFrame image
        if params.get("first_frame_url"):
            content.append({
                "type": "image_url",
                "url": params["first_frame_url"],
                "tag": "FirstFrame",
            })

        # LastFrame image
        if params.get("last_frame_url"):
            content.append({
                "type": "image_url",
                "url": params["last_frame_url"],
                "tag": "LastFrame",
            })

        # Reference images
        for img in params.get("reference_images", []):
            content.append({
                "type": "image_url",
                "url": img["url"],
            })

        # Reference videos
        for vid in params.get("reference_videos", []):
            content.append({
                "type": "video_url",
                "url": vid["url"],
            })

        # Audio
        if params.get("audio_url"):
            content.append({
                "type": "audio_url",
                "url": params["audio_url"],
            })

        # Parameters
        gen_params = {
            "duration": params.get("duration", 5),
            "resolution": params.get("resolution", "1080p"),
            "aspect_ratio": params.get("aspect_ratio", "16:9"),
            "seed": params.get("seed", -1),
        }

        if params.get("guidance_scale"):
            gen_params["guidance_scale"] = params["guidance_scale"]
        if params.get("num_inference_steps"):
            gen_params["num_inference_steps"] = params["num_inference_steps"]
        if params.get("generate_audio"):
            gen_params["generate_audio"] = True
        if params.get("return_last_frame"):
            gen_params["return_last_frame"] = True

        return {
            "model": params.get("model", ""),
            "content": content,
            "parameters": gen_params,
        }

    def parse_response(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse Volcengine Ark response."""
        return {
            "task_id": raw_response.get("id", ""),
            "status": raw_response.get("status", "UNKNOWN"),
        }

    async def poll_task(self, task_id: str) -> dict[str, Any]:
        """Poll Volcengine Ark task until completion."""
        params_schema = self.config.get("paramsSchema") or {}
        polling = params_schema.get("polling", {})
        interval_ms = polling.get("intervalMs", 10000)
        max_attempts = polling.get("maxAttempts", 120)

        poll_url = self.POLL_URL.format(task_id=task_id)
        headers = self.build_headers()

        for attempt in range(max_attempts):
            resp = await self.http.get(poll_url, headers=headers)
            data = resp.json()
            status = data.get("status", "UNKNOWN")

            if status == "succeeded":
                return self._extract_results(data)
            elif status == "failed":
                raise TaskFailedException(status, data)

            await asyncio.sleep(interval_ms / 1000)

        raise TaskTimeoutException(task_id)

    def _extract_results(self, data: dict[str, Any]) -> dict[str, Any]:
        """Extract video URL from successful response."""
        return {
            "status": "succeeded",
            "video_url": data.get("video_url", ""),
            "task_id": data.get("id", ""),
        }

    async def submit_task(self, request: dict[str, Any]) -> str:
        """Submit async task and return task_id."""
        headers = self.build_headers()
        resp = await self.http.post(
            self.SUBMIT_URL,
            json=request,
            headers=headers,
        )
        data = resp.json()
        if resp.status_code not in (200, 201):
            raise AdapterError(f"Ark submit failed: {data}")
        return data.get("id", "")

    async def generate(self, params: dict[str, Any]) -> dict[str, Any]:
        """Full pipeline: submit -> poll -> parse."""
        request = self.convert_request(params)
        task_id = await self.submit_task(request)
        return await self.poll_task(task_id)