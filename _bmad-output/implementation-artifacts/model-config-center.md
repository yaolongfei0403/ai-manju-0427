---
status: done
---

# AI模型配置中心 - 实现规格

**Author:** Admin
**Date:** 2026/04/30

## Story

**As a** 平台管理员
**I want** 管理和配置AI模型
**So that** 用户可以在项目中使用正确配置的模型

## Acceptance Criteria

1. **Given** 管理员访问模型配置中心, **When** 页面加载, **Then** 显示LLM/T2I/I2V三组模型列表
2. **Given** 管理员添加新模型, **When** 填写模型信息并保存, **Then** 模型显示在对应类型的列表中
3. **Given** 管理员测试模型连接, **When** 点击"测试连接", **Then** 显示连接结果（成功/失败/延迟）
4. **Given** 管理员编辑模型, **When** 修改配置并保存, **Then** 更新后的配置生效
5. **Given** 管理员删除模型, **When** 确认删除, **Then** 模型从列表中移除
6. **Given** 用户创建项目, **When** 选择AI模型, **Then** 从数据库动态加载模型列表

## Tasks

### 数据库层
- [x] Task 1: 添加 AIModel Prisma 模型
- [x] Task 2: 创建默认模型种子数据

### 后端API层
- [x] Task 3: GET /api/v1/admin/models - 获取所有模型
- [x] Task 4: POST /api/v1/admin/models - 创建模型
- [x] Task 5: PUT /api/v1/admin/models/:id - 更新模型
- [x] Task 6: DELETE /api/v1/admin/models/:id - 删除模型
- [x] Task 7: POST /api/v1/admin/models/:id/test - 测试连接
- [x] Task 8: GET /api/v1/models - 公开模型列表（供项目创建页使用）

### 前端组件
- [x] Task 9: 创建模型配置中心页面 `/models/config`
- [x] Task 10: 创建 ModelConfigPage 组件（参考 HTML 原型）
- [x] Task 11: 创建 ModelList 组件
- [x] Task 12: 创建 ModelDetail 组件
- [x] Task 13: 更新 ProjectForm 使用动态模型列表

### 集成
- [x] Task 14: 添加导航链接到模型配置中心
- [x] Task 15: API客户端函数

---

## 数据模型

```prisma
model AIModel {
  id            String   @id @default(uuid())
  type          String   // llm, t2i, i2v
  code          String   @unique  // gpt4o, sdxl, runway
  name          String
  provider      String   // openai, anthropic, deepseek, custom
  description   String?
  endpoint      String   // API 端点 URL
  apiKey        String?  // 加密存储
  modelName     String?  // API中使用的模型名
  status        String   @default("offline") // online, offline, testing
  env           String   @default("prod") // prod, test, dev

  // LLM专属
  maxTokens     Int?
  temperature   Float?
  systemPrompt  String?

  // T2I专属
  resolution    String?
  quality       String?

  // I2V专属
  duration      Int?
  fps           Int?

  // 高级配置
  timeout       Int      @default(30)
  retry         Int      @default(3)
  proxy         String?
  customHeaders Json?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## API 设计

### GET /api/v1/admin/models
获取所有模型（管理员）

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "llm",
      "code": "gpt4o",
      "name": "GPT-4o",
      "provider": "openai",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "modelName": "gpt-4o",
      "status": "online",
      "env": "prod",
      "maxTokens": 128000,
      "temperature": 0.7,
      "timeout": 30,
      "retry": 3,
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### POST /api/v1/admin/models
创建模型

**Request Body:**
```json
{
  "type": "llm",
  "code": "gpt4o",
  "name": "GPT-4o",
  "provider": "openai",
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "apiKey": "sk-...",
  "modelName": "gpt-4o",
  "maxTokens": 128000,
  "temperature": 0.7
}
```

### PUT /api/v1/admin/models/:id
更新模型

### DELETE /api/v1/admin/models/:id
删除模型

### POST /api/v1/admin/models/:id/test
测试连接

**Response 200:**
```json
{
  "success": true,
  "latency": 234,
  "message": "连接成功"
}
```

### GET /api/v1/models
获取启用的模型列表（公开，供项目创建页使用）

```json
{
  "llm": [{ "code": "gpt4o", "name": "GPT-4o", "provider": "OpenAI" }],
  "t2i": [{ "code": "sdxl", "name": "SDXL", "provider": "Stability AI" }],
  "i2v": [{ "code": "runway", "name": "Runway Gen-3", "provider": "Runway" }]
}
```

---

## 文件结构

```
frontend/src/
├── app/
│   └── (main)/
│       └── models/
│           └── config/
│               └── page.tsx          # 模型配置中心页面
├── components/
│   └── features/
│       └── models/
│           ├── ModelConfigPage.tsx   # 主页面组件
│           ├── ModelList.tsx         # 左侧模型列表
│           ├── ModelDetail.tsx       # 右侧详情编辑
│           ├── ModelTypeTabs.tsx     # LLM/T2I/I2V Tab
│           └── AddModelModal.tsx     # 添加模型弹窗
├── lib/
│   └── api/
│       └── models.ts                 # API 客户端
└── stores/
    └── model.ts                       # Model Store

backend:
├── prisma/schema.prisma               # 添加 AIModel
└── seed.ts                           # 默认模型种子数据
```
