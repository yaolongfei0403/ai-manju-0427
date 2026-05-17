"""
Adapter factory — returns the appropriate adapter based on protocol.
"""

from typing import Any
from .base import ModelAdapter
from .dashscope import DashscopeAdapter
from .volcengine_ark import VolcengineArkAdapter
from .comfyui import ComfyuiAdapter
from .openai_like import OpenAILikeAdapter

ADAPTER_MAP: dict[str, type[ModelAdapter]] = {
    "dashscope": DashscopeAdapter,
    "volcengine_ark": VolcengineArkAdapter,
    "comfyui": ComfyuiAdapter,
    "openai": OpenAILikeAdapter,
    "siliconflow": OpenAILikeAdapter,
}


def get_adapter(config: dict[str, Any]) -> ModelAdapter:
    """
    Factory function to get the appropriate adapter for a model config.

    Args:
        config: Model configuration dict with at least 'protocol' field

    Returns:
        An instance of the appropriate ModelAdapter subclass

    Raises:
        ValueError: If protocol is not supported
    """
    protocol = config.get("protocol", "custom")
    if protocol in ADAPTER_MAP:
        return ADAPTER_MAP[protocol](config)
    # Fallback: try custom adapter
    if protocol == "custom":
        return OpenAILikeAdapter(config)
    raise ValueError(f"Unsupported protocol: {protocol}")


__all__ = [
    "ModelAdapter",
    "DashscopeAdapter",
    "VolcengineArkAdapter",
    "ComfyuiAdapter",
    "OpenAILikeAdapter",
    "get_adapter",
]