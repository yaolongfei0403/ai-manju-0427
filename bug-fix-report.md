# 模型配置页面 Bug 修复报告

## 问题描述

用户在 `model/config/page.tsx` 页面通过 `api/v1/admin/models/config` 接口添加模型后，出现两个问题：
1. 模型没有出现在左侧以能力分类的模型列表中
2. 点击选中模型后右侧没有回显该模型的参数配置

## 排查过程

### 第一阶段：后端问题

通过直接调用后端 API 发现：

```bash
# 直接调后端 200 OK，模型列表正常返回
curl http://localhost:8000/api/v1/admin/models
# 返回 9 个模型（激活+目录）

# 通过 Next.js 代理调用返回空或错误
curl http://localhost:3000/api/v1/admin/models
# 返回 Next.js route.ts 查询 PostgreSQL 的结果（为空）
```

### 根本原因 1：Next.js route.ts 拦截了 API 请求

在 Next.js App Router 中，`rewrites` 规则的优先级低于同路径的 `route.ts` 文件。

项目中有两个路由层：
- **FastAPI 后端**：`/api/v1/admin/models` → YAML 配置系统（已实现完整功能）
- **Next.js route.ts**：同样路径 `/api/v1/admin/models` → 查询 PostgreSQL `AIModel` 表

由于 Next.js 的 `route.ts` 文件（`frontend/src/app/api/v1/admin/models/route.ts`）先于 `next.config.ts` 的 `rewrites` 规则匹配，所有请求都被 Next.js 层的 route handler 拦截了。

前端代码中的 API 调用：
```typescript
// fetchModels() 实际调用的是 Next.js route.ts，而不是 FastAPI
const resp = await axios.get("/api/v1/admin/models", { headers: getAuthHeaders() });
```

而 Next.js route.ts 查询的是空的 `AIModel` 表，所以返回空列表。

### 根本原因 2：PostgreSQL AIModel 表为空

`AIModel` 表从未被使用过。模型配置的后端实现是基于 YAML 文件的：
- 配置存储在 `~/.ai_manhua/config.yaml`
- 能力描述在 `model/config/capabilities.yaml`
- `ModelRegistry` 从 YAML 加载配置到内存

### 根本原因 3：后端 ModelRegistry 类混淆

在 `models.py` 中：
```python
from app.core.model_config.registry import ModelRegistry  # 普通类
```
但同时在 `types.py` 中也定义了同名 `ModelRegistry`（Pydantic BaseModel）：
```python
class ModelRegistry(BaseModel):  # Pydantic 模型
    llm: ModelConfigEntry | None = Field(...)
    ...
```

两个类都叫 `ModelRegistry`，但一个是普通类（来自 `registry.py`），一个是 Pydantic 模型（来自 `types.py`）。实际使用的是 `registry.py` 中的版本，它接受 `ResolvedConfig` 作为构造参数。

之前修改 `_get_registry()` 时使用 `ModelRegistry(**kwargs)` 会失败，因为那个版本的构造函数只接受 `config: ResolvedConfig` 参数。

## 修复内容

### 1. 后端：`models.py` — 扩展 list_models 返回目录能力

**文件**：`backend/app/api/v1/models.py`

将 `list_models` endpoint 从"只返回已注册模型"改为"同时返回已注册模型和目录中定义的能力模型"：

```python
# 之前：只从 ModelRegistry 获取已配置的类型（每种类型最多 1 个）
# 之后：先返回注册的模型，再补充 capabilities.yaml 中定义但未注册的能力模型
```

新增 `active: boolean` 字段区分：
- `active: true` — 已注册/已激活的模型
- `active: false` — 目录中可用但未激活的模型

### 2. 后端：保持 `_get_registry()` 使用原始方式

恢复为 `ModelRegistry(resolved)`，使用 `registry.py` 中定义的类，而不是 `types.py` 中定义的 Pydantic 模型。

### 3. 前端：Next.js route.ts 改为代理模式

将以下文件从"直接查数据库"改为"转发到 FastAPI 后端"：

- `frontend/src/app/api/v1/admin/models/route.ts` — GET/POST 代理
- `frontend/src/app/api/v1/admin/models/[id]/route.ts` — GET/PUT/DELETE 代理 + 子路径代理（`/config`、`/capabilities`、`/test` 等）
- `frontend/src/app/api/v1/admin/models/[id]/test/route.ts` — POST 代理

### 4. 前端：`page.tsx` — 修复模型列表和详情面板

| 修复项 | 说明 |
|--------|------|
| `ModelEntry` 增加 `active` 字段 | 对应后端新增的 `active` 字段 |
| `getConfigEntry()` 从 `selectedModel` 构建 | 选中模型时从模型数据构建配置项，而不是依赖 `resolvedConfig` |
| 右侧面板门控逻辑 | 从 `{!config && ...} : config ? ...` 改为 `{!config && ...} : config ? ...`，确保选中模型时面板显示 |
| `loadData` 移除 `currentType` 依赖 | 避免类型切换时不必要的重新获取 |
| 自动选择逻辑 | 改为在类型切换时自动选择当前类型的第一个模型 |
| `handleSave` / `handleConfirmAdd` | 使用后端响应更新状态并触发重新加载 |

## 修复后的请求链路

```
前端 page.tsx
  ↓ axios.get("/api/v1/admin/models")
Next.js route.ts (代理)
  ↓ fetch 到后端
FastAPI /api/v1/admin/models (list_models)
  ↓ 读取内存中的 ModelRegistry + CapabilityCatalog
返回 model 列表 (active + 可用)
  ↓
page.tsx 更新 models state
  ↓
左侧列表显示模型（按能力分类）
```

## 修改的文件清单

### 后端
| 文件 | 修改内容 |
|------|---------|
| `backend/app/api/v1/models.py` | `list_models` 增加目录能力返回，修复 `_get_registry()` 初始化 |
| `backend/app/core/model_config/registry.py` | 已有的 `ModelRegistry` 类（无需修改） |

### 前端
| 文件 | 修改内容 |
|------|---------|
| `frontend/src/app/api/v1/admin/models/route.ts` | 改为代理模式，转发到 FastAPI |
| `frontend/src/app/api/v1/admin/models/[id]/route.ts` | 改为代理模式，含子路径支持 |
| `frontend/src/app/api/v1/admin/models/[id]/test/route.ts` | 改为代理模式 |
| `frontend/src/app/(main)/models/config/page.tsx` | 修复列表显示、详情面板、自动选择逻辑 |

## 验证方式

```bash
# 1. 直接测试后端
curl http://localhost:8000/api/v1/admin/models | jq '.[] | "\(.type): \(.provider)/\(.model) active=\(.active)"'

# 2. 通过前端 Next.js 测试
curl http://localhost:3000/api/v1/admin/models | jq '.[] | "\(.type): \(.provider)/\(.model) active=\(.active)"'

# 3. 添加模型后验证
curl -X POST http://localhost:3000/api/v1/admin/models/config \
  -H "Content-Type: application/json" \
  -d '{"t2i": {"provider": "wanx", "model": "wan2.7-image", "endpoint": "https://...", "api_key": "..."}}'

# 4. 验证 GET /config
curl http://localhost:3000/api/v1/admin/models/config | jq
```

## 架构建议

当前系统存在两套并行的模型配置方式：

1. **YAML 配置系统**（FastAPI + `ModelRegistry`）— 当前使用
2. **PostgreSQL 表系统**（`AIModel` 表）— 未使用

建议长期方案：要么废弃 PostgreSQL 表系统，要么将其与 YAML 系统统一，避免类似的路由冲突再次发生。

---

生成时间：2026-05-17