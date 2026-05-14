# Multi-Model Configuration System — Architecture

## 1. Overview

**Goal**: Unified, type-safe, extensible configuration management for all AI models across the platform.

**Supported Platforms**:
- 阿里百炼 (LLM)
- 阿里万相 (WanXiang) — image generation + video generation (I2V)
- 火山引擎 (ByteDance) — Seedream (T2I) + Seedance (I2V)

**Design Principles**:
1. One data structure for all model types (LLM, T2I, I2V, TTS)
2. User-level + Project-level config hierarchy with override priority
3. Built-in Capability Catalog declaring each model's supported parameters
4. Type-safe via Pydantic, extensible via discriminated unions

---

## 2. Model Type Taxonomy

```python
class ModelType(Enum):
    LLM      # 大语言模型
    T2I      # 文生图
    I2V      # 图生视频
    TTS      # 文本转语音
```

Every model entry is typed by `(platform, model_type, model_name)`.

---

## 3. Config Hierarchy

```
System Default         ← backend/app/core/config.py (pydantic BaseSettings)
    ↓ override
User Config            ← ~/.ai_manhua/config.yaml  (global per user)
    ↓ override
Project Config         ← {project}/.ai_manhua/config.yaml  (per project)
    ↓ override
Runtime Override       ← API call kwargs (e.g. temperature=0.9)
```

**Resolution**: Later source wins. All sources are optional; defaults fill gaps.

### 3.1 Config Sources

| Source | Path | Scope |
|--------|------|-------|
| System | `backend/app/core/config.py` | Hard-coded defaults |
| User | `~/.ai_manhua/config.yaml` | User's global API keys / preferences |
| Project | `{project}/.ai_manhua/config.yaml` | Per-project model selection |

### 3.2 Config Format (YAML)

```yaml
# Example: project-level config
provider: baijian  # or wanx, volc

models:
  llm:
    provider: bailian
    model: qwen-max
    api_key: "${BAILIAN_API_KEY}"
    endpoint: "https://dashscope.aliyuncs.com/api/v1"
    temperature: 0.7
    max_tokens: 4000

  t2i:
    provider: wanx
    model: wan2.7-image
    api_key: "${WANX_API_KEY}"
    endpoint: "https://dashscope-intl.aliyuncs.com/api/v1"
    size: "2K"
    n: 1

  i2v:
    provider: wanx
    model: wan2.7-i2v
    api_key: "${WANX_API_KEY}"
    endpoint: "https://dashscope-intl.aliyuncs.com/api/v1"
    duration: "5s"

  tts:
    provider: volc
    model: seed-tts
    api_key: "${VOLC_API_KEY}"
    endpoint: "https:// volc volcstream volcapi.com/v1"
    voice: "zh-CN-Female"
```

---

## 4. Capability Catalog

Each model declares its supported parameters as a schema. The catalog is a YAML file read at startup.

```yaml
# model/config/capabilities.yaml

capabilities:
  bailian:
    qwen-max:
      type: llm
      provider: bailian
      params:
        temperature:
          type: float
          range: [0.0, 2.0]
          default: 0.7
        max_tokens:
          type: int
          range: [128, 32000]
          default: 4000
        top_p:
          type: float
          range: [0.0, 1.0]
          default: 0.9

  wanx:
    wan2.7-image:
      type: t2i
      provider: wanx
      params:
        size:
          type: str
          options: ["2K", "1024x1024", "1536x1536"]
          default: "2K"
        n:
          type: int
          range: [1, 4]
          default: 1
        enable_sequential:
          type: bool
          default: false

    wan2.7-i2v:
      type: i2v
      provider: wanx
      params:
        duration:
          type: str
          options: ["5s", "10s", "15s"]
          default: "5s"
        resolution:
          type: str
          options: ["720p", "1080p"]
          default: "720p"

  volc:
    seedream-4.5:
      type: t2i
      provider: volc
      params:
        style:
          type: str
          options: ["realistic", "anime", "watercolor", "ink"]
          default: "realistic"
        resolution:
          type: str
          options: ["1024x1024", "1536x1536", "2048x2048"]
          default: "1024x1024"

    seedance-2.0:
      type: i2v
      provider: volc
      params:
        duration:
          type: str
          options: ["3s", "5s", "10s"]
          default: "5s"
        motion_intensity:
          type: float
          range: [0.0, 1.0]
          default: 0.5
```

---

## 5. Core Data Models (Pydantic)

### 5.1 ModelConfigEntry

```python
class ModelConfigEntry(BaseModel):
    provider: str                          # bailian | wanx | volc
    model: str                             # model identifier
    api_key: SecretStr | None = None      # resolved from env var
    endpoint: str | None = None           # overrideable
    timeout: float = 60.0
    extra: dict[str, Any] = {}             # capability-validated params
```

### 5.2 ModelRegistry

```python
class ModelRegistry(BaseModel):
    llm: ModelConfigEntry | None = None
    t2i: ModelConfigEntry | None = None
    i2v: ModelConfigEntry | None = None
    tts: ModelConfigEntry | None = None
```

### 5.3 ResolvedConfig

Final resolved config after merge, includes a `capability` field with validated params.

---

## 6. Directory Structure

```
backend/app/core/
├── config.py                  # System defaults (existing)
└── model_config/
    ├── __init__.py
    ├── types.py               # ModelType enum, capability schemas
    ├── catalog.py             # CapabilityCatalog class (loads YAML)
    ├── resolver.py            # ConfigHierarchyResolver (user → project → system)
    ├── registry.py            # ModelRegistry (per-project config store)
    ├── services/
    │   ├── __init__.py
    │   ├── llm_service.py     # BailianLLMService
    │   ├── t2i_service.py    # WanxT2IService, VolcT2IService
    │   ├── i2v_service.py    # WanxI2VService, VolcI2VService
    │   └── tts_service.py    # VolcTTSService
    └── factories/
        ├── __init__.py
        └── service_factory.py # create_service(registry, model_type) → BaseService
```

---

## 7. Config Resolver Algorithm

```
1. Load system defaults from config.py
2. Load ~/.ai_manhua/config.yaml  → merge over system
3. Load {project}/.ai_manhua/config.yaml → merge over user
4. For each model_type (llm/t2i/i2v/tts):
     a. Get provider from resolved config
     b. Load capability schema from catalog
     c. Validate resolved params against capability schema
     d. Warn on unknown params, error on out-of-range params
5. Return ResolvedConfig with validated per-type entries
```

---

## 8. Service Factory

```python
def create_service(registry: ModelRegistry, model_type: ModelType) -> BaseService:
    entry = registry[model_type]
    if entry.provider == "bailian":
        return BailianLLMService(entry)
    if entry.provider == "wanx":
        if model_type == ModelType.T2I:  return WanxT2IService(entry)
        if model_type == ModelType.I2V:  return WanxI2VService(entry)
    if entry.provider == "volc":
        if model_type == ModelType.T2I:  return VolcT2IService(entry)
        if model_type == ModelType.I2V:  return VolcI2VService(entry)
        if model_type == ModelType.TTS:  return VolcTTSService(entry)
    raise ValueError(f"No service for {entry.provider}/{model_type}")
```

Each service wraps the provider SDK and exposes a standard async interface.

---

## 9. Environment Variable Handling

API keys are stored as references in YAML:

```yaml
api_key: "${BAILIAN_API_KEY}"
```

The resolver replaces `${VAR}` patterns with `os.environ.get("VAR")`. Keys that resolve to `None` raise `ConfigurationError` at build time.

---

## 10. Migration Plan

| Phase | Action |
|-------|--------|
| **Phase 1** | Create `model/config/types.py`, `catalog.py`, `resolver.py`, `registry.py` |
| **Phase 2** | Write `capabilities.yaml` for all 3 platforms × 4 model types |
| **Phase 3** | Build service wrappers per platform, refactor existing `llm_service.py` / `t2i_service.py` |
| **Phase 4** | Add `factories/service_factory.py` and wire into existing API routes |
| **Phase 5** | Add user-level config file detection (`~/.ai_manhua/config.yaml`) |

---

*Document created 2026/05/14*