"""
Service factory — creates the right service instance from a ModelRegistry.

Usage:
    registry = ModelRegistry(resolved_config)
    catalog = CapabilityCatalog.from_file("model/config/capabilities.yaml")
    factory = ModelServiceFactory(registry, catalog)
    service = factory.for_type(ModelType.T2I)
"""

from ..types import ModelType, ModelConfigEntry, ConfigurationError
from ..catalog import CapabilityCatalog


class ModelServiceFactory:
    """
    Factory that dispatches model_type → concrete service instance.
    Services are created on-demand (no caching — caller manages lifecycle).
    """

    def __init__(self, registry: "ModelRegistry", catalog: CapabilityCatalog | None = None):
        self.registry = registry
        self._catalog = catalog

    def for_type(self, model_type: ModelType):
        """
        Return the appropriate service instance for model_type.

        Raises:
            ConfigurationError: if no entry is configured for that type,
                               or if no service exists for the provider.
        """
        entries = self.registry.get(model_type)
        # Handle list format (multiple entries)
        if isinstance(entries, list):
            if len(entries) == 0:
                raise ConfigurationError(f"No config entry for model type '{model_type.value}'")
            # Use the first entry for service creation
            entry = entries[0]
        else:
            entry = entries
            if entry is None:
                raise ConfigurationError(f"No config entry for model type '{model_type.value}'")

        provider = entry.provider.lower()

        # ---- LLM ---------------------------------------------------------------
        if model_type == ModelType.LLM:
            if provider == "bailian":
                from .llm_service import BailianLLMService
                return BailianLLMService(entry)
            if provider in ("deepseek", "openai", "siliconflow"):
                from ...services.llm_service import OpenAILLMService
                return OpenAILLMService(entry.api_key, entry.endpoint or "", entry.model)
            if provider == "anthropic":
                from ...services.llm_service import AnthropicLLMService
                return AnthropicLLMService(entry.api_key, entry.endpoint or "", entry.model)

        # ---- T2I ---------------------------------------------------------------
        if model_type == ModelType.T2I:
            if provider == "wanx":
                from ...services.t2i_service import Wan26T2IService
                return Wan26T2IService(api_key=entry.api_key or "", model_name=entry.model)
            if provider == "comfyui":
                from ...services.t2i_service import ComfyUIT2IService
                return ComfyUIT2IService(endpoint=entry.endpoint or "", api_key=entry.api_key)
            if provider == "volc":
                from ..services.t2i_service import VolcT2IService
                return VolcT2IService(entry, self._catalog)

        # ---- I2V ---------------------------------------------------------------
        if model_type == ModelType.I2V:
            if provider == "wanx":
                from ..services.i2v_service import WanxI2VService
                return WanxI2VService(entry, self._catalog)
            if provider == "volc":
                from ..services.i2v_service import VolcI2VService
                return VolcI2VService(entry, self._catalog)

        # ---- TTS ---------------------------------------------------------------
        if model_type == ModelType.TTS:
            if provider == "volc":
                from ..services.tts_service import VolcTTSService
                return VolcTTSService(entry, self._catalog)

        raise ConfigurationError(
            f"No service implementation for provider '{provider}' "
            f"with model type '{model_type.value}'"
        )


def create_service(registry: "ModelRegistry", model_type: ModelType):
    """Convenience wrapper."""
    return ModelServiceFactory(registry).for_type(model_type)