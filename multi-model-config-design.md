# 多模型统一配置模块设计文档

> 基于 waoowaoo 架构设计的通用多模型配置系统，适用于 Doubao/Wanxiang/TTS 等模型

---

## 目录

1. [设计目标与概述](#1-设计目标与概述)
2. [核心类型定义](#2-核心类型定义)
3. [模型键设计 (`provider::modelId`)](#3-模型键设计-provider-modelid)
4. [配置层结构](#4-配置层结构)
5. [能力目录系统 (Capability Catalog)](#5-能力目录系统-capability-catalog)
6. [配置服务层](#6-配置服务层)
7. [数据库设计](#7-数据库设计)
8. [验证系统](#8-验证系统)
9. [API 设计](#9-api-设计)
10. [前端集成](#10-前端集成)
11. [完整代码实现](#11-完整代码实现)

---

## 1. 设计目标与概述

### 1.1 核心目标

构建一套**统一、类型安全、可扩展**的多模型配置管理系统，能够：

- 用同一套数据结构和代码路径处理 LLM、文生图、图生视频、TTS 等多种模型
- 支持用户级配置和项目级配置的层级覆盖
- 内置能力目录（Capability Catalog），声明每个模型的可用参数选项
- 支持严格验证和自动补全，确保配置合法性的同时提升 UX

### 1.2 模型类型

```typescript
type UnifiedModelType = 'llm' | 'image' | 'video' | 'audio' | 'tts'
```

| 类型 | 用途 | 代表模型 |
|------|------|---------|
| `llm` | 大语言模型（对话/推理） | Doubao-seed, Doubao-pro |
| `image` | 文生图/图像生成 | Wanxiang 超拟真, Wanxiang 基础 |
| `video` | 图生视频/文生视频 | Doubao-seedance |
| `audio` | 语音合成/TTS | Doubao-tts, Wanxiang-tts |
| `tts` | 文本转语音（口语） | Doubao-tts-pro |

### 1.3 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 UI 层                           │
│   (模型选择器、参数配置面板、能力选项卡)                       │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      配置服务层                             │
│   config-service.ts: getUserModelConfig()                    │
│   config-service.ts: getProjectModelConfig()                │
│   config-service.ts: resolveModelCapabilityGenerationOptions│
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     API 配置层                              │
│   api-config.ts: resolveModelSelection()                    │
│   api-config.ts: getProviderConfig()                         │
│   api-config.ts: getModelsByType()                          │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                   能力目录层                                 │
│   catalog.ts: findBuiltinCapabilities()                     │
│   lookup.ts: resolveGenerationOptionsForModel()             │
│   model-config-contract.ts: validateModelCapabilities()     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    数据库层                                  │
│   user_preferences: 用户级配置                               │
│   projects: 项目级配置                                       │
│   (customModels, customProviders JSON 字段)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心类型定义

### 2.1 文件：`src/lib/model-config-contract.ts`

```typescript
// ============================================================
// 基础类型定义
// ============================================================

/**
 * 统一模型类型枚举
 * 所有模型，无论 LLM 还是生成模型，都抽象为这 5 种类型
 */
export type UnifiedModelType =
  | 'llm'      // 大语言模型
  | 'image'    // 图像生成
  | 'video'    // 视频生成
  | 'audio'    // 通用音频（含 TTS）
  | 'tts'      // 文本转语音（专门场景）

/**
 * 能力值类型：string | number | boolean
 * 用于描述模型能力选项的值
 */
export type CapabilityValue = string | number | boolean

/**
 * 能力选项值类型别名
 */
export type CapabilityOptionValue = CapabilityValue

/**
 * 能力选项选择记录
 * 结构: { "provider::modelId": { "fieldName": value } }
 *
 * 示例:
 * {
 *   "doubao::doubao-seed-2-0-pro-260215": {
 *     "reasoningEffort": "medium"
 *   },
 *   "wanxiang::wan2.6-i2v-flash": {
 *     "resolution": "720p",
 *     "duration": 6
 *   }
 * }
 */
export type CapabilitySelections = Record<string, Record<string, CapabilityValue>>

// ============================================================
// 验证相关类型
// ============================================================

/**
 * 能力验证错误码
 */
export type CapabilityValidationCode =
  | 'CAPABILITY_SHAPE_INVALID'       // 能力对象结构非法
  | 'CAPABILITY_NAMESPACE_INVALID'   // 命名空间不合法
  | 'CAPABILITY_FIELD_INVALID'       // 字段名不合法
  | 'CAPABILITY_VALUE_NOT_ALLOWED'   // 选项值不在允许列表中

/**
 * 单个验证问题
 */
export interface CapabilityValidationIssue {
  code: CapabilityValidationCode
  field: string              // 错误字段路径，如 "capabilities.video.durationOptions"
  message: string            // 人类可读的错误描述
  allowedValues?: readonly CapabilityOptionValue[]  // 该字段允许的值列表
}

/**
 * 能力字段的国际化配置
 */
export interface CapabilityFieldI18n {
  labelKey?: string          // 字段标签的 i18n key，如 "model.capability.duration"
  unitKey?: string           // 单位标签的 i18n key，如 "video.unit.second"
  optionLabelKeys?: Record<string, string>  // 选项值到 i18n key 的映射
}

/**
 * 所有能力字段的 i18n 配置
 * 结构: { fieldName: CapabilityFieldI18n }
 */
export type CapabilityFieldI18nMap = Record<string, CapabilityFieldI18n>

// ============================================================
// 各模型类型的能力定义
// ============================================================

/**
 * LLM 模型能力
 * - reasoningEffortOptions: 推理投入级别选项
 */
export interface LLMCapabilities {
  reasoningEffortOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

/**
 * 图像模型能力
 * - resolutionOptions: 支持的分辨率选项
 */
export interface ImageCapabilities {
  resolutionOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

/**
 * 视频模型能力
 * - generationModeOptions: 生成模式（normal/firstlastframe）
 * - generateAudioOptions: 是否支持生成音频
 * - durationOptions: 时长选项（秒）
 * - fpsOptions: 帧率选项
 * - resolutionOptions: 分辨率选项
 * - firstlastframe: 是否支持首尾帧模式
 * - supportGenerateAudio: 是否支持音频生成
 */
export interface VideoCapabilities {
  generationModeOptions?: string[]
  generateAudioOptions?: boolean[]
  durationOptions?: number[]
  fpsOptions?: number[]
  resolutionOptions?: string[]
  firstlastframe?: boolean
  supportGenerateAudio?: boolean
  fieldI18n?: CapabilityFieldI18nMap
}

/**
 * 音频模型能力（通用）
 * - voiceOptions: 音色选项
 * - rateOptions: 语速选项
 */
export interface AudioCapabilities {
  voiceOptions?: string[]
  rateOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

/**
 * TTS 模型能力
 * - voiceOptions: 音色选项
 * - languageOptions: 语言选项
 * - speedOptions: 速度选项
 */
export interface TTSCapabilities {
  voiceOptions?: string[]
  languageOptions?: string[]
  speedOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

/**
 * 完整模型能力集合
 */
export interface ModelCapabilities {
  llm?: LLMCapabilities
  image?: ImageCapabilities
  video?: VideoCapabilities
  audio?: AudioCapabilities
  tts?: TTSCapabilities
}

// ============================================================
// 模型键相关类型
// ============================================================

/**
 * 解析后的模型键
 */
export interface ParsedModelKey {
  provider: string     // 提供商 ID，如 "doubao", "wanxiang"
  modelId: string      // 模型 ID，如 "doubao-seed-2-0-pro-260215"
  modelKey: string     // 完整键，格式为 "provider::modelId"
}

/**
 * 从复合键 provider::modelId 组合完整模型键
 */
export function composeModelKey(provider: string, modelId: string): string {
  const providerValue = provider.trim()
  const modelValue = modelId.trim()
  if (!providerValue || !modelValue) return ''
  return `${providerValue}::${modelValue}`
}

/**
 * 严格解析模型键
 * - 必须包含 :: 分隔符
 * - provider 和 modelId 都不能为空
 * - 返回 null 表示解析失败（而非抛出异常）
 */
export function parseModelKeyStrict(key: string | null | undefined): ParsedModelKey | null {
  if (!key || typeof key !== 'string') return null
  const raw = key.trim()
  if (!raw) return null
  const markerIndex = raw.indexOf('::')
  if (markerIndex === -1) return null
  const provider = raw.slice(0, markerIndex).trim()
  const modelId = raw.slice(markerIndex + 2).trim()
  if (!provider || !modelId) return null
  return {
    provider,
    modelId,
    modelKey: `${provider}::${modelId}`,
  }
}

/**
 * 判断字符串是否为合法的模型键
 */
export function isModelKey(value: string | null | undefined): boolean {
  return !!parseModelKeyStrict(value)
}
```

---

## 3. 模型键设计 (`provider::modelId`)

### 3.1 设计原则

1. **唯一性**：使用 `::` 作为分隔符，避免 provider 歧义
2. **禁止猜测**：配置中必须显式指定 provider，不允许默认值降级
3. **严格解析**：解析失败返回 `null`，而非抛出异常

### 3.2 模型键格式

```
provider::modelId
```

### 3.3 常见模型键示例

| 模型类型 | Provider | Model ID | 完整键 |
|---------|----------|----------|--------|
| LLM | `doubao` | `doubao-seed-2-0-pro-260215` | `doubao::doubao-seed-2-0-pro-260215` |
| LLM | `doubao` | `doubao-seed-1-8-251228` | `doubao::doubao-seed-1-8-251228` |
| 图像 | `wanxiang` | `wan2.6-i2v-flash` | `wanxiang::wan2.6-i2v-flash` |
| 视频 | `doubao` | `doubao-seedance-1-5-pro-251215` | `doubao::doubao-seedance-1-5-pro-251215` |
| TTS | `doubao` | `doubao-tts-pro` | `doubao::doubao-tts-pro` |
| TTS | `wanxiang` | `wanxiang-tts-001` | `wanxiang::wanxiang-tts-001` |

### 3.4 Provider 标识符约定

| Provider | 标识 | 用途 |
|----------|------|------|
| 字节豆包 | `doubao` | LLM、文生视频、TTS |
| 万相实验室 | `wanxiang` | 文生图、图生视频、TTS |
| 火山引擎 | `ark` | 辅助 API（如 Doubao Seedance 通过 Ark 调用）|

---

## 4. 配置层结构

### 4.1 三层配置优先级

```
项目级配置 (Project Config)
    ↓ 覆盖（项目有则用项目，项目无则用用户级）
用户级配置 (User Config)
    ↓ 覆盖（用户有则用用户，用户无则用内置默认值）
内置默认值 (Builtin Catalog Defaults)
```

### 4.2 配置数据流

```typescript
// 获取项目配置
async function getProjectModelConfig(projectId: string, userId: string): Promise<ProjectModelConfig> {
  const [projectData, userPref] = await Promise.all([
    prisma.project.findUnique({ where: { projectId } }),
    prisma.userPreference.findUnique({ where: { userId } }),
  ])

  return {
    // 分析模型：项目配置 > 用户配置 > null
    analysisModel: extractModelKey(projectData?.analysisModel)
                    || extractModelKey(userPref?.analysisModel)
                    || null,
    // 角色模型：仅项目级
    characterModel: extractModelKey(projectData?.characterModel) || null,
    // ... 其他模型
  }
}
```

### 4.3 配置服务接口 (`src/lib/config-service.ts`)

```typescript
// ============================================================
// 配置服务接口定义
// ============================================================

/**
 * 解析模型复合 Key（严格模式）
 */
export function parseModelKey(key: string | null | undefined): ParsedModelKey | null

/**
 * 组合 provider 与 modelId 为标准复合主键
 */
export function composeModelKey(provider: string, modelId: string): string

/**
 * 从复合 Key 中提取 modelId
 */
export function extractModelId(key: string | null | undefined): string | null

/**
 * 从模型字段中提取标准 modelKey
 */
export function extractModelKey(key: string | null | undefined): string | null

// ============================================================
// 配置数据结构
// ============================================================

/**
 * 项目级模型配置
 * 用于 AI 影视项目的模型配置管理
 */
export interface ProjectModelConfig {
  // 分析模型（LLM）
  analysisModel: string | null   // modelKey 格式
  // 图像模型
  characterModel: string | null   // 角色生成
  locationModel: string | null    // 场景生成
  storyboardModel: string | null  // 分镜生成
  editModel: string | null        // 修图/编辑
  // 视频模型
  videoModel: string | null
  // 音频/TTS 模型
  audioModel: string | null
  ttsModel: string | null
  // 视频参数
  videoRatio: string             // 如 "16:9", "9:16"
  videoResolution: string         // 如 "720p", "1080p"
  artStyle: string | null         // 画面风格
  // 能力配置
  capabilityDefaults: CapabilitySelections   // 用户级能力默认值
  capabilityOverrides: CapabilitySelections // 项目级能力覆盖
}

/**
 * 用户级模型配置
 * 用于无项目时的全局配置
 */
export interface UserModelConfig {
  analysisModel: string | null
  characterModel: string | null
  locationModel: string | null
  storyboardModel: string | null
  editModel: string | null
  videoModel: string | null
  audioModel: string | null
  ttsModel: string | null
  capabilityDefaults: CapabilitySelections
}

// ============================================================
// 配置获取函数
// ============================================================

/**
 * 获取项目级模型配置
 * 优先级：项目配置 > 用户偏好
 */
export async function getProjectModelConfig(
  projectId: string,
  userId: string,
): Promise<ProjectModelConfig>

/**
 * 获取用户级模型配置（无项目时使用）
 */
export async function getUserModelConfig(userId: string): Promise<UserModelConfig>

/**
 * 检查必需的模型配置是否存在
 */
export function checkRequiredModels(
  config: Partial<ProjectModelConfig | UserModelConfig>,
  requiredFields: string[],
): string[]

/**
 * 生成缺失配置的错误消息
 */
export function getMissingConfigError(missingFields: string[]): string

// ============================================================
// 能力选项解析
// ============================================================

/**
 * 解析模型的能力生成选项
 * 优先级（从低到高）：capabilityDefaults < capabilityOverrides < runtimeSelections
 *
 * @param input.modelType - 模型类型
 * @param input.modelKey - 模型键，格式为 provider::modelId
 * @param input.capabilityDefaults - 用户级能力默认值
 * @param input.capabilityOverrides - 项目级能力覆盖
 * @param input.runtimeSelections - 运行时选择
 * @param input.requireAllFields - 是否要求所有字段都必须有值
 */
export function resolveModelCapabilityGenerationOptions(input: {
  modelType: 'llm' | 'image' | 'video' | 'audio' | 'tts'
  modelKey: string
  capabilityDefaults?: CapabilitySelections
  capabilityOverrides?: CapabilitySelections
  runtimeSelections?: Record<string, CapabilityValue>
}): { options: Record<string, CapabilityValue>; issues: CapabilitySelectionValidationIssue[] }

/**
 * 异步版本，用于项目级配置
 */
export async function resolveProjectModelCapabilityGenerationOptions(input: {
  projectId: string
  userId: string
  modelType: 'llm' | 'image' | 'video' | 'audio' | 'tts'
  modelKey: string
  runtimeSelections?: Record<string, CapabilityValue>
}): Promise<Record<string, CapabilityValue>>

/**
 * 为图片类任务统一构建 billingPayload
 */
export async function buildImageBillingPayload(input: {
  projectId: string
  userId: string
  imageModel: string | null
  basePayload: Record<string, unknown>
}): Promise<Record<string, unknown>>

/**
 * 为图片类任务构建 billingPayload（用户级配置，sync）
 */
export function buildImageBillingPayloadFromUserConfig(input: {
  userModelConfig: UserModelConfig
  imageModel: string | null
  basePayload: Record<string, unknown>
}): Record<string, unknown>
```

---

## 5. 能力目录系统 (Capability Catalog)

### 5.1 设计思想

能力目录是**声明式**的模型能力描述文件，定义了每个模型支持的参数选项。

- 存储位置：`standards/capabilities/` 目录下的 JSON 文件
- 运行时加载并缓存，支持热更新
- 自定义模型（不在目录中）会跳过验证，直接透传选项

### 5.2 目录文件格式

**文件**：`standards/capabilities/models.catalog.json`

```json
[
  {
    "modelType": "llm",
    "provider": "doubao",
    "modelId": "doubao-seed-2-0-pro-260215",
    "capabilities": {
      "llm": {
        "reasoningEffortOptions": ["minimal", "low", "medium", "high"],
        "fieldI18n": {
          "reasoningEffort": {
            "labelKey": "model.capability.reasoningEffort"
          }
        }
      }
    }
  },
  {
    "modelType": "llm",
    "provider": "doubao",
    "modelId": "doubao-seed-1-8-251228",
    "capabilities": {
      "llm": {
        "reasoningEffortOptions": ["minimal", "low", "medium", "high"]
      }
    }
  },
  {
    "modelType": "image",
    "provider": "wanxiang",
    "modelId": "wanxiang-ultra-real",
    "capabilities": {
      "image": {
        "resolutionOptions": ["1K", "2K", "4K"],
        "fieldI18n": {
          "resolution": {
            "labelKey": "model.capability.resolution",
            "optionLabelKeys": {
              "1K": "model.resolution.1K",
              "2K": "model.resolution.2K",
              "4K": "model.resolution.4K"
            }
          }
        }
      }
    }
  },
  {
    "modelType": "video",
    "provider": "doubao",
    "modelId": "doubao-seedance-1-5-pro-251215",
    "capabilities": {
      "video": {
        "generationModeOptions": ["normal", "firstlastframe"],
        "generateAudioOptions": [true, false],
        "durationOptions": [4, 5, 6, 7, 8, 9, 10, 11, 12],
        "resolutionOptions": ["480p", "720p", "1080p"],
        "firstlastframe": true,
        "supportGenerateAudio": true
      }
    }
  },
  {
    "modelType": "video",
    "provider": "wanxiang",
    "modelId": "wan2.6-i2v-flash",
    "capabilities": {
      "video": {
        "generationModeOptions": ["normal"],
        "durationOptions": [6, 10],
        "resolutionOptions": ["768p", "1080p"],
        "firstlastframe": false,
        "supportGenerateAudio": false
      }
    }
  },
  {
    "modelType": "tts",
    "provider": "doubao",
    "modelId": "doubao-tts-pro",
    "capabilities": {
      "tts": {
        "voiceOptions": ["azure_male_yu", "azure_female_qing", "doubao_neutral"],
        "languageOptions": ["zh-CN", "en-US"],
        "speedOptions": ["-50%", "0%", "+50%"],
        "fieldI18n": {
          "voice": {
            "labelKey": "model.tts.voice"
          },
          "speed": {
            "labelKey": "model.tts.speed"
          }
        }
      }
    }
  },
  {
    "modelType": "tts",
    "provider": "wanxiang",
    "modelId": "wanxiang-tts-001",
    "capabilities": {
      "tts": {
        "voiceOptions": ["wx_male_01", "wx_female_01", "wx_neutral"],
        "languageOptions": ["zh-CN"],
        "speedOptions": ["0.8x", "1.0x", "1.2x"]
      }
    }
  }
]
```

### 5.3 能力目录服务 (`src/lib/model-capabilities/catalog.ts`)

```typescript
import fs from 'node:fs'
import path from 'node:path'

/**
 * 内置能力目录条目
 */
export interface BuiltinCapabilityCatalogEntry {
  modelType: UnifiedModelType
  provider: string
  modelId: string
  capabilities?: ModelCapabilities
}

/**
 * 目录缓存
 */
interface CatalogCache {
  signature: string                      // 文件签名，用于检测变更
  entries: BuiltinCapabilityCatalogEntry[]
  exact: Map<string, BuiltinCapabilityCatalogEntry>  // 精确索引: "video::doubao::doubao-seedance-1-5-pro-251215"
  byProviderKey: Map<string, BuiltinCapabilityCatalogEntry>  // Provider 模糊索引
}

const CATALOG_DIR = path.resolve(process.cwd(), 'standards/capabilities')
let cache: CatalogCache | null = null

/**
 * Provider 别名映射
 * 用于兼容不同 provider 入口指向同一模型能力
 */
const CAPABILITY_PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  // 示例：如果有 gemini-compatible 指向 google 的情况
  // 'gemini-compatible': 'google',
}

/**
 * 加载并缓存能力目录
 */
function loadCatalog(): CatalogCache {
  // ... 实现见 5.3.1
}

/**
 * 查找模型的能力目录条目（精确匹配）
 */
export function findBuiltinCapabilityCatalogEntry(
  modelType: UnifiedModelType,
  provider: string,
  modelId: string,
): BuiltinCapabilityCatalogEntry | null

/**
 * 查找模型的能力定义
 */
export function findBuiltinCapabilities(
  modelType: UnifiedModelType,
  provider: string,
  modelId: string,
): ModelCapabilities | undefined

/**
 * 列出所有内置能力目录条目（用于管理界面）
 */
export function listBuiltinCapabilityCatalog(): BuiltinCapabilityCatalogEntry[]

/**
 * 重置缓存（仅用于测试）
 */
export function resetBuiltinCapabilityCatalogCacheForTest(): void
```

### 5.4 能力选项解析服务 (`src/lib/model-capabilities/lookup.ts`)

```typescript
// ============================================================
// 类型定义
// ============================================================

export type CapabilitySelectionValidationCode =
  | 'CAPABILITY_SELECTION_INVALID'
  | 'CAPABILITY_MODEL_UNSUPPORTED'
  | 'CAPABILITY_FIELD_INVALID'
  | 'CAPABILITY_VALUE_NOT_ALLOWED'
  | 'CAPABILITY_REQUIRED'

export interface CapabilitySelectionValidationIssue {
  code: CapabilitySelectionValidationCode
  field: string
  message: string
  allowedValues?: readonly CapabilityOptionValue[]
}

export interface CapabilityModelContext {
  modelType: UnifiedModelType
  capabilities?: ModelCapabilities
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 获取模型的能力选项字段
 * 返回结构: { fieldName: [allowedValues] }
 *
 * 示例:
 * getCapabilityOptionFields('video', videoCapabilities)
 * => { generationMode: ['normal', 'firstlastframe'], duration: [4, 5, 6, ...], resolution: ['480p', '720p', '1080p'] }
 */
export function getCapabilityOptionFields(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): Record<string, readonly CapabilityOptionValue[]>

/**
 * 检查模型是否有可配置的能力选项
 */
export function hasCapabilityOptions(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): boolean

/**
 * 验证单个模型的能力选择是否合法
 */
export function validateCapabilitySelectionForModel(input: {
  modelKey: string
  modelType: UnifiedModelType
  capabilities?: ModelCapabilities
  selection?: Record<string, CapabilityValue> | null
  requireAllFields: boolean
}): CapabilitySelectionValidationIssue[]

/**
 * 验证能力选择载荷
 */
export function validateCapabilitySelectionsPayload(
  selections: unknown,
  resolveModelContext: (modelKey: string) => CapabilityModelContext | null,
): CapabilitySelectionValidationIssue[]

/**
 * 核心：解析模型的能力生成选项
 *
 * 优先级（从低到高）：
 * 1. capabilityDefaults（用户级默认）
 * 2. capabilityOverrides（项目级覆盖）
 * 3. runtimeSelections（运行时选择）
 *
 * 对于 image 模型，如果缺少 resolution 且 catalog 有声明，会自动补全为第一个选项值
 *
 * @return { options, issues }
 *   - options: 解析后的能力选项，如 { resolution: '720p', duration: 6 }
 *   - issues: 验证问题列表（有空则正常）
 */
export function resolveGenerationOptionsForModel(input: {
  modelType: UnifiedModelType
  modelKey: string
  capabilities?: ModelCapabilities
  capabilityDefaults?: CapabilitySelections
  capabilityOverrides?: CapabilitySelections
  runtimeSelections?: Record<string, CapabilityValue>
  requireAllFields?: boolean
}): { options: Record<string, CapabilityValue>; issues: CapabilitySelectionValidationIssue[] }

/**
 * 通过 modelKey 解析内置模型上下文
 */
export function resolveBuiltinModelContext(
  modelType: UnifiedModelType,
  modelKey: string,
): CapabilityModelContext | null

/**
 * 通过 modelKey 获取内置模型能力
 */
export function resolveBuiltinCapabilitiesByModelKey(
  modelType: UnifiedModelType,
  modelKey: string,
): ModelCapabilities | undefined
```

---

## 6. 配置服务层

### 6.1 API 配置服务 (`src/lib/api-config.ts`)

```typescript
// ============================================================
// 基础类型定义
// ============================================================

/**
 * 自定义模型
 */
export interface CustomModel {
  modelId: string
  modelKey: string           // provider::modelId
  name: string
  type: UnifiedModelType     // llm | image | video | audio | tts
  provider: string
  llmProtocol?: 'responses' | 'chat-completions'
  llmProtocolCheckedAt?: string
  compatMediaTemplate?: OpenAICompatMediaTemplate
  compatMediaTemplateCheckedAt?: string
  compatMediaTemplateSource?: 'ai' | 'manual'
  price: number
}

export type ModelMediaType = 'llm' | 'image' | 'video' | 'audio' | 'tts'

/**
 * 模型选择结果
 */
export interface ModelSelection {
  provider: string
  modelId: string
  modelKey: string
  mediaType: ModelMediaType
  llmProtocol?: 'responses' | 'chat-completions'
  compatMediaTemplate?: OpenAICompatMediaTemplate
}

// ============================================================
// Provider 配置
// ============================================================

type GatewayRouteType = 'official' | 'openai-compat'

interface CustomProvider {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  apiMode?: 'gemini-sdk' | 'openai-official'
  gatewayRoute?: GatewayRouteType
}

/**
 * Provider 配置（解密后）
 */
export interface ProviderConfig {
  id: string
  name: string
  apiKey: string           // 解密后的 API Key
  baseUrl?: string
  apiMode?: 'gemini-sdk' | 'openai-official'
  gatewayRoute?: GatewayRouteType
}

// ============================================================
// 核心解析函数
// ============================================================

/**
 * 提取 Provider 主键（用于多实例场景）
 * 例如: "gemini-compatible:uuid" -> "gemini-compatible"
 */
export function getProviderKey(providerId?: string): string

/**
 * 统一模型选择解析（严格模式）
 * @param userId - 用户 ID
 * @param model - 模型键，格式为 provider::modelId
 * @param mediaType - 模型媒体类型
 * @throws MODEL_NOT_FOUND - 模型未启用
 */
export async function resolveModelSelection(
  userId: string,
  model: string,
  mediaType: ModelMediaType,
): Promise<ModelSelection>

/**
 * 统一模型选择解析（允许显式 model_key，未传时仅允许单模型）
 */
export async function resolveModelSelectionOrSingle(
  userId: string,
  model: string | null | undefined,
  mediaType: ModelMediaType,
): Promise<ModelSelection>

/**
 * 获取 Provider 配置
 * @throws PROVIDER_NOT_FOUND - Provider 未配置
 * @throws PROVIDER_API_KEY_MISSING - 未配置 API Key
 */
export async function getProviderConfig(
  userId: string,
  providerId: string,
): Promise<ProviderConfig>

/**
 * 获取用户自定义模型列表
 */
export async function getUserModels(userId: string): Promise<CustomModel[]>

/**
 * 获取指定类型模型列表
 */
export async function getModelsByType(
  userId: string,
  type: ModelMediaType,
): Promise<CustomModel[]>

/**
 * 检查用户是否有任意 API 配置
 */
export async function hasApiConfig(userId: string): Promise<boolean>

/**
 * 根据 TTS 模型键获取 API Key
 */
export async function getTTSApiKey(
  userId: string,
  model?: string | null,
): Promise<string>
```

### 6.2 配置验证服务

```typescript
// ============================================================
// 验证函数
// ============================================================

/**
 * 验证模型能力声明是否合法
 * 用于 catalog 加载时的验证
 */
export function validateModelCapabilities(
  modelType: UnifiedModelType,
  capabilities: unknown,
): CapabilityValidationIssue[]

/**
 * 验证单个选项值是否在允许列表中
 */
export function validateOptionValueAgainstAllowed(
  fieldPath: string,
  value: unknown,
  allowedValues: readonly CapabilityOptionValue[],
): CapabilityValidationIssue[]

/**
 * 验证能力选择是否合法
 * 用于运行时验证用户/项目配置
 */
export function validateCapabilitySelectionForModel(input: {
  modelKey: string
  modelType: UnifiedModelType
  capabilities?: ModelCapabilities
  selection?: Record<string, CapabilityValue> | null
  requireAllFields: boolean
}): CapabilitySelectionValidationIssue[]
```

---

## 7. 数据库设计

### 7.1 Prisma Schema

```prisma
// ============================================================
// 用户偏好表（存储用户级配置）
// ============================================================

model UserPreference {
  id              String   @id @default(uuid())
  userId          String   @unique

  // ========== 模型配置 ==========
  // 分析模型（LLM）
  analysisModel   String?

  // 图像模型
  characterModel  String?  // 角色生成模型
  locationModel   String?  // 场景生成模型
  storyboardModel String?  // 分镜图像模型
  editModel       String?  // 修图/编辑模型

  // 视频模型
  videoModel      String?

  // 音频/TTS 模型
  audioModel      String?
  ttsModel        String?

  // ========== 工作流配置 ==========
  analysisConcurrency Int?  // 分析流程并发上限
  imageConcurrency   Int?  // 图像流程并发上限
  videoConcurrency   Int?  // 视频流程并发上限

  // ========== 视频参数 ==========
  videoRatio      String   @default("16:9")
  videoResolution String   @default("720p")
  artStyle        String   @default("realistic")
  ttsRate         String   @default("+0%")
  imageResolution String   @default("2K")

  // ========== 能力配置 ==========
  // JSON 格式存储能力默认值
  // 结构: { "provider::modelId": { "field": value } }
  capabilityDefaults String? @db.Text

  // ========== API Key 配置（精简版） ==========
  doubaoApiKey   String? @db.Text  // Doubao API Key（加密存储）
  wanxiangApiKey String? @db.Text // Wanxiang API Key（加密存储）

  // ========== 自定义配置（JSON） ==========
  // 用户自定义模型列表
  customModels String? @db.Text
  // 用户自定义 Provider 列表
  customProviders String? @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}

// ============================================================
// 项目表（存储项目级配置）
// ============================================================

model Project {
  id           String   @id @default(uuid())
  projectId    String   @unique
  name         String
  description  String?
  mode         String   @default("standard")  // 项目模式
  userId       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastAccessedAt DateTime?

  // ========== 项目级模型配置 ==========
  // 这些字段会覆盖 UserPreference 中的配置
  analysisModel   String?
  characterModel  String?
  locationModel   String?
  storyboardModel String?
  editModel       String?
  videoModel      String?
  audioModel      String?
  ttsModel        String?

  // ========== 项目级视频参数 ==========
  videoRatio      String  @default("16:9")
  videoResolution String  @default("720p")
  artStyle        String  @default("realistic")

  // ========== 项目级能力覆盖 ==========
  // JSON 格式，优先级高于用户级 capabilityDefaults
  capabilityOverrides String? @db.Text

  // ========== 关联 ==========
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation("ProjectToProject", fields: [projectId], references: [id], onDelete: Cascade)
  subProjects Project[] @relation("ProjectToProject")

  @@index([userId])
  @@map("projects")
}

// ============================================================
// 用户表
// ============================================================

model User {
  id            String          @id @default(uuid())
  name          String          @unique
  email         String?
  emailVerified DateTime?
  image         String?
  password      String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  preferences   UserPreference?
  projects      Project[]

  @@map("user")
}
```

### 7.2 自定义模型 JSON 格式

`UserPreference.customModels` 字段存储用户添加的自定义模型：

```json
[
  {
    "modelId": "doubao-seed-2-0-pro-260215",
    "modelKey": "doubao::doubao-seed-2-0-pro-260215",
    "name": "豆包 Pro 2.0",
    "type": "llm",
    "provider": "doubao",
    "llmProtocol": "chat-completions",
    "price": 0
  },
  {
    "modelId": "wan2.6-i2v-flash",
    "modelKey": "wanxiang::wan2.6-i2v-flash",
    "name": "万相 I2V 闪速",
    "type": "video",
    "provider": "wanxiang",
    "price": 0
  },
  {
    "modelId": "doubao-tts-pro",
    "modelKey": "doubao::doubao-tts-pro",
    "name": "豆包 TTS Pro",
    "type": "tts",
    "provider": "doubao",
    "price": 0
  }
]
```

### 7.3 自定义 Provider JSON 格式

`UserPreference.customProviders` 字段存储用户的 API 配置：

```json
[
  {
    "id": "doubao",
    "name": "字节豆包",
    "baseUrl": "https://ark.cn-beijing.volces.com/api/v1",
    "apiKey": "encrypted_api_key_here",
    "apiMode": "openai-official"
  },
  {
    "id": "wanxiang",
    "name": "万相实验室",
    "baseUrl": "https://api.wanx.com/v1",
    "apiKey": "encrypted_api_key_here",
    "apiMode": "openai-official"
  }
]
```

---

## 8. 验证系统

### 8.1 能力声明验证（Catalog 加载时）

```typescript
// 验证模型能力声明
export function validateModelCapabilities(
  modelType: UnifiedModelType,
  capabilities: unknown,
): CapabilityValidationIssue[]

// 规则：
// 1. 能力对象必须为 Record 类型
// 2. 命名空间必须与 modelType 匹配（llm 模型只能有 llm capabilities）
// 3. 字段名必须在允许列表中
// 4. 选项数组必须为非空字符串/数字/布尔数组
```

### 8.2 能力选择验证（运行时）

```typescript
// 验证能力选择
validateCapabilitySelectionForModel({
  modelKey: 'doubao::doubao-seed-2-0-pro-260215',
  modelType: 'llm',
  capabilities: llmCapabilities,
  selection: { reasoningEffort: 'medium' },
  requireAllFields: true,
})

// 返回验证问题列表
// - CAPABILITY_FIELD_INVALID: 字段不支持
// - CAPABILITY_VALUE_NOT_ALLOWED: 值不在允许列表
// - CAPABILITY_REQUIRED: 必填字段缺失
```

---

## 9. API 设计

### 9.1 用户模型管理 API

```typescript
// GET /api/user/models
// 获取用户配置的所有模型
export async function GET(request: Request) {
  const userId = await getUserId(request)
  const models = await getUserModels(userId)
  return Response.json({ models })
}

// POST /api/user/models
// 添加自定义模型
export async function POST(request: Request) {
  const userId = await getUserId(request)
  const body = await request.json()
  // 验证模型数据
  // 追加到 customModels
  return Response.json({ success: true })
}

// DELETE /api/user/models/:modelKey
// 删除自定义模型
export async function DELETE(
  request: Request,
  { params }: { params: { modelKey: string } }
) {
  const userId = await getUserId(request)
  const modelKey = params.modelKey
  // 从 customModels 中移除
  return Response.json({ success: true })
}
```

### 9.2 模型选择 API

```typescript
// GET /api/models/selection?mediaType=llm&model=doubao::doubao-seed-2-0-pro-260215
// 解析模型选择，返回 Provider 配置
export async function GET(request: Request) {
  const userId = await getUserId(request)
  const { searchParams } = new URL(request.url)
  const mediaType = searchParams.get('mediaType') as ModelMediaType
  const model = searchParams.get('model')

  const selection = await resolveModelSelectionOrSingle(userId, model, mediaType)
  const providerConfig = await getProviderConfig(userId, selection.provider)

  return Response.json({
    selection,
    provider: {
      id: providerConfig.id,
      name: providerConfig.name,
      baseUrl: providerConfig.baseUrl,
      // 注意：apiKey 不应返回给前端
    },
  })
}
```

### 9.3 能力选项 API

```typescript
// GET /api/models/capabilities?modelKey=doubao::doubao-seedance-1-5-pro-251215&mediaType=video
// 获取模型的能力选项
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const modelKey = searchParams.get('modelKey')
  const mediaType = searchParams.get('mediaType') as UnifiedModelType

  if (!modelKey || !mediaType) {
    return Response.json({ error: 'modelKey and mediaType are required' }, { status: 400 })
  }

  const parsed = parseModelKeyStrict(modelKey)
  if (!parsed) {
    return Response.json({ error: 'Invalid modelKey format' }, { status: 400 })
  }

  const capabilities = findBuiltinCapabilities(mediaType, parsed.provider, parsed.modelId)
  const optionFields = getCapabilityOptionFields(mediaType, capabilities)

  return Response.json({
    modelKey,
    modelType: mediaType,
    capabilities,
    optionFields,
  })
}
```

---

## 10. 前端集成

### 10.1 模型选择器组件

```tsx
interface ModelSelectorProps {
  mediaType: 'llm' | 'image' | 'video' | 'audio' | 'tts'
  value: string | null           // modelKey
  onChange: (modelKey: string) => void
  configuredModels: CustomModel[] // 已配置模型列表
}

/**
 * 模型选择下拉框
 * - 显示已配置的模型列表
 * - 按 provider 分组
 * - 显示模型名称和类型
 */
function ModelSelector({ mediaType, value, onChange, configuredModels }: ModelSelectorProps) {
  const filteredModels = configuredModels.filter(m => m.type === mediaType)

  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">请选择模型...</option>
      {filteredModels.map(model => (
        <option key={model.modelKey} value={model.modelKey}>
          {model.provider} / {model.name}
        </option>
      ))}
    </select>
  )
}
```

### 10.2 能力参数配置面板

```tsx
interface CapabilityConfigPanelProps {
  modelKey: string
  modelType: UnifiedModelType
  capabilities: ModelCapabilities
  value: Record<string, CapabilityValue>
  onChange: (value: Record<string, CapabilityValue>) => void
}

/**
 * 能力参数配置面板
 * - 根据 modelType 渲染对应字段
 * - 字段类型：select（选项）/ input（文本）/ number（数字）
 * - 支持 i18n 国际化
 */
function CapabilityConfigPanel({ modelKey, modelType, capabilities, value, onChange }: CapabilityConfigPanelProps) {
  const optionFields = getCapabilityOptionFields(modelType, capabilities)

  return (
    <div className="capability-config">
      {Object.entries(optionFields).map(([field, options]) => (
        <div key={field} className="config-field">
          <label>{field}</label>
          <select
            value={value[field] ?? ''}
            onChange={e => onChange({ ...value, [field]: e.target.value })}
          >
            {options.map(opt => (
              <option key={String(opt)} value={String(opt)}>{opt}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
```

### 10.3 配置状态管理

```typescript
// Zustand / Context 状态管理示例
interface ModelConfigState {
  // 模型配置
  analysisModel: string | null
  characterModel: string | null
  // ...
  capabilityDefaults: CapabilitySelections
  capabilityOverrides: CapabilitySelections

  // 方法
  setModel: (field: string, modelKey: string) => void
  setCapability: (modelKey: string, field: string, value: CapabilityValue) => void
  resetToDefaults: () => void
}
```

---

## 11. 完整代码实现

### 11.1 项目结构

```
src/
├── lib/
│   ├── model-config-contract.ts     # 核心类型定义和验证
│   ├── api-config.ts                # API 配置读取
│   ├── config-service.ts            # 配置服务
│   └── model-capabilities/
│       ├── catalog.ts               # 能力目录
│       ├── lookup.ts                # 能力选项解析
│       └── types.ts                 # 能力相关类型
standards/
└── capabilities/
    └── models.catalog.json          # 模型能力目录
```

### 11.2 核心类型定义

**文件**: `src/lib/model-config-contract.ts`

```typescript
// ============================================================
// 统一模型类型
// ============================================================
export type UnifiedModelType = 'llm' | 'image' | 'video' | 'audio' | 'tts'

// ============================================================
// 能力值类型
// ============================================================
export type CapabilityValue = string | number | boolean
export type CapabilityOptionValue = CapabilityValue
export type CapabilitySelections = Record<string, Record<string, CapabilityValue>>

// ============================================================
// 验证错误码
// ============================================================
export type CapabilityValidationCode =
  | 'CAPABILITY_SHAPE_INVALID'
  | 'CAPABILITY_NAMESPACE_INVALID'
  | 'CAPABILITY_FIELD_INVALID'
  | 'CAPABILITY_VALUE_NOT_ALLOWED'

export interface CapabilityValidationIssue {
  code: CapabilityValidationCode
  field: string
  message: string
  allowedValues?: readonly CapabilityOptionValue[]
}

// ============================================================
// i18n 配置
// ============================================================
export interface CapabilityFieldI18n {
  labelKey?: string
  unitKey?: string
  optionLabelKeys?: Record<string, string>
}
export type CapabilityFieldI18nMap = Record<string, CapabilityFieldI18n>

// ============================================================
// 各模型能力定义
// ============================================================
export interface LLMCapabilities {
  reasoningEffortOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

export interface ImageCapabilities {
  resolutionOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

export interface VideoCapabilities {
  generationModeOptions?: string[]
  generateAudioOptions?: boolean[]
  durationOptions?: number[]
  fpsOptions?: number[]
  resolutionOptions?: string[]
  firstlastframe?: boolean
  supportGenerateAudio?: boolean
  fieldI18n?: CapabilityFieldI18nMap
}

export interface AudioCapabilities {
  voiceOptions?: string[]
  rateOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

export interface TTSCapabilities {
  voiceOptions?: string[]
  languageOptions?: string[]
  speedOptions?: string[]
  fieldI18n?: CapabilityFieldI18nMap
}

export interface ModelCapabilities {
  llm?: LLMCapabilities
  image?: ImageCapabilities
  video?: VideoCapabilities
  audio?: AudioCapabilities
  tts?: TTSCapabilities
}

// ============================================================
// 模型键
// ============================================================
export interface ParsedModelKey {
  provider: string
  modelId: string
  modelKey: string
}

// ============================================================
// 能力验证
// ============================================================
export function validateModelCapabilities(
  modelType: UnifiedModelType,
  capabilities: unknown,
): CapabilityValidationIssue[]

// ============================================================
// 模型键操作
// ============================================================
export function composeModelKey(provider: string, modelId: string): string {
  const providerValue = provider.trim()
  const modelValue = modelId.trim()
  if (!providerValue || !modelValue) return ''
  return `${providerValue}::${modelValue}`
}

export function parseModelKeyStrict(key: string | null | undefined): ParsedModelKey | null {
  if (!key || typeof key !== 'string') return null
  const raw = key.trim()
  if (!raw) return null
  const markerIndex = raw.indexOf('::')
  if (markerIndex === -1) return null
  const provider = raw.slice(0, markerIndex).trim()
  const modelId = raw.slice(markerIndex + 2).trim()
  if (!provider || !modelId) return null
  return { provider, modelId, modelKey: `${provider}::${modelId}` }
}

export function isModelKey(value: string | null | undefined): boolean {
  return !!parseModelKeyStrict(value)
}

// ============================================================
// 验证工具函数
// ============================================================
export function validateOptionValueAgainstAllowed(
  fieldPath: string,
  value: unknown,
  allowedValues: readonly CapabilityOptionValue[],
): CapabilityValidationIssue[] {
  if (!allowedValues.includes(value as CapabilityOptionValue)) {
    return [{
      code: 'CAPABILITY_VALUE_NOT_ALLOWED',
      field: fieldPath,
      message: `Value ${String(value)} is not allowed`,
      allowedValues,
    }]
  }
  return []
}
```

### 11.3 能力目录服务

**文件**: `src/lib/model-capabilities/catalog.ts`

```typescript
import fs from 'node:fs'
import path from 'node:path'
import {
  composeModelKey,
  validateModelCapabilities,
  type ModelCapabilities,
  type UnifiedModelType,
} from '@/lib/model-config-contract'

export interface BuiltinCapabilityCatalogEntry {
  modelType: UnifiedModelType
  provider: string
  modelId: string
  capabilities?: ModelCapabilities
}

interface CatalogCache {
  signature: string
  entries: BuiltinCapabilityCatalogEntry[]
  exact: Map<string, BuiltinCapabilityCatalogEntry>
  byProviderKey: Map<string, BuiltinCapabilityCatalogEntry>
}

const CATALOG_DIR = path.resolve(process.cwd(), 'standards/capabilities')
let cache: CatalogCache | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isUnifiedModelType(value: unknown): value is UnifiedModelType {
  return value === 'llm' || value === 'image' || value === 'video'
    || value === 'audio' || value === 'tts'
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getProviderKey(providerId: string): string {
  const marker = providerId.indexOf(':')
  return marker === -1 ? providerId : providerId.slice(0, marker)
}

function cloneCapabilities(capabilities: ModelCapabilities | undefined): ModelCapabilities | undefined {
  if (!capabilities) return undefined
  return JSON.parse(JSON.stringify(capabilities)) as ModelCapabilities
}

function normalizeEntry(raw: unknown, filePath: string, index: number): BuiltinCapabilityCatalogEntry {
  if (!isRecord(raw)) {
    throw new Error(`CAPABILITY_CATALOG_INVALID: ${filePath}#${index} must be object`)
  }

  const modelTypeRaw = raw.modelType
  if (!isUnifiedModelType(modelTypeRaw)) {
    throw new Error(`CAPABILITY_CATALOG_INVALID: ${filePath}#${index} modelType invalid`)
  }

  const provider = readTrimmedString(raw.provider)
  const modelId = readTrimmedString(raw.modelId)
  if (!provider || !modelId) {
    throw new Error(`CAPABILITY_CATALOG_INVALID: ${filePath}#${index} provider/modelId required`)
  }

  const capabilitiesRaw = raw.capabilities
  const capabilityIssues = validateModelCapabilities(modelTypeRaw, capabilitiesRaw)
  if (capabilityIssues.length > 0) {
    const firstIssue = capabilityIssues[0]
    throw new Error(
      `CAPABILITY_CATALOG_INVALID: ${filePath}#${index} ${firstIssue.code} ${firstIssue.field} ${firstIssue.message}`,
    )
  }

  return {
    modelType: modelTypeRaw,
    provider,
    modelId,
    ...(capabilitiesRaw && isRecord(capabilitiesRaw)
      ? { capabilities: capabilitiesRaw as ModelCapabilities }
      : {}),
  }
}

function buildCache(entries: BuiltinCapabilityCatalogEntry[], signature: string): CatalogCache {
  const exact = new Map<string, BuiltinCapabilityCatalogEntry>()
  const byProviderKey = new Map<string, BuiltinCapabilityCatalogEntry>()

  for (const entry of entries) {
    const modelKey = composeModelKey(entry.provider, entry.modelId)
    if (!modelKey) continue

    const exactKey = `${entry.modelType}::${modelKey}`
    if (exact.has(exactKey)) {
      throw new Error(`CAPABILITY_CATALOG_DUPLICATE: ${exactKey}`)
    }
    exact.set(exactKey, entry)

    const providerKey = getProviderKey(entry.provider)
    const fallbackKey = `${entry.modelType}::${providerKey}::${entry.modelId}`
    if (!byProviderKey.has(fallbackKey)) {
      byProviderKey.set(fallbackKey, entry)
    }
  }

  return { signature, entries, exact, byProviderKey }
}

function resolveCatalogFiles(): string[] {
  return fs
    .readdirSync(CATALOG_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(CATALOG_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right))
}

function buildCatalogSignature(files: string[]): string {
  return files
    .map((filePath) => {
      const stat = fs.statSync(filePath)
      return `${filePath}:${stat.mtimeMs}:${stat.size}`
    })
    .join('|')
}

function loadCatalog(): CatalogCache {
  const entries: BuiltinCapabilityCatalogEntry[] = []
  const files = resolveCatalogFiles()

  if (files.length === 0) {
    throw new Error(`CAPABILITY_CATALOG_MISSING: no json file in ${CATALOG_DIR}`)
  }
  const signature = buildCatalogSignature(files)
  if (cache && cache.signature === signature) return cache

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error(`CAPABILITY_CATALOG_INVALID: ${filePath} must be array`)
    }
    for (let index = 0; index < parsed.length; index += 1) {
      entries.push(normalizeEntry(parsed[index], filePath, index))
    }
  }

  cache = buildCache(entries, signature)
  return cache
}

export function listBuiltinCapabilityCatalog(): BuiltinCapabilityCatalogEntry[] {
  return loadCatalog().entries.map((entry) => ({
    ...entry,
    capabilities: cloneCapabilities(entry.capabilities),
  }))
}

const CAPABILITY_PROVIDER_ALIASES: Readonly<Record<string, string>> = {}

export function findBuiltinCapabilityCatalogEntry(
  modelType: UnifiedModelType,
  provider: string,
  modelId: string,
): BuiltinCapabilityCatalogEntry | null {
  const loaded = loadCatalog()
  const modelKey = composeModelKey(provider, modelId)
  if (!modelKey) return null

  const exactKey = `${modelType}::${modelKey}`
  const exactMatch = loaded.exact.get(exactKey)
  if (exactMatch) {
    return { ...exactMatch, capabilities: cloneCapabilities(exactMatch.capabilities) }
  }

  const providerKey = getProviderKey(provider)
  const fallbackKey = `${modelType}::${providerKey}::${modelId}`
  const fallback = loaded.byProviderKey.get(fallbackKey)
  if (fallback) {
    return { ...fallback, capabilities: cloneCapabilities(fallback.capabilities) }
  }

  const aliasTarget = CAPABILITY_PROVIDER_ALIASES[providerKey]
  if (aliasTarget) {
    const aliasKey = `${modelType}::${aliasTarget}::${modelId}`
    const aliasMatch = loaded.byProviderKey.get(aliasKey)
    if (aliasMatch) {
      return { ...aliasMatch, capabilities: cloneCapabilities(aliasMatch.capabilities) }
    }
  }

  return null
}

export function findBuiltinCapabilities(
  modelType: UnifiedModelType,
  provider: string,
  modelId: string,
): ModelCapabilities | undefined {
  return findBuiltinCapabilityCatalogEntry(modelType, provider, modelId)?.capabilities
}

export function resetBuiltinCapabilityCatalogCacheForTest() {
  cache = null
}
```

### 11.4 能力选项解析

**文件**: `src/lib/model-capabilities/lookup.ts`

```typescript
import {
  parseModelKeyStrict,
  type CapabilitySelections,
  type CapabilityValue,
  type CapabilityOptionValue,
  type ModelCapabilities,
  type UnifiedModelType,
} from '@/lib/model-config-contract'
import { findBuiltinCapabilities, findBuiltinCapabilityCatalogEntry } from '@/lib/model-capabilities/catalog'

export type CapabilitySelectionValidationCode =
  | 'CAPABILITY_SELECTION_INVALID'
  | 'CAPABILITY_MODEL_UNSUPPORTED'
  | 'CAPABILITY_FIELD_INVALID'
  | 'CAPABILITY_VALUE_NOT_ALLOWED'
  | 'CAPABILITY_REQUIRED'

export interface CapabilitySelectionValidationIssue {
  code: CapabilitySelectionValidationCode
  field: string
  message: string
  allowedValues?: readonly CapabilityOptionValue[]
}

export interface CapabilityModelContext {
  modelType: UnifiedModelType
  capabilities?: ModelCapabilities
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isCapabilityValue(value: unknown): value is CapabilityValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function getNamespaceCapabilities(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): Record<string, unknown> | null {
  if (!capabilities) return null
  const namespace = capabilities[modelType]
  if (!namespace || !isRecord(namespace)) return null
  return namespace
}

export function getCapabilityOptionFields(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): Record<string, readonly CapabilityOptionValue[]> {
  const namespace = getNamespaceCapabilities(modelType, capabilities)
  if (!namespace) return {}

  const fields: Record<string, readonly CapabilityOptionValue[]> = {}
  for (const [key, rawValue] of Object.entries(namespace)) {
    if (!key.endsWith('Options')) continue
    if (!Array.isArray(rawValue)) continue
    if (rawValue.length === 0) continue
    if (!rawValue.every((item) => isCapabilityValue(item))) continue
    const field = key.slice(0, -'Options'.length)
    fields[field] = rawValue as CapabilityOptionValue[]
  }
  return fields
}

export function hasCapabilityOptions(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): boolean {
  return Object.keys(getCapabilityOptionFields(modelType, capabilities)).length > 0
}

export function validateCapabilitySelectionForModel(input: {
  modelKey: string
  modelType: UnifiedModelType
  capabilities?: ModelCapabilities
  selection?: Record<string, CapabilityValue> | null
  requireAllFields: boolean
}): CapabilitySelectionValidationIssue[] {
  const issues: CapabilitySelectionValidationIssue[] = []
  const optionFields = getCapabilityOptionFields(input.modelType, input.capabilities)
  const optionFieldNames = new Set(Object.keys(optionFields))
  const selection = input.selection || {}

  if (Object.keys(optionFields).length === 0) {
    if (Object.keys(selection).length > 0) {
      issues.push({
        code: 'CAPABILITY_FIELD_INVALID',
        field: `capabilities.${input.modelKey}`,
        message: 'model has no configurable capability options',
      })
    }
    return issues
  }

  for (const [field, value] of Object.entries(selection)) {
    if (!optionFieldNames.has(field)) {
      issues.push({
        code: 'CAPABILITY_FIELD_INVALID',
        field: `capabilities.${input.modelKey}.${field}`,
        message: `field ${field} is not supported by model ${input.modelKey}`,
      })
      continue
    }

    const allowedValues = optionFields[field]
    if (!allowedValues.includes(value)) {
      issues.push({
        code: 'CAPABILITY_VALUE_NOT_ALLOWED',
        field: `capabilities.${input.modelKey}.${field}`,
        message: `value ${String(value)} is not allowed`,
        allowedValues,
      })
    }
  }

  if (input.requireAllFields) {
    for (const field of Object.keys(optionFields)) {
      if (selection[field] === undefined) {
        issues.push({
          code: 'CAPABILITY_REQUIRED',
          field: `capabilities.${input.modelKey}.${field}`,
          message: `field ${field} is required for model ${input.modelKey}`,
          allowedValues: optionFields[field],
        })
      }
    }
  }

  return issues
}

function pickSelectionForModel(
  selections: CapabilitySelections | undefined,
  modelKey: string,
): Record<string, CapabilityValue> | undefined {
  if (!selections) return undefined
  const selected = selections[modelKey]
  if (!selected || !isRecord(selected)) return undefined

  const normalized: Record<string, CapabilityValue> = {}
  for (const [field, rawValue] of Object.entries(selected)) {
    if (!isCapabilityValue(rawValue)) continue
    normalized[field] = rawValue
  }
  return normalized
}

export function resolveGenerationOptionsForModel(input: {
  modelType: UnifiedModelType
  modelKey: string
  capabilities?: ModelCapabilities
  capabilityDefaults?: CapabilitySelections
  capabilityOverrides?: CapabilitySelections
  runtimeSelections?: Record<string, CapabilityValue>
  requireAllFields?: boolean
}): { options: Record<string, CapabilityValue>; issues: CapabilitySelectionValidationIssue[] } {
  const defaults = pickSelectionForModel(input.capabilityDefaults, input.modelKey)
  const overrides = pickSelectionForModel(input.capabilityOverrides, input.modelKey)
  const runtime = input.runtimeSelections

  // 合并优先级：defaults < overrides < runtime
  const merged: Record<string, CapabilityValue> = {}
  if (defaults) for (const [k, v] of Object.entries(defaults)) merged[k] = v
  if (overrides) for (const [k, v] of Object.entries(overrides)) merged[k] = v
  if (runtime) for (const [k, v] of Object.entries(runtime)) merged[k] = v

  // 自定义模型（不在 catalog 中）：跳过验证
  if (input.capabilities === undefined) {
    return { options: { ...merged }, issues: [] }
  }

  // 预检验证
  const precheckIssues = validateCapabilitySelectionForModel({
    modelKey: input.modelKey,
    modelType: input.modelType,
    capabilities: input.capabilities,
    selection: merged,
    requireAllFields: input.requireAllFields ?? true,
  })

  let normalizedSelection = { ...merged }

  // Image 模型自动补全 resolution
  if (input.modelType === 'image') {
    const optionFields = getCapabilityOptionFields(input.modelType, input.capabilities)
    const hasResolutionOptions = Array.isArray(optionFields.resolution) && optionFields.resolution.length > 0
    const hasResolutionInSelection = Object.prototype.hasOwnProperty.call(normalizedSelection, 'resolution')

    if (hasResolutionOptions && !hasResolutionInSelection) {
      const firstResolution = optionFields.resolution[0]
      const missingResolutionIssue = precheckIssues.find(
        (issue) =>
          issue.code === 'CAPABILITY_REQUIRED'
          && issue.field === `capabilities.${input.modelKey}.resolution`,
      )

      if (missingResolutionIssue && optionFields.resolution.includes(firstResolution)) {
        normalizedSelection = { ...normalizedSelection, resolution: firstResolution }
      }
    }
  }

  // 最终验证
  const issues = validateCapabilitySelectionForModel({
    modelKey: input.modelKey,
    modelType: input.modelType,
    capabilities: input.capabilities,
    selection: normalizedSelection,
    requireAllFields: input.requireAllFields ?? true,
  })

  if (issues.length > 0) {
    return { options: {}, issues }
  }

  const optionFields = getCapabilityOptionFields(input.modelType, input.capabilities)
  const options: Record<string, CapabilityValue> = {}
  for (const field of Object.keys(optionFields)) {
    const value = normalizedSelection[field]
    if (value !== undefined) {
      options[field] = value
    }
  }

  return { options, issues: [] }
}

export function resolveBuiltinModelContext(
  modelType: UnifiedModelType,
  modelKey: string,
): CapabilityModelContext | null {
  const parsed = parseModelKeyStrict(modelKey)
  if (!parsed) return null
  const entry = findBuiltinCapabilityCatalogEntry(modelType, parsed.provider, parsed.modelId)
  if (!entry) return null
  return {
    modelType: entry.modelType,
    capabilities: entry.capabilities,
  }
}

export function resolveBuiltinCapabilitiesByModelKey(
  modelType: UnifiedModelType,
  modelKey: string,
): ModelCapabilities | undefined {
  const parsed = parseModelKeyStrict(modelKey)
  if (!parsed) return undefined
  return findBuiltinCapabilities(modelType, parsed.provider, parsed.modelId)
}
```

### 11.5 API 配置服务

**文件**: `src/lib/api-config.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { decryptApiKey } from '@/lib/crypto-utils'
import {
  composeModelKey,
  parseModelKeyStrict,
  type UnifiedModelType,
} from '@/lib/model-config-contract'

export interface CustomModel {
  modelId: string
  modelKey: string
  name: string
  type: UnifiedModelType
  provider: string
  llmProtocol?: 'responses' | 'chat-completions'
  llmProtocolCheckedAt?: string
  price: number
}

export type ModelMediaType = 'llm' | 'image' | 'video' | 'audio' | 'tts'

export interface ModelSelection {
  provider: string
  modelId: string
  modelKey: string
  mediaType: ModelMediaType
  llmProtocol?: 'responses' | 'chat-completions'
}

type GatewayRouteType = 'official' | 'openai-compat'

interface CustomProvider {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  apiMode?: 'gemini-sdk' | 'openai-official'
  gatewayRoute?: GatewayRouteType
}

type LlmProtocolType = 'responses' | 'chat-completions'

function normalizeProviderBaseUrl(providerId: string, rawBaseUrl?: string): string | undefined {
  // Provider 特定的 baseUrl 规范化
  const providerKey = getProviderKey(providerId)
  const baseUrl = typeof rawBaseUrl === 'string' ? rawBaseUrl.trim() : ''
  if (!baseUrl) return undefined

  if (providerKey === 'doubao') {
    return 'https://ark.cn-beijing.volces.com/api/v1'
  }
  if (providerKey === 'wanxiang') {
    return 'https://api.wanx.com/v1'
  }
  return baseUrl
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isUnifiedModelType(value: unknown): value is UnifiedModelType {
  return value === 'llm' || value === 'image' || value === 'video'
    || value === 'audio' || value === 'tts'
}

function isGatewayRoute(value: unknown): value is GatewayRouteType {
  return value === 'official' || value === 'openai-compat'
}

function isLlmProtocol(value: unknown): value is LlmProtocolType {
  return value === 'responses' || value === 'chat-completions'
}

function assertModelKey(value: string, field: string): { provider: string; modelId: string; modelKey: string } {
  const parsed = parseModelKeyStrict(value)
  if (!parsed) {
    throw new Error(`MODEL_KEY_INVALID: ${field} must be provider::modelId`)
  }
  return parsed
}

function parseCustomProviders(rawProviders: string | null | undefined): CustomProvider[] {
  if (!rawProviders) return []

  let parsedUnknown: unknown
  try {
    parsedUnknown = JSON.parse(rawProviders)
  } catch {
    throw new Error('PROVIDER_PAYLOAD_INVALID: customProviders is not valid JSON')
  }

  if (!Array.isArray(parsedUnknown)) {
    throw new Error('PROVIDER_PAYLOAD_INVALID: customProviders must be an array')
  }

  const providers: CustomProvider[] = []
  for (let index = 0; index < parsedUnknown.length; index += 1) {
    const raw = parsedUnknown[index]
    if (!isRecord(raw)) {
      throw new Error(`PROVIDER_PAYLOAD_INVALID: providers[${index}] must be an object`)
    }

    const id = readTrimmedString(raw.id)
    const name = readTrimmedString(raw.name)
    if (!id || !name) {
      throw new Error(`PROVIDER_PAYLOAD_INVALID: providers[${index}] missing id or name`)
    }
    const normalizedId = id.toLowerCase()
    if (providers.some((provider) => provider.id.toLowerCase() === normalizedId)) {
      throw new Error(`PROVIDER_DUPLICATE: providers[${index}].id duplicates id ${id}`)
    }

    providers.push({
      id,
      name,
      baseUrl: readTrimmedString(raw.baseUrl) || undefined,
      apiKey: readTrimmedString(raw.apiKey) || undefined,
      apiMode: raw.apiMode === 'gemini-sdk' || raw.apiMode === 'openai-official'
        ? raw.apiMode : undefined,
      gatewayRoute: isGatewayRoute(raw.gatewayRoute) ? raw.gatewayRoute : undefined,
    })
  }

  return providers
}

function normalizeStoredModel(raw: unknown, index: number): CustomModel {
  if (!isRecord(raw)) {
    throw new Error(`MODEL_PAYLOAD_INVALID: models[${index}] must be an object`)
  }

  if (!isUnifiedModelType(raw.type)) {
    throw new Error(`MODEL_TYPE_INVALID: models[${index}].type is invalid`)
  }

  const providerFromField = readTrimmedString(raw.provider)
  const modelIdFromField = readTrimmedString(raw.modelId)
  const modelKeyFromField = readTrimmedString(raw.modelKey)

  const parsedFromKey = modelKeyFromField ? parseModelKeyStrict(modelKeyFromField) : null
  const provider = providerFromField || parsedFromKey?.provider || ''
  const modelId = modelIdFromField || parsedFromKey?.modelId || ''
  const modelKey = composeModelKey(provider, modelId)

  if (!modelKey) {
    throw new Error(`MODEL_KEY_INVALID: models[${index}] must include provider and modelId`)
  }

  if (parsedFromKey && parsedFromKey.modelKey !== modelKey) {
    throw new Error(`MODEL_KEY_MISMATCH: models[${index}].modelKey conflicts with provider/modelId`)
  }

  const llmProtocolRaw = raw.llmProtocol
  let llmProtocol: LlmProtocolType | undefined
  if (llmProtocolRaw !== undefined && llmProtocolRaw !== null) {
    if (!isLlmProtocol(llmProtocolRaw)) {
      throw new Error(`MODEL_LLM_PROTOCOL_INVALID: models[${index}].llmProtocol`)
    }
    llmProtocol = llmProtocolRaw
  }

  return {
    modelId,
    modelKey,
    provider,
    type: raw.type,
    name: readTrimmedString(raw.name) || modelId,
    ...(llmProtocol ? { llmProtocol } : {}),
    price: 0,
  }
}

function parseCustomModels(rawModels: string | null | undefined): CustomModel[] {
  if (!rawModels) return []

  let parsedUnknown: unknown
  try {
    parsedUnknown = JSON.parse(rawModels)
  } catch {
    throw new Error('MODEL_PAYLOAD_INVALID: customModels is not valid JSON')
  }

  if (!Array.isArray(parsedUnknown)) {
    throw new Error('MODEL_PAYLOAD_INVALID: customModels must be an array')
  }

  const models: CustomModel[] = []
  for (let index = 0; index < parsedUnknown.length; index += 1) {
    models.push(normalizeStoredModel(parsedUnknown[index], index))
  }

  return models
}

function pickProviderStrict(providers: CustomProvider[], providerId: string): CustomProvider {
  const matched = providers.find((provider) => provider.id === providerId)
  if (!matched) {
    throw new Error(`PROVIDER_NOT_FOUND: ${providerId} is not configured`)
  }
  return matched
}

async function readUserConfig(userId: string): Promise<{ models: CustomModel[]; providers: CustomProvider[] }> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      customModels: true,
      customProviders: true,
    },
  })

  return {
    models: parseCustomModels(pref?.customModels),
    providers: parseCustomProviders(pref?.customProviders),
  }
}

function findModelByKey(models: CustomModel[], modelKey: string): CustomModel | null {
  const parsed = assertModelKey(modelKey, 'model')
  return models.find((model) => model.modelId === parsed.modelId && model.provider === parsed.provider) || null
}

export function getProviderKey(providerId?: string): string {
  if (!providerId) return ''
  const colonIndex = providerId.indexOf(':')
  return colonIndex === -1 ? providerId : providerId.slice(0, colonIndex)
}

export async function resolveModelSelection(
  userId: string,
  model: string,
  mediaType: ModelMediaType,
): Promise<ModelSelection> {
  const parsed = assertModelKey(model, `${mediaType} model`)
  const models = await getModelsByType(userId, mediaType)

  const exact = findModelByKey(models, parsed.modelKey)
  if (!exact) {
    throw new Error(`MODEL_NOT_FOUND: ${parsed.modelKey} is not enabled for ${mediaType}`)
  }

  const providerKey = getProviderKey(exact.provider).toLowerCase()
  const llmProtocol = mediaType === 'llm' && providerKey === 'doubao'
    ? (exact.llmProtocol || 'chat-completions')
    : undefined

  return {
    provider: exact.provider,
    modelId: exact.modelId,
    modelKey: composeModelKey(exact.provider, exact.modelId),
    mediaType,
    ...(llmProtocol ? { llmProtocol } : {}),
  }
}

async function resolveSingleModelSelection(
  userId: string,
  mediaType: ModelMediaType,
): Promise<ModelSelection> {
  const models = await getModelsByType(userId, mediaType)
  if (models.length === 0) {
    throw new Error(`MODEL_NOT_CONFIGURED: no ${mediaType} model is enabled`)
  }
  if (models.length > 1) {
    throw new Error(`MODEL_SELECTION_REQUIRED: multiple ${mediaType} models are enabled, provide model_key explicitly`)
  }

  const model = models[0]
  const providerKey = getProviderKey(model.provider).toLowerCase()
  const llmProtocol = mediaType === 'llm' && providerKey === 'doubao'
    ? (model.llmProtocol || 'chat-completions')
    : undefined

  return {
    provider: model.provider,
    modelId: model.modelId,
    modelKey: composeModelKey(model.provider, model.modelId),
    mediaType,
    ...(llmProtocol ? { llmProtocol } : {}),
  }
}

export async function resolveModelSelectionOrSingle(
  userId: string,
  model: string | null | undefined,
  mediaType: ModelMediaType,
): Promise<ModelSelection> {
  const modelKey = readTrimmedString(model)
  if (!modelKey) {
    return await resolveSingleModelSelection(userId, mediaType)
  }
  return await resolveModelSelection(userId, modelKey, mediaType)
}

export interface ProviderConfig {
  id: string
  name: string
  apiKey: string
  baseUrl?: string
  apiMode?: 'gemini-sdk' | 'openai-official'
  gatewayRoute?: GatewayRouteType
}

export async function getProviderConfig(userId: string, providerId: string): Promise<ProviderConfig> {
  const { providers } = await readUserConfig(userId)
  const provider = pickProviderStrict(providers, providerId)

  if (!provider.apiKey) {
    throw new Error(`PROVIDER_API_KEY_MISSING: ${provider.id}`)
  }

  return {
    id: provider.id,
    name: provider.name,
    apiKey: decryptApiKey(provider.apiKey),
    baseUrl: normalizeProviderBaseUrl(provider.id, provider.baseUrl),
    apiMode: provider.apiMode,
    gatewayRoute: provider.gatewayRoute,
  }
}

export async function getUserModels(userId: string): Promise<CustomModel[]> {
  const { models } = await readUserConfig(userId)
  return models
}

export async function getModelProvider(userId: string, model: string): Promise<string | null> {
  const { models } = await readUserConfig(userId)
  const matched = findModelByKey(models, model)
  return matched?.provider || null
}

export async function getModelsByType(userId: string, type: ModelMediaType): Promise<CustomModel[]> {
  const models = await getUserModels(userId)
  return models.filter((model) => model.type === type)
}

export async function hasApiConfig(userId: string): Promise<boolean> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { customProviders: true },
  })

  const providers = parseCustomProviders(pref?.customProviders)
  return providers.some((provider) => !!provider.apiKey)
}

export async function getTTSApiKey(userId: string, model?: string | null): Promise<string> {
  const selection = await resolveModelSelectionOrSingle(userId, model, 'tts')
  return (await getProviderConfig(userId, selection.provider)).apiKey
}
```

### 11.6 配置服务

**文件**: `src/lib/config-service.ts`

```typescript
import { prisma } from '@/lib/prisma'
import {
  type CapabilitySelections,
  type CapabilityValue,
  composeModelKey as composeStrictModelKey,
  parseModelKeyStrict,
} from '@/lib/model-config-contract'
import { findBuiltinCapabilities } from '@/lib/model-capabilities/catalog'
import { resolveGenerationOptionsForModel } from '@/lib/model-capabilities/lookup'

export type ParsedModelKey = { provider: string; modelId: string }

export function parseModelKey(key: string | null | undefined): ParsedModelKey | null {
  const parsed = parseModelKeyStrict(key)
  if (!parsed) return null
  return { provider: parsed.provider, modelId: parsed.modelId }
}

export function composeModelKey(provider: string, modelId: string): string {
  return composeStrictModelKey(provider, modelId)
}

export function extractModelId(key: string | null | undefined): string | null {
  const parsed = parseModelKey(key)
  return parsed?.modelId || null
}

export function extractModelKey(key: string | null | undefined): string | null {
  const parsed = parseModelKey(key)
  if (!parsed?.provider || !parsed?.modelId) return null
  return composeModelKey(parsed.provider, parsed.modelId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isCapabilityValue(value: unknown): value is CapabilityValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function normalizeCapabilitySelections(raw: unknown): CapabilitySelections {
  if (!isRecord(raw)) return {}

  const normalized: CapabilitySelections = {}
  for (const [modelKey, rawSelection] of Object.entries(raw)) {
    if (!isRecord(rawSelection)) continue

    const selection: Record<string, CapabilityValue> = {}
    for (const [field, value] of Object.entries(rawSelection)) {
      if (!isCapabilityValue(value)) continue
      selection[field] = value
    }

    if (Object.keys(selection).length > 0) {
      normalized[modelKey] = selection
    }
  }

  return normalized
}

function parseCapabilitySelections(raw: string | null | undefined): CapabilitySelections {
  if (!raw) return {}
  try {
    return normalizeCapabilitySelections(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export interface ProjectModelConfig {
  analysisModel: string | null
  characterModel: string | null
  locationModel: string | null
  storyboardModel: string | null
  editModel: string | null
  videoModel: string | null
  audioModel: string | null
  ttsModel: string | null
  videoRatio: string
  videoResolution: string
  artStyle: string | null
  capabilityDefaults: CapabilitySelections
  capabilityOverrides: CapabilitySelections
}

export interface UserModelConfig {
  analysisModel: string | null
  characterModel: string | null
  locationModel: string | null
  storyboardModel: string | null
  editModel: string | null
  videoModel: string | null
  audioModel: string | null
  ttsModel: string | null
  capabilityDefaults: CapabilitySelections
}

export async function getProjectModelConfig(
  projectId: string,
  userId: string,
): Promise<ProjectModelConfig> {
  const [projectData, userPref] = await Promise.all([
    prisma.project.findUnique({ where: { projectId } }),
    prisma.userPreference.findUnique({ where: { userId } }),
  ])

  return {
    analysisModel: extractModelKey(projectData?.analysisModel) || extractModelKey(userPref?.analysisModel) || null,
    characterModel: extractModelKey(projectData?.characterModel) || null,
    locationModel: extractModelKey(projectData?.locationModel) || null,
    storyboardModel: extractModelKey(projectData?.storyboardModel) || null,
    editModel: extractModelKey(projectData?.editModel) || null,
    videoModel: extractModelKey(projectData?.videoModel) || null,
    audioModel: extractModelKey(projectData?.audioModel) || extractModelKey(userPref?.audioModel) || null,
    ttsModel: extractModelKey(projectData?.ttsModel) || extractModelKey(userPref?.ttsModel) || null,
    videoRatio: projectData?.videoRatio || userPref?.videoRatio || '16:9',
    videoResolution: projectData?.videoResolution || userPref?.videoResolution || '720p',
    artStyle: projectData?.artStyle || userPref?.artStyle || null,
    capabilityDefaults: parseCapabilitySelections(userPref?.capabilityDefaults),
    capabilityOverrides: parseCapabilitySelections(projectData?.capabilityOverrides),
  }
}

export async function getUserModelConfig(userId: string): Promise<UserModelConfig> {
  const userPref = await prisma.userPreference.findUnique({ where: { userId } })

  return {
    analysisModel: extractModelKey(userPref?.analysisModel) || null,
    characterModel: extractModelKey(userPref?.characterModel) || null,
    locationModel: extractModelKey(userPref?.locationModel) || null,
    storyboardModel: extractModelKey(userPref?.storyboardModel) || null,
    editModel: extractModelKey(userPref?.editModel) || null,
    videoModel: extractModelKey(userPref?.videoModel) || null,
    audioModel: extractModelKey(userPref?.audioModel) || null,
    ttsModel: extractModelKey(userPref?.ttsModel) || null,
    capabilityDefaults: parseCapabilitySelections(userPref?.capabilityDefaults),
  }
}

export function resolveModelCapabilityGenerationOptions(input: {
  modelType: 'llm' | 'image' | 'video' | 'audio' | 'tts'
  modelKey: string
  capabilityDefaults?: CapabilitySelections
  capabilityOverrides?: CapabilitySelections
  runtimeSelections?: Record<string, CapabilityValue>
}): Record<string, CapabilityValue> {
  const parsed = parseModelKeyStrict(input.modelKey)
  if (!parsed) {
    throw new Error(`MODEL_KEY_INVALID: ${input.modelKey}`)
  }

  const capabilities = findBuiltinCapabilities(input.modelType, parsed.provider, parsed.modelId)
  const resolved = resolveGenerationOptionsForModel({
    modelType: input.modelType,
    modelKey: input.modelKey,
    capabilities,
    capabilityDefaults: input.capabilityDefaults,
    capabilityOverrides: input.capabilityOverrides,
    runtimeSelections: input.runtimeSelections,
    requireAllFields: input.modelType !== 'llm',
  })

  if (resolved.issues.length > 0) {
    const first = resolved.issues[0]
    throw new Error(`${first.code}: ${first.field} ${first.message}`)
  }

  return resolved.options
}

export async function resolveProjectModelCapabilityGenerationOptions(input: {
  projectId: string
  userId: string
  modelType: 'llm' | 'image' | 'video' | 'audio' | 'tts'
  modelKey: string
  runtimeSelections?: Record<string, CapabilityValue>
}): Promise<Record<string, CapabilityValue>> {
  const config = await getProjectModelConfig(input.projectId, input.userId)
  return resolveModelCapabilityGenerationOptions({
    modelType: input.modelType,
    modelKey: input.modelKey,
    capabilityDefaults: config.capabilityDefaults,
    capabilityOverrides: config.capabilityOverrides,
    runtimeSelections: input.runtimeSelections,
  })
}

export function checkRequiredModels(
  config: Partial<ProjectModelConfig | UserModelConfig>,
  requiredFields: string[],
): string[] {
  const missing: string[] = []
  const configValues = config as Record<string, unknown>

  const fieldNames: Record<string, string> = {
    analysisModel: '分析模型',
    characterModel: '角色图像模型',
    locationModel: '场景图像模型',
    storyboardModel: '分镜图像模型',
    editModel: '修图/编辑模型',
    videoModel: '视频模型',
    audioModel: '语音合成模型',
    ttsModel: 'TTS 模型',
  }

  for (const field of requiredFields) {
    if (!configValues[field]) {
      missing.push(fieldNames[field] || field)
    }
  }

  return missing
}

export function getMissingConfigError(missingFields: string[]): string {
  if (missingFields.length === 0) return ''
  if (missingFields.length === 1) {
    return `请先在设置中配置"${missingFields[0]}"`
  }
  return `请先在设置中配置以下模型：${missingFields.join('、')}`
}

export async function buildImageBillingPayload(input: {
  projectId: string
  userId: string
  imageModel: string | null
  basePayload: Record<string, unknown>
}): Promise<Record<string, unknown>> {
  const { projectId, userId, imageModel, basePayload } = input
  if (!imageModel) return basePayload

  let capabilityOptions: Record<string, CapabilityValue> = {}
  try {
    capabilityOptions = await resolveProjectModelCapabilityGenerationOptions({
      projectId,
      userId,
      modelType: 'image',
      modelKey: imageModel,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image model capability not configured'
    throw Object.assign(new Error(message), { code: 'IMAGE_MODEL_CAPABILITY_NOT_CONFIGURED', message })
  }

  return {
    ...basePayload,
    imageModel,
    ...(Object.keys(capabilityOptions).length > 0 ? { generationOptions: capabilityOptions } : {}),
  }
}

export function buildImageBillingPayloadFromUserConfig(input: {
  userModelConfig: UserModelConfig
  imageModel: string | null
  basePayload: Record<string, unknown>
}): Record<string, unknown> {
  const { userModelConfig, imageModel, basePayload } = input
  if (!imageModel) return basePayload

  let capabilityOptions: Record<string, CapabilityValue> = {}
  try {
    capabilityOptions = resolveModelCapabilityGenerationOptions({
      modelType: 'image',
      modelKey: imageModel,
      capabilityDefaults: userModelConfig.capabilityDefaults,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image model capability not configured'
    throw Object.assign(new Error(message), { code: 'IMAGE_MODEL_CAPABILITY_NOT_CONFIGURED', message })
  }

  return {
    ...basePayload,
    imageModel,
    ...(Object.keys(capabilityOptions).length > 0 ? { generationOptions: capabilityOptions } : {}),
  }
}
```

---

## 附录 A: 模型能力目录示例

**文件**: `standards/capabilities/models.catalog.json`

```json
[
  {
    "modelType": "llm",
    "provider": "doubao",
    "modelId": "doubao-seed-2-0-pro-260215",
    "capabilities": {
      "llm": {
        "reasoningEffortOptions": ["minimal", "low", "medium", "high"]
      }
    }
  },
  {
    "modelType": "llm",
    "provider": "doubao",
    "modelId": "doubao-seed-1-8-251228",
    "capabilities": {
      "llm": {
        "reasoningEffortOptions": ["minimal", "low", "medium", "high"]
      }
    }
  },
  {
    "modelType": "image",
    "provider": "wanxiang",
    "modelId": "wanxiang-ultra-real",
    "capabilities": {
      "image": {
        "resolutionOptions": ["1K", "2K", "4K"]
      }
    }
  },
  {
    "modelType": "video",
    "provider": "doubao",
    "modelId": "doubao-seedance-1-5-pro-251215",
    "capabilities": {
      "video": {
        "generationModeOptions": ["normal", "firstlastframe"],
        "generateAudioOptions": [true, false],
        "durationOptions": [4, 5, 6, 7, 8, 9, 10, 11, 12],
        "resolutionOptions": ["480p", "720p", "1080p"],
        "firstlastframe": true,
        "supportGenerateAudio": true
      }
    }
  },
  {
    "modelType": "video",
    "provider": "wanxiang",
    "modelId": "wan2.6-i2v-flash",
    "capabilities": {
      "video": {
        "generationModeOptions": ["normal"],
        "durationOptions": [6, 10],
        "resolutionOptions": ["768p", "1080p"],
        "firstlastframe": false,
        "supportGenerateAudio": false
      }
    }
  },
  {
    "modelType": "tts",
    "provider": "doubao",
    "modelId": "doubao-tts-pro",
    "capabilities": {
      "tts": {
        "voiceOptions": ["azure_male_yu", "azure_female_qing", "doubao_neutral"],
        "languageOptions": ["zh-CN", "en-US"],
        "speedOptions": ["-50%", "0%", "+50%"]
      }
    }
  },
  {
    "modelType": "tts",
    "provider": "wanxiang",
    "modelId": "wanxiang-tts-001",
    "capabilities": {
      "tts": {
        "voiceOptions": ["wx_male_01", "wx_female_01", "wx_neutral"],
        "languageOptions": ["zh-CN"],
        "speedOptions": ["0.8x", "1.0x", "1.2x"]
      }
    }
  }
]
```

---

## 附录 B: 数据库迁移 SQL

```sql
-- 用户偏好表更新
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS tts_model VARCHAR(255) AFTER audio_model,
  ADD COLUMN IF NOT EXISTS doubao_api_key TEXT AFTER custom_providers,
  ADD COLUMN IF NOT EXISTS wanxiang_api_key TEXT AFTER doubao_api_key;

-- 项目表更新
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tts_model VARCHAR(255) AFTER audio_model,
  ADD COLUMN IF NOT EXISTS capability_overrides TEXT AFTER art_style;
```

---

*文档版本: 1.0*
*最后更新: 2026-05-14*