"""
OpenAI-compatible adapter — supports SiliconFlow,方舟LLM, and other OpenAI-compatible APIs.
"""

from typing import Any, AsyncIterator
import json
import httpx
from .base import ModelAdapter


class OpenAILikeAdapter(ModelAdapter):
    """
    Adapter for OpenAI-compatible APIs (SiliconFlow, Ark LLM, etc.).

    Handles:
    - Chat completions (LLM)
    - Image generations (T2I)
    - Streaming responses
    """

    def build_headers(self) -> dict[str, str]:
        headers = super().build_headers()
        headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def convert_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Convert unified request to OpenAI-compatible format.

        Expected params:
            model: str (e.g. "Qwen/Qwen3-235B-A22B", "gpt-4o")
            messages: list[dict] (for LLM)
            prompt: str (for T2I)
            temperature: float (optional, default 0.7)
            top_p: float (optional, default 1.0)
            max_tokens: int (optional, default 1024)
            stream: bool (optional, default False)
            size: str (optional, for T2I, default "1024x1024")
            n: int (optional, for T2I, default 1)
            seed: int (optional)
        """
        params_schema = self.config.get("paramsSchema") or {}
        request_template = params_schema.get("requestTemplate")

        if request_template:
            from jinja2 import Template
            template = Template(str(request_template))
            rendered = template.render(**params)
            return json.loads(rendered)

        model = params.get("model", "")
        request = {
            "model": model,
            "temperature": params.get("temperature", 0.7),
            "top_p": params.get("top_p", 1.0),
            "max_tokens": params.get("max_tokens", 1024),
        }

        # LLM chat completion
        if params.get("messages"):
            request["messages"] = params["messages"]
            if params.get("stream"):
                request["stream"] = True
            if params.get("stop"):
                request["stop"] = params["stop"]
            if params.get("frequency_penalty"):
                request["frequency_penalty"] = params["frequency_penalty"]
            if params.get("presence_penalty"):
                request["presence_penalty"] = params["presence_penalty"]

        # T2I
        elif params.get("prompt"):
            request["prompt"] = params["prompt"]
            request["size"] = params.get("size", "1024x1024")
            request["n"] = params.get("n", 1)
            if params.get("seed", -1) >= 0:
                request["seed"] = params["seed"]

        return request

    def parse_response(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """
        Parse OpenAI-compatible response.

        Returns:
            For non-streaming: {"content": "...", "id": "...", "usage": {...}}
            For streaming: yields line by line in SSE format
        """
        return {
            "id": raw_response.get("id", ""),
            "choices": raw_response.get("choices", []),
            "usage": raw_response.get("usage", {}),
        }

    async def generate(self, params: dict[str, Any]) -> dict[str, Any]:
        """Generate via OpenAI-compatible API."""
        request = self.convert_request(params)
        headers = self.build_headers()

        # Determine endpoint
        model = params.get("model", "")
        if params.get("messages"):
            url = f"{self.endpoint}/chat/completions"
        else:
            url = f"{self.endpoint}/images/generations"

        async with self.http.post(url, json=request, headers=headers) as resp:
            data = resp.json()
            if resp.status_code != 200:
                raise AdapterError(f"OpenAI-like request failed: {data}")
            return self.parse_response(data)

    async def handle_stream(
        self,
        response: httpx.Response,
    ) -> AsyncIterator[str]:
        """
        Handle SSE stream from OpenAI-compatible API.
        Yields SSE-formatted lines.
        """
        async for line in response.aiter_lines():
            if not line.strip():
                continue
            if line.startswith("data: "):
                yield f"{line}\n\n"
            elif line == "data: [DONE]":
                yield "data: [DONE]\n\n"