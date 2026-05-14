"""
Model types and Pydantic data models for the multi-model config system.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ModelType(str, Enum):
    """Unified model type taxonomy covering all AI capabilities."""
    LLM = "llm"      # 大语言模型
    T2I = "t2i"      # 文生图
    I2V = "i2v"      # 图生视频
    TTS = "tts"      # 文本转语音


class BaseService(ABC):
    """Shared abstract base for all model services."""

    @abstractmethod
    async def generate(self, prompt: str, **kwargs: Any) -> str:
        """
        Generate output and return local storage path.
        Subclasses may accept additional kwargs (image_path, text, etc.).
        """
        raise NotImplementedError


class ModelConfigEntry(BaseModel):
    """
    Per-model-type configuration entry.

    Corresponds to one slot in ModelRegistry (llm / t2i / i2v / tts).
    """
    provider: str = Field(description="Provider identifier: bailian | wanx | volc")
    model: str = Field(description="Model identifier, e.g. qwen-max, wan2.7-image")
    api_key: str | None = Field(default=None, description="API key; supports ${ENV_VAR} syntax")
    endpoint: str | None = Field(default=None, description="Override API endpoint")
    timeout: float = Field(default=60.0, ge=0, description="Request timeout in seconds")
    extra: dict[str, Any] = Field(default_factory=dict, description="Capability-validated parameters")


class ModelRegistry(BaseModel):
    """
    Per-project model registry.
    Holds the selected provider+model for each model type slot.
    """
    llm: ModelConfigEntry | None = Field(default=None)
    t2i: ModelConfigEntry | None = Field(default=None)
    i2v: ModelConfigEntry | None = Field(default=None)
    tts: ModelConfigEntry | None = Field(default=None)

    def get(self, model_type: ModelType) -> ModelConfigEntry | None:
        """Get the entry for a given model type."""
        return getattr(self, model_type.value, None)


class ResolvedConfig(BaseModel):
    """
    Fully resolved config after merging all hierarchy layers.
    Includes the validated capability schema for each model type.
    """
    llm: ModelConfigEntry | None = Field(default=None)
    t2i: ModelConfigEntry | None = Field(default=None)
    i2v: ModelConfigEntry | None = Field(default=None)
    tts: ModelConfigEntry | None = Field(default=None)


class CapabilityParam(BaseModel):
    """Schema for a single capability parameter."""
    type: str = Field(description="Parameter type: float | int | str | bool")
    range: list[float | int] | None = Field(default=None, description="Min/max for numeric types")
    options: list[str] | None = Field(default=None, description="Allowed string values")
    default: Any = Field(default=None, description="Default value if not provided")


class CapabilitySchema(BaseModel):
    """Schema for all parameters supported by a single model."""
    type: ModelType = Field(description="Model type: llm | t2i | i2v | tts")
    provider: str = Field(description="Provider identifier")
    params: dict[str, CapabilityParam] = Field(default_factory=dict)


class ConfigurationError(ValueError):
    """Raised when config resolution or validation fails."""
    pass


class CapabilityError(ValueError):
    """Raised when a parameter value violates the capability schema."""
    pass