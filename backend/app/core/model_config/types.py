"""
Model types and Pydantic data models for the multi-model config system.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ModelType(str, Enum):
    """Unified model type taxonomy covering all AI capabilities."""
    LLM = "llm"          # 大语言模型
    T2I = "t2i"          # 文生图
    T2V = "t2v"          # 文生视频
    I2V_FF = "i2v_ff"    # 图生视频-首帧
    I2V_FFLF = "i2v_fflf"  # 图生视频-首尾帧
    VIDEO_EDIT = "video_edit"  # 视频编辑
    VIDEO_EXTEND = "video_extend"  # 视频续写
    R2V = "r2v"          # 参考生视频
    A2V = "a2v"          # 音频驱动
    TTS = "tts"          # 文本转语音
    COMFYUI = "comfyui"  # ComfyUI 工作流
    I2V = "i2v"          # 图生视频 (legacy alias)


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
    display_name: str | None = Field(default=None, description="Custom display name for the model")
    api_key: str | None = Field(default=None, description="API key; supports ${ENV_VAR} syntax")
    endpoint: str | None = Field(default=None, description="Override API endpoint")
    timeout: float = Field(default=60.0, ge=0, description="Request timeout in seconds")
    extra: dict[str, Any] = Field(default_factory=dict, description="Capability-validated parameters")
    test_passed: bool = Field(default=False, description="Whether the connection test passed")


class ModelRegistry(BaseModel):
    """
    Per-project model registry.
    Holds a list of configured models for each model type slot.
    """
    llm: list[ModelConfigEntry] = Field(default_factory=list)
    t2i: list[ModelConfigEntry] = Field(default_factory=list)
    t2v: list[ModelConfigEntry] = Field(default_factory=list)
    i2v_ff: list[ModelConfigEntry] = Field(default_factory=list)
    i2v_fflf: list[ModelConfigEntry] = Field(default_factory=list)
    video_edit: list[ModelConfigEntry] = Field(default_factory=list)
    video_extend: list[ModelConfigEntry] = Field(default_factory=list)
    r2v: list[ModelConfigEntry] = Field(default_factory=list)
    a2v: list[ModelConfigEntry] = Field(default_factory=list)
    tts: list[ModelConfigEntry] = Field(default_factory=list)
    comfyui: list[ModelConfigEntry] = Field(default_factory=list)
    i2v: list[ModelConfigEntry] = Field(default_factory=list)  # legacy alias

    def get(self, model_type: ModelType) -> list[ModelConfigEntry]:
        """Get the entries for a given model type."""
        return getattr(self, model_type.value, [])

    def get_by_model(self, model_type: ModelType, model: str) -> ModelConfigEntry | None:
        """Get a specific entry by model identifier."""
        for entry in self.get(model_type):
            if entry.model == model:
                return entry
        return None

    def update_entry(self, model_type: ModelType, entry: ModelConfigEntry) -> None:
        """Update or append an entry for the given model type."""
        entries = self.get(model_type)
        for i, e in enumerate(entries):
            if e.model == entry.model:
                entries[i] = entry
                return
        entries.append(entry)
        setattr(self, model_type.value, entries)

    def remove_entry(self, model_type: ModelType, model: str) -> bool:
        """Remove an entry by model identifier. Returns True if found and removed."""
        entries = self.get(model_type)
        for i, e in enumerate(entries):
            if e.model == model:
                entries.pop(i)
                setattr(self, model_type.value, entries)
                return True
        return False


class ResolvedConfig(BaseModel):
    """
    Fully resolved config after merging all hierarchy layers.
    Includes the validated capability schema for each model type.
    """
    llm: list[ModelConfigEntry] = Field(default_factory=list)
    t2i: list[ModelConfigEntry] = Field(default_factory=list)
    t2v: list[ModelConfigEntry] = Field(default_factory=list)
    i2v_ff: list[ModelConfigEntry] = Field(default_factory=list)
    i2v_fflf: list[ModelConfigEntry] = Field(default_factory=list)
    video_edit: list[ModelConfigEntry] = Field(default_factory=list)
    video_extend: list[ModelConfigEntry] = Field(default_factory=list)
    r2v: list[ModelConfigEntry] = Field(default_factory=list)
    a2v: list[ModelConfigEntry] = Field(default_factory=list)
    tts: list[ModelConfigEntry] = Field(default_factory=list)
    comfyui: list[ModelConfigEntry] = Field(default_factory=list)
    i2v: list[ModelConfigEntry] = Field(default_factory=list)  # legacy alias


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