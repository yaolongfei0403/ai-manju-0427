"""Bailian (阿里百炼) LLM Service — wraps dashscope API for LLM calls."""

import httpx
from typing import Any

from ..types import ModelConfigEntry


class BailianLLMService:
    """
    LLM service backed by 阿里百炼 (dashscope / qwen models).

    Usage:
        entry = ModelConfigEntry(provider="bailian", model="qwen-max", api_key="sk-...")
        service = BailianLLMService(entry)
        result = await service.chat([{"role": "user", "content": "hello"}])
    """

    def __init__(self, entry: ModelConfigEntry):
        self.entry = entry
        self.endpoint = (entry.endpoint or "https://dashscope.aliyuncs.com/api/v1") + "/chat/completions"
        self.model = entry.model
        self.extra = entry.extra

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """
        Call the LLM and return the assistant's reply text.
        """
        temperature = temperature or self.extra.get("temperature", 0.7)
        max_tokens = max_tokens or self.extra.get("max_tokens", 4000)

        headers = {
            "Authorization": f"Bearer {self.entry.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"Bailian API error {response.status_code}: {response.text}")

        result = response.json()
        return result["choices"][0]["message"]["content"]

    async def chat_structured(
        self,
        messages: list[dict[str, str]],
        response_format: type[dict] | None = None,
    ) -> dict[str, Any]:
        """
        Call with structured output (JSON mode). response_format is ignored
        if the model does not support it — the caller should handle parsing.
        """
        temperature = self.extra.get("temperature", 0.7)
        headers = {
            "Authorization": f"Bearer {self.entry.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=self.entry.timeout) as client:
            response = await client.post(self.endpoint, headers=headers, json=payload)

        if response.status_code != 200:
            raise RuntimeError(f"Bailian API error {response.status_code}: {response.text}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        import json
        return json.loads(content)