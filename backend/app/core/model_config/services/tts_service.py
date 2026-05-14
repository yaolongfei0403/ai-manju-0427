"""
TTS Service — Volc Seed-TTS.

Wraps the 火山引擎 text-to-speech API.
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


class VolcTTSService(BaseService):
    """
    Text-to-Speech backed by 火山引擎 Seed-TTS.

    Provider: volc, Model: seed-tts
    Capabilities:
      - voice: zh-CN-Female | zh-CN-Male | en-US-Female | en-US-Male
      - speed: float [0.5, 2.0]
    """

    DEFAULT_ENDPOINT = "https://volc-stream.volcapi.com/v1"

    def __init__(self, entry: ModelConfigEntry, catalog: CapabilityCatalog | None = None):
        self.entry = entry
        self.endpoint = (entry.endpoint or self.DEFAULT_ENDPOINT).rstrip("/") + "/tts"
        self.api_key = entry.api_key or ""
        self.model = entry.model
        self.extra = dict(entry.extra)
        self._catalog = catalog

    async def generate(self, prompt: str, **kwargs: Any) -> str:
        """
        Synthesize speech from text.

        Args:
            text: Text content to synthesize.
            voice: Overrides extra["voice"].
            speed: Overrides extra["speed"].

        Returns:
            Relative path: /uploads/assets/{uuid}.mp3
        """
        params = {**self.extra, **kwargs}

        if self._catalog:
            params, _warnings = self._catalog.ensure_capability(
                params, "volc", "seed-tts"
            )

        voice = params.get("voice", "zh-CN-Female")
        speed = params.get("speed", 1.0)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "input": {"text": prompt},
            "voice": voice,
            "speed": float(speed),
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"VolcTTS API error {response.status_code}: {response.text}")

        result = await response.json()
        audio_url = self._extract_audio_url(result)
        return await self._download_and_save(audio_url, ".mp3")

    def _extract_audio_url(self, result: dict) -> str:
        if "data" in result and result["data"]:
            item = result["data"][0]
            return item.get("audio_url") or item.get("url") or item.get("audio")
        if "audio_url" in result:
            return result["audio_url"]
        if "output" in result and result["output"]:
            return result["output"].get("audio_url") or result["output"].get("url")
        raise RuntimeError(f"VolcTTS: no audio URL in response: {result}")

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