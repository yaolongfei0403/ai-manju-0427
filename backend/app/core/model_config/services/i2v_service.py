"""
I2V Services — Wanx Wan2.7-I2V + Volc Seedance 2.0.

Both services generate video from image+prompt and save to ASSETS_DIR.
"""

import os
import uuid
import httpx
from abc import abstractmethod
from typing import Any

from ..types import ModelConfigEntry, BaseService
from ..catalog import CapabilityCatalog

FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")
ASSETS_DIR = os.path.join(FILE_STORAGE_PATH, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# WanxI2VService — 阿里万相 Wan2.7 I2V
# ---------------------------------------------------------------------------

class WanxI2VService(BaseService):
    """
    Image-to-Video backed by 阿里万相 Wan2.7 (dashscope).

    Provider: wanx, Model: wan2.7-i2v
    Capabilities:
      - duration: 5s | 10s | 15s
      - resolution: 720p | 1080p
    """

    def __init__(self, entry: ModelConfigEntry, catalog: CapabilityCatalog | None = None):
        self.entry = entry
        self.endpoint = (
            (entry.endpoint or "https://dashscope-intl.aliyuncs.com/api/v1").rstrip("/")
            + "/image_synthesis/video"
        )
        self.api_key = entry.api_key or ""
        self.model = entry.model
        self.extra = dict(entry.extra)
        self._catalog = catalog

    async def generate(
        self, prompt: str, image_path: str | None = None, **kwargs: Any
    ) -> str:
        """
        Generate video from image + text prompt.

        Args:
            prompt: Motion description / video prompt.
            image_path: Local path to the source image (or URL).
            duration: Overrides extra["duration"].
            resolution: Overrides extra["resolution"].

        Returns:
            Relative path: /uploads/assets/{uuid}.mp4
        """
        params = {**self.extra, **kwargs}

        if self._catalog:
            params, _warnings = self._catalog.ensure_capability(
                params, "wanx", "wan2.7-i2v"
            )

        duration = params.get("duration", "5s")
        resolution = params.get("resolution", "720p")

        # Build request payload for dashscope wanx i2v API
        # Note: actual API shape depends on dashscope SDK version — using common shape
        payload: dict[str, Any] = {
            "model": self.model,
            "input": {
                "prompt": prompt,
                "image": image_path,
            },
            "parameters": {
                "duration": duration,
                "resolution": resolution,
            },
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"WanxI2V API error {response.status_code}: {response.text}")

        result = await response.json()
        video_url = self._extract_video_url(result)
        return await self._download_and_save(video_url, ".mp4")

    def _extract_video_url(self, result: dict) -> str:
        if "output" in result and result["output"]:
            out = result["output"]
            return out.get("video_url") or out.get("url") or out.get("video")
        if "video_url" in result:
            return result["video_url"]
        if "data" in result:
            data = result["data"]
            if isinstance(data, list) and data:
                return data[0].get("video_url") or data[0].get("url") or data[0].get("video")
            if isinstance(data, dict):
                return data.get("video_url") or data.get("url")
        raise RuntimeError(f"WanxI2V: no video URL in response: {result}")

    async def _download_and_save(self, url: str, ext: str) -> str:
        db_id = str(uuid.uuid4())
        file_name = f"{db_id}{ext}"
        file_path = os.path.join(ASSETS_DIR, file_name)

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(resp.content)

        return f"/uploads/assets/{file_name}"


# ---------------------------------------------------------------------------
# VolcI2VService — 火山引擎 Seedance 2.0
# ---------------------------------------------------------------------------

class VolcI2VService(BaseService):
    """
    Image-to-Video backed by 火山引擎 Seedance 2.0.

    Provider: volc, Model: seedance-2.0
    Capabilities:
      - duration: 3s | 5s | 10s
      - motion_intensity: float [0.0, 1.0]
    """

    DEFAULT_ENDPOINT = "https://visual.volc.com/api/v1"

    def __init__(self, entry: ModelConfigEntry, catalog: CapabilityCatalog | None = None):
        self.entry = entry
        self.endpoint = (entry.endpoint or self.DEFAULT_ENDPOINT).rstrip("/") + "/video/generation"
        self.api_key = entry.api_key or ""
        self.model = entry.model
        self.extra = dict(entry.extra)
        self._catalog = catalog

    async def generate(
        self, prompt: str, image_path: str | None = None, **kwargs: Any
    ) -> str:
        """
        Generate video from image + text prompt.

        Args:
            prompt: Motion description.
            image_path: Source image (local path or URL).
            duration: Overrides extra["duration"].
            motion_intensity: Overrides extra["motion_intensity"].

        Returns:
            Relative path: /uploads/assets/{uuid}.mp4
        """
        params = {**self.extra, **kwargs}

        if self._catalog:
            params, _warnings = self._catalog.ensure_capability(
                params, "volc", "seedance-2.0"
            )

        duration = params.get("duration", "5s")
        motion_intensity = params.get("motion_intensity", 0.5)

        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "duration": duration,
            "motion_intensity": float(motion_intensity),
        }

        if image_path:
            payload["image"] = image_path

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"VolcI2V API error {response.status_code}: {response.text}")

        result = await response.json()
        video_url = self._extract_video_url(result)
        return await self._download_and_save(video_url, ".mp4")

    def _extract_video_url(self, result: dict) -> str:
        if "data" in result and result["data"]:
            item = result["data"][0]
            return item.get("video_url") or item.get("url") or item.get("video")
        if "video_url" in result:
            return result["video_url"]
        if "output" in result and result["output"]:
            return result["output"].get("video_url") or result["output"].get("url")
        raise RuntimeError(f"VolcI2V: no video URL in response: {result}")

    async def _download_and_save(self, url: str, ext: str) -> str:
        db_id = str(uuid.uuid4())
        file_name = f"{db_id}{ext}"
        file_path = os.path.join(ASSETS_DIR, file_name)

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(resp.content)

        return f"/uploads/assets/{file_name}"