"""
T2I Services — Volc Seedream + existing Wanx/ComfyUI.

VolcT2IService wraps the 火山引擎 Seedream 4.5 image generation API.
"""

import os
import uuid
import httpx
from typing import Any

from ..types import ModelConfigEntry, BaseService
from ..catalog import CapabilityCatalog

FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")
ASSETS_DIR = os.path.join(FILE_STORAGE_PATH, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)


class VolcT2IService(BaseService):
    """
    Text-to-Image service backed by 火山引擎 Seedream 4.5.

    Args:
        entry: ModelConfigEntry with provider="volc", model="seedream-4.5"

    Capabilities (from capabilities.yaml):
      - style: realistic | anime | watercolor | ink
      - resolution: 1024x1024 | 1536x1536 | 2048x2048
    """

    DEFAULT_ENDPOINT = "https://visual.volc.com/api/v1"

    def __init__(self, entry: ModelConfigEntry, catalog: CapabilityCatalog | None = None):
        self.entry = entry
        self.endpoint = (entry.endpoint or self.DEFAULT_ENDPOINT).rstrip("/") + "/image/generation"
        self.api_key = entry.api_key or ""
        self.model = entry.model
        self.extra = dict(entry.extra)
        self._catalog = catalog

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        """
        Generate an image and save to ASSETS_DIR.

        Args:
            prompt: Image generation prompt.
            style: Overrides extra["style"].
            resolution: Overrides extra["resolution"].

        Returns:
            Relative path: /uploads/assets/{uuid}.png
        """
        params = {**self.extra, **kwargs}

        if self._catalog:
            params, _warnings = self._catalog.ensure_capability(
                params, "volc", "seedream-4.5"
            )

        style = params.get("style", "realistic")
        resolution = params.get("resolution", "1024x1024")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "style": style,
            "resolution": resolution,
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"VolcT2I API error {response.status_code}: {response.text}")

        result = await response.json()
        image_url = self._extract_image_url(result)
        return await self._download_and_save(image_url, ".png")

    def _extract_image_url(self, result: dict) -> str:
        if "data" in result and result["data"]:
            item = result["data"][0]
            return item.get("url") or item.get("image_url") or item.get("image")
        if "image_url" in result:
            return result["image_url"]
        if "url" in result:
            return result["url"]
        raise RuntimeError(f"VolcT2I: no image URL in response: {result}")

    async def _download_and_save(self, url: str, ext: str) -> str:
        db_id = str(uuid.uuid4())
        file_name = f"{db_id}{ext}"
        file_path = os.path.join(ASSETS_DIR, file_name)

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(resp.content)

        return f"/uploads/assets/{file_name}"