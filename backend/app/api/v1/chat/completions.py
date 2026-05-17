"""
Chat Completions API — /api/v1/chat/completions
OpenAI-compatible chat completions endpoint.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import get_adapter, AdapterError
from app.core.db import get_db_cursor

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionsRequest(BaseModel):
    model_id: str
    messages: list[ChatMessage]
    temperature: float | None = 0.7
    max_tokens: int | None = 1024
    stream: bool | None = False
    stop: str | None = None


class ChatCompletionsResponse(BaseModel):
    success: bool
    id: str | None = None
    content: str | None = None
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


@router.post("/completions", response_model=ChatCompletionsResponse)
async def chat_completions(req: ChatCompletionsRequest):
    """OpenAI-compatible chat completions endpoint."""
    start = time.time()
    try:
        config = _get_model_config(req.model_id)
        adapter = get_adapter(config)

        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        params = {
            "model": config.get("modelId", ""),
            "messages": messages,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "stream": req.stream,
            "stop": req.stop,
        }

        result = await adapter.generate(params)

        latency_ms = int((time.time() - start) * 1000)
        content = ""
        if result.get("choices"):
            content = result["choices"][0].get("message", {}).get("content", "")

        return ChatCompletionsResponse(
            success=True,
            id=result.get("id"),
            content=content,
            latency_ms=latency_ms,
        )

    except AdapterError as e:
        latency_ms = int((time.time() - start) * 1000)
        return ChatCompletionsResponse(success=False, error=str(e), latency_ms=latency_ms)
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return ChatCompletionsResponse(success=False, error=str(e), latency_ms=latency_ms)