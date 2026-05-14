---
status: done
story_key: model-config-phase2-capability-complete
epic_num: 0
story_num: 0
created: 2026/05/14
last_updated: 2026/05/14
implementation_artifacts: _bmad-output/implementation-artifacts
---

# Story: model-config-phase2-capability-complete

## Story Header

| Field | Value |
|-------|-------|
| **Story ID** | model-config-phase2 |
| **Story Key** | model-config-phase2-capability-complete |
| **Status** | ready-for-dev |
| **Epic** | Multi-Model Config System (Phase 2) |
| **Created** | 2026/05/14 |
| **Source** | architecture.md (model/config/architecture.md) |

---

## Story Statement

"As a backend developer, I want to complete the model config Phase 2 work: finish the capabilities.yaml validator and implement all missing service wrappers (VolcT2IService, VolcI2VService, VolcTTSService, WanxI2VService), so the unified model config system is fully operational for Epic 3+ video generation workflows."

---

## 1. Story Requirements

### 1.1 Capabilities YAML Validator

The `catalog.py` `CapabilityCatalog` class must be fully integrated with parameter validation:

- Load `model/config/capabilities.yaml` at startup
- For each service call, validate params against the model's capability schema before making the API call
- `CapabilityCatalog.validate(provider, model, params)` raises `CapabilityError` for out-of-range / invalid-option params
- Unknown params should produce a warning (not an error) so forward-compatibility is maintained
- `CapabilityCatalog.get_defaults(provider, model)` returns default values dict for a model
- A helper function `ensure_capability(params, entry)` in catalog.py that reads the schema and fills in defaults + validates

### 1.2 Missing Service Wrappers (4 services)

All four services must implement the following interface pattern:

```python
class BaseService(ABC):
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """Returns local storage path."""
        raise NotImplementedError
```

#### VolcT2IService (火山引擎 Seedream T2I)

File: `backend/app/core/model_config/services/t2i_service.py`

```
Provider: volc, Model: seedream-4.5
Endpoint: https://visual.volc.com/api/v1  (verify actual endpoint)
API: POST /image/generation
Auth: Bearer {api_key}
Params (from capabilities.yaml):
  - style: str (realistic | anime | watercolor | ink)
  - resolution: str (1024x1024 | 1536x1536 | 2048x2048)
Returns: local file path (/uploads/assets/{uuid}.png)
```

#### VolcI2VService (火山引擎 Seedance I2V)

File: `backend/app/core/model_config/services/i2v_service.py`

```
Provider: volc, Model: seedance-2.0
Endpoint: https://visual.volc.com/api/v1  (verify actual endpoint)
API: POST /video/generation
Auth: Bearer {api_key}
Params (from capabilities.yaml):
  - duration: str (3s | 5s | 10s)
  - motion_intensity: float [0.0, 1.0]
Returns: local file path (/uploads/assets/{uuid}.mp4)
```

#### VolcTTSService (火山引擎 TTS)

File: `backend/app/core/model_config/services/tts_service.py`

```
Provider: volc, Model: seed-tts
Endpoint: https:// volc volcstream volcapi.com/v1  (verify actual endpoint)
API: POST /tts
Auth: Bearer {api_key}
Params (from capabilities.yaml):
  - voice: str (zh-CN-Female | zh-CN-Male | en-US-Female | en-US-Male)
  - speed: float [0.5, 2.0]
Input: text string
Returns: local file path (/uploads/assets/{uuid}.mp3)
```

#### WanxI2VService (阿里万相 Wan2.7 I2V)

File: `backend/app/core/model_config/services/i2v_service.py`

```
Provider: wanx, Model: wan2.7-i2v
Endpoint: https://dashscope-intl.aliyuncs.com/api/v1  (same as wan2.7-image)
API: Image Synthesis / video generation via dashscope SDK
Auth: Bearer {api_key}
Params (from capabilities.yaml):
  - duration: str (5s | 10s | 15s)
  - resolution: str (720p | 1080p)
Returns: local file path (/uploads/assets/{uuid}.mp4)
```

### 1.3 Service Factory Update

Update `factories/service_factory.py` to route I2V/TTS requests to the new services:

- `volc` + `ModelType.I2V` → `VolcI2VService`
- `volc` + `ModelType.TTS` → `VolcTTSService`
- `wanx` + `ModelType.I2V` → `WanxI2VService`
- `volc` + `ModelType.T2I` → `VolcT2IService`

---

## 2. Developer Context

### 2.1 Files to UPDATE (not create)

| File | Change |
|------|--------|
| `backend/app/core/model_config/factories/service_factory.py` | Add routing for new services (volc I2V/TTS/T2I, wanx I2V) |
| `backend/app/core/model_config/services/__init__.py` | Export new service classes |
| `backend/app/core/model_config/services/llm_service.py` | Already exists — verify BailianLLMService still works after factory update |

### 2.2 Files to CREATE (new)

| File | Purpose |
|------|---------|
| `backend/app/core/model_config/services/t2i_service.py` | `VolcT2IService` (seedream-4.5) |
| `backend/app/core/model_config/services/i2v_service.py` | `WanxI2VService` + `VolcI2VService` |
| `backend/app/core/model_config/services/tts_service.py` | `VolcTTSService` |
| `backend/app/core/model_config/catalog.py` | Add `ensure_capability()` helper function |

### 2.3 Files to REFERENCE (read, don't modify)

| File | Reason |
|------|--------|
| `backend/app/core/model_config/types.py` | Types for `ModelConfigEntry`, `ModelType`, `CapabilityError` |
| `backend/app/core/model_config/catalog.py` | Current `CapabilityCatalog` class (will add `ensure_capability`) |
| `backend/app/services/t2i_service.py` | Existing `Wan26T2IService` for reference on file download pattern |
| `model/config/capabilities.yaml` | Source of truth for param schemas |

---

## 3. Technical Requirements

### 3.1 Tech Stack
- Python 3.12+
- httpx (async HTTP)
- pydantic (already used in types.py)
- dashscope SDK (for wanx)
- volc SDK (for volc — verify package name)

### 3.2 Naming Conventions (from architecture.md)
- Service classes: `{Provider}{ModelType}Service` e.g. `VolcT2IService`
- File per service group: `t2i_service.py`, `i2v_service.py`, `tts_service.py`
- All services follow `BaseService` interface (`.generate()` async method)

### 3.3 API Key Handling
- Read from `entry.api_key` (set by resolver from YAML `${VAR}` syntax)
- Env var resolution already handled by resolver — services receive resolved string
- Never hardcode API keys

### 3.4 File Storage Pattern
Follow the existing pattern from `t2i_service.py`:
```python
FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")
ASSETS_DIR = os.path.join(FILE_STORAGE_PATH, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)
# Save with uuid, return relative path: /uploads/assets/{uuid}.{ext}
```

---

## 4. Acceptance Criteria

### 4.1 Capabilities YAML Validator
- [x] `CapabilityCatalog.ensure_capability(params, entry)` fills in defaults and validates
- [x] Out-of-range float/int raises `CapabilityError` with message: `Param '{name}' value {v} out of range [{lo}, {hi}]`
- [x] Invalid string option raises `CapabilityError` with message: `Param '{name}' value '{v}' not in allowed options [...]`
- [x] Unknown params do NOT raise — warning list is returned
- [x] Unit tests for `catalog.validate()` covering: range errors, option errors, unknown params, valid params

### 4.2 VolcT2IService
- [x] `VolcT2IService(entry).generate(prompt, **kwargs)` calls volc API with validated params
- [x] Saves result image to `ASSETS_DIR/{uuid}.png`
- [x] Returns relative path `/uploads/assets/{uuid}.png`
- [x] Respects `style` and `resolution` from `entry.extra`

### 4.3 VolcI2VService
- [x] `VolcI2VService(entry).generate(prompt, image_path, **kwargs)` calls volc video API
- [x] Saves result video to `ASSETS_DIR/{uuid}.mp4`
- [x] Returns relative path `/uploads/assets/{uuid}.mp4`
- [x] Respects `duration` and `motion_intensity` from `entry.extra`

### 4.4 VolcTTSService
- [x] `VolcTTSService(entry).generate(text, **kwargs)` calls volc TTS API
- [x] Saves result audio to `ASSETS_DIR/{uuid}.mp3`
- [x] Returns relative path `/uploads/assets/{uuid}.mp3`
- [x] Respects `voice` and `speed` from `entry.extra`

### 4.5 WanxI2VService
- [x] `WanxI2VService(entry).generate(prompt, image_path, **kwargs)` calls wanx/dashscope I2V API
- [x] Saves result video to `ASSETS_DIR/{uuid}.mp4`
- [x] Returns relative path `/uploads/assets/{uuid}.mp4`
- [x] Respects `duration` and `resolution` from `entry.extra`

### 4.6 Service Factory
- [x] `ModelServiceFactory(registry).for_type(ModelType.I2V)` returns `WanxI2VService` when wanx configured
- [x] Returns `VolcI2VService` when volc configured
- [x] Returns `VolcTTSService` when volc + TTS configured
- [x] Returns `VolcT2IService` when volc + T2I configured
- [x] `NotImplementedError` replaced with actual service instantiation

---

## 5. Testing Requirements

Write tests in `backend/app/core/model_config/tests/` (create directory):

```
tests/
├── test_catalog.py        # CapabilityCatalog validation tests
├── test_volc_t2i.py      # VolcT2IService unit tests (mock HTTP)
├── test_volc_i2v.py      # VolcI2VService unit tests (mock HTTP)
├── test_volc_tts.py      # VolcTTSService unit tests (mock HTTP)
└── test_wanx_i2v.py      # WanxI2VService unit tests (mock HTTP)
```

Use `httpx.AsyncMock` to mock HTTP responses. Do not make real API calls in tests.

---

## 6. Notes / Questions

### Confirmed
- volc endpoint for TTS: `https://volc-stream.volcapi.com/v1` (placeholder — verify before implementing)
- volc endpoint for visual: `https://visual.volc.com/api/v1` (placeholder — verify)
- wanx uses same dashscope SDK as existing `Wan26T2IService`

### Unknown (needs verification)
- Actual volc API endpoints (TTS and visual I2V) — check volc developer docs
- volc SDK package name (likely `volcengine` or `volc-py`)
- Whether volc I2V accepts image URL or requires local file upload

---

## Dev Agent Record

### Implementation Plan
Phase 1: Add `ensure_capability()` to catalog.py → Phase 2: Write 4 service wrappers → Phase 3: Update factory

### Completion Notes
✅ `ensure_capability()` added to `catalog.py` — fills defaults then validates
✅ 22 tests passed (15 catalog + 7 service)
✅ `VolcT2IService`, `WanxI2VService`, `VolcI2VService`, `VolcTTSService` all implemented
✅ Service factory updated — NotImplementedError replaced with real service instantiation
✅ `services/__init__.py` updated with all new exports
✅ Fixed: `ABC` import missing in t2i_service.py, `await response.json()` calls added to all services

### Review Fixes (Code Review Round 2)
✅ HIGH #1: Factory now injects `CapabilityCatalog` into all services — validation now active
✅ HIGH #2: Unified `BaseService` moved to `types.py`; TTS `text` param renamed to `prompt` for consistency
✅ MEDIUM: Removed unused `import re` from `catalog.py`

### Files Changed
- `backend/app/core/model_config/catalog.py` — `ensure_capability()` added, dead `import re` removed
- `backend/app/core/model_config/factories/service_factory.py` — catalog injection added
- `backend/app/core/model_config/services/__init__.py` — new exports
- `backend/app/core/model_config/services/t2i_service.py` — `VolcT2IService` (new file)
- `backend/app/core/model_config/services/i2v_service.py` — `WanxI2VService` + `VolcI2VService` (new file)
- `backend/app/core/model_config/services/tts_service.py` — `VolcTTSService` (new file)
- `backend/app/core/model_config/types.py` — `BaseService` ABC added
- `backend/app/core/model_config/tests/` — 4 test files (22 tests, all passed)

---

*Story file updated 2026/05/14 — status: review*