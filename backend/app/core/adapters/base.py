"""
Base adapter for AI model providers.
All provider-specific adapters inherit from ModelAdapter.
"""

import json
import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


class AdapterError(Exception):
    """Base exception for adapter errors."""
    pass


class TaskFailedException(AdapterError):
    """Raised when an async task fails."""
    def __init__(self, status: str, data: dict[str, Any]):
        self.status = status
        self.data = data
        super().__init__(f"Task failed with status: {status}")


class TaskTimeoutException(AdapterError):
    """Raised when an async task times out."""
    def __init__(self, task_id: str):
        self.task_id = task_id
        super().__init__(f"Task {task_id} timed out")


class ModelAdapter(ABC):
    """
    Abstract base for model provider adapters.

    Subclasses must implement:
    - convert_request(): Transform unified request to provider-specific format
    - parse_response(): Transform provider response to unified format
    - build_headers(): Build HTTP headers for the request
    """

    def __init__(
        self,
        config: dict[str, Any],
        http_client: httpx.AsyncClient | None = None,
    ):
        self.config = config
        self.api_key = config.get("apiKey", "") or config.get("api_key", "")
        self.endpoint = config.get("endpoint", "")
        self.timeout = config.get("timeout", 30)
        self.retry_times = config.get("retryTimes", 3)
        self.custom_headers = config.get("customHeaders") or {}
        self._http: httpx.AsyncClient | None = http_client

    @property
    def http(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=self.timeout)
        return self._http

    @abstractmethod
    def convert_request(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Convert unified request parameters to provider-specific format.
        Uses Jinja2 template rendering internally.
        """
        raise NotImplementedError

    @abstractmethod
    def parse_response(self, raw_response: dict[str, Any]) -> dict[str, Any]:
        """Parse provider response into unified format."""
        raise NotImplementedError

    def build_headers(self) -> dict[str, str]:
        """Build common HTTP headers. Override per-provider for auth specifics."""
        headers = {
            "Content-Type": "application/json",
            **self.custom_headers,
        }
        return headers

    async def close(self):
        """Close the HTTP client."""
        if self._http:
            await self._http.aclose()
            self._http = None

    async def handle_stream(
        self,
        response: httpx.Response,
    ) -> AsyncIterator[str]:
        """
        Handle SSE stream responses.
        Yields lines with proper SSE formatting.
        """
        async for line in response.aiter_lines():
            if not line.strip():
                continue
            yield f"{line}\n\n"