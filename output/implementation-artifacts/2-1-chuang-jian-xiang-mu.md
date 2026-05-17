# Story 2.1: 创建项目

Status: done

## Story

**As a** 用户
**I want** 创建新项目并配置基本信息
**So that** 开始我的漫剧创作

## Acceptance Criteria

1. **Given** 我在项目列表页点击"创建新项目", **When** 输入项目名称（2-50字符）、选择题材（科幻/玄幻/都市等）、目标受众，选择视觉风格，填写简介，点击创建, **Then** 系统创建项目并跳转项目详情页，显示创建成功提示

2. **Given** 项目名称为空或超长, **When** 点击创建, **Then** 提示"项目名称需2-50字符"

3. **Given** 未填写必填项, **When** 点击创建, **Then** 高亮缺失字段，提示必填

## Tasks / Subtasks

- [x] Task 1: 创建项目页面路由和基础布局 (AC: #1, #2, #3)
  - [x] Subtask 1.1: 创建 `frontend/src/app/(main)/projects/new/page.tsx` 路由
  - [x] Subtask 1.2: 创建基础布局（Header + 内容区）
  - [x] Subtask 1.3: 复用 GlobalHeader 组件（如已实现）
- [x] Task 2: 实现项目表单组件 (AC: #1, #2, #3)
  - [x] Subtask 2.1: 创建 `ProjectForm` 组件
  - [x] Subtask 2.2: 项目名称输入（2-50字符验证）
  - [x] Subtask 2.3: 题材选择下拉框（科幻/玄幻/都市/古言/悬疑/言情/仙侠/恐怖）
  - [x] Subtask 2.4: 目标受众选择（全年龄/青少年/成人）
  - [x] Subtask 2.5: 项目简介文本框
  - [x] Subtask 2.6: 表单验证和错误提示
- [x] Task 3: 实现视觉风格选择组件 (AC: #1)
  - [x] Subtask 3.1: 创建风格选择网格（写实科幻/二次元动漫/国风水墨/欧美漫画/像素风格/3D渲染/手绘素描/自定义）
  - [x] Subtask 3.2: 实现风格标签多选（赛博朋克/太空歌剧/未来都市等）
  - [x] Subtask 3.3: 实现右侧实时预览面板
- [x] Task 4: 实现画面尺寸配置 (AC: #1)
  - [x] Subtask 4.1: 创建画幅比例选择器（16:9/9:16/1:1/4:3）
  - [x] Subtask 4.2: 自定义宽高输入
  - [x] Subtask 4.3: 右侧预览框联动更新
- [x] Task 5: 实现 AI 模型配置 (AC: #1)
  - [x] Subtask 5.1: LLM 模型选择（GPT-4o / Claude 3.5 / DeepSeek-V3）
  - [x] Subtask 5.2: 文生图模型选择（SDXL / Midjourney V6 / DALL·E 3）
  - [x] Subtask 5.3: 图生视频模型选择（Runway Gen-3 / Pika 1.5 / Luma Dream Machine）
  - [x] Subtask 5.4: 右侧模型配置预览联动
- [x] Task 6: 实现高级设置 (AC: #1)
  - [x] Subtask 6.1: 采样步数滑块（20-50）
  - [x] Subtask 6.2: CFG Scale 滑块（1-15）
  - [x] Subtask 6.3: 资产共享开关
- [x] Task 7: 实现快捷模板功能 (AC: #1)
  - [x] Subtask 7.1: 科幻太空模板
  - [x] Subtask 7.2: 二次元奇幻模板
  - [x] Subtask 7.3: 国风仙侠模板
  - [x] Subtask 7.4: 一键套用逻辑
- [x] Task 8: 实现创建项目 API (AC: #1)
  - [x] Subtask 8.1: 创建 `POST /api/v1/projects` API Route
  - [x] Subtask 8.2: 实现数据验证和错误处理
  - [x] Subtask 8.3: 返回创建的项目信息
- [x] Task 9: 实现项目创建 Store (AC: #1)
  - [x] Subtask 9.1: 创建 `frontend/src/stores/project.ts` (Zustand)
  - [x] Subtask 9.2: 实现 `createProject` action
- [x] Task 10: 实现创建成功后的跳转 (AC: #1)
  - [x] Subtask 10.1: 成功后跳转到项目详情页或小说上传页

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand (已有 auth store 模式可参考)
- **API 客户端**: axios (已在 `lib/api/auth.ts` 中使用)
- **路由**: App Router 文件系统路由
- **数据库**: PostgreSQL + Prisma ORM (Project 模型需确认)

### API 设计规范

**API 响应格式** (遵循架构规范):
```typescript
// 成功响应
{ "data": T }

// 错误响应
{ "error": { "code": string, "message": string } }
```

**创建项目 API**:
```
POST /api/v1/projects
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "name": string,           // 2-50字符，必填
  "description": string,     // 可选，简介
  "genre": string,           // 题材类型，必填
  "targetAudience": string,  // 目标受众，必填
  "style": string,          // 视觉风格代码，必填
  "styleTags": string[],    // 风格关键词数组
  "aspectRatio": string,    // 画幅比例，如 "16:9"
  "width": number,          // 自定义宽度
  "height": number,         // 自定义高度
  "llmModel": string,       // LLM 模型
  "t2iModel": string,       // 文生图模型
  "i2vModel": string,       // 图生视频模型
  "samplingSteps": number,  // 采样步数
  "cfgScale": number,       // CFG Scale
  "shareAssets": boolean    // 是否共享资产
}

Response 201:
{
  "data": {
    "id": string,
    "name": string,
    "status": "draft" | "active",
    "createdAt": string,
    ...
  }
}
```

### 前端组件结构

```
frontend/src/
├── app/
│   └── (main)/
│       └── projects/
│           └── new/
│               └── page.tsx          # 创建项目页面
├── components/
│   └── features/
│       └── projects/
│           ├── ProjectForm.tsx       # 项目表单主组件
│           ├── StyleSelector.tsx     # 视觉风格选择
│           ├── AspectRatioSelector.tsx # 画幅比例选择
│           ├── ModelConfig.tsx       # AI 模型配置
│           ├── AdvancedSettings.tsx   # 高级设置
│           └── ProjectPreview.tsx    # 右侧预览面板
├── stores/
│   └── project.ts                    # Project Store (Zustand)
└── lib/
    └── api/
        └── projects.ts               # Projects API 客户端
```

### 已有模式参考

**Auth Store 模式** (参考 `frontend/src/stores/auth.ts`):
```typescript
interface ProjectState {
  project: Project | null;
  isLoading: boolean;
  createProject: (data: CreateProjectData) => Promise<Project>;
}
```

**API 客户端模式** (参考 `frontend/src/lib/api/auth.ts`):
```typescript
import axios from "axios";

export interface CreateProjectData {
  name: string;
  // ... 其他字段
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const response = await axios.post<{ data: Project } | { error: ApiError }>(
    `/api/v1/projects`,
    data
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}
```

### 验证规则

| 字段 | 规则 | 错误消息 |
|------|------|---------|
| 项目名称 | 2-50字符 | "项目名称需2-50字符" |
| 题材 | 必填 | "请选择题材类型" |
| 目标受众 | 必填 | "请选择目标受众" |
| 视觉风格 | 必填 | "请选择视觉风格" |

### 题材类型枚举

```typescript
const GENRES = {
  scifi: "科幻",
  fantasy: "玄幻",
  urban: "都市",
  ancient: "古言",
  mystery: "悬疑",
  romance: "言情",
  xianxia: "仙侠",
  horror: "恐怖"
} as const;
```

### 视觉风格代码

```typescript
const STYLES = {
  "scifi-real": "写实科幻",
  "anime": "二次元动漫",
  "ink": "国风水墨",
  "comic": "欧美漫画",
  "pixel": "像素风格",
  "3d": "3D渲染",
  "sketch": "手绘素描",
  "custom": "自定义风格"
} as const;
```

### 风格标签

```typescript
const STYLE_TAGS = [
  "赛博朋克", "太空歌剧", "未来都市", "机甲", "异星文明",
  "时间旅行", "人工智能", "末日废土", "基因改造", "量子科技",
  "魔法", "异世界", "冒险", "修仙", "古风", "神兽"
] as const;
```

### 画幅比例

```typescript
const ASPECT_RATIOS = [
  { code: "16:9", name: "横屏宽画幅", width: 1024, height: 576 },
  { code: "9:16", name: "竖屏短视频", width: 576, height: 1024 },
  { code: "1:1", name: "方形构图", width: 1024, height: 1024 },
  { code: "4:3", name: "标准画幅", width: 1024, height: 768 }
] as const;
```

### 模型选项

```typescript
const LLM_MODELS = {
  gpt4o: { name: "GPT-4o", provider: "OpenAI", desc: "最强推理" },
  claude: { name: "Claude 3.5", provider: "Anthropic", desc: "长文本" },
  deepseek: { name: "DeepSeek-V3", provider: "DeepSeek", desc: "高性价比" }
} as const;

const T2I_MODELS = {
  sdxl: { name: "SDXL", provider: "Stability AI", desc: "开源可控" },
  midjourney: { name: "Midjourney V6", provider: "Midjourney", desc: "艺术品质" },
  dalle3: { name: "DALL·E 3", provider: "OpenAI", desc: "语义理解强" }
} as const;

const I2V_MODELS = {
  runway: { name: "Runway Gen-3", provider: "Runway", desc: "电影级运动" },
  pika: { name: "Pika 1.5", provider: "Pika Labs", desc: "创意特效" },
  luma: { name: "Luma Dream Machine", provider: "Luma AI", desc: "物理真实" }
} as const;
```

### UI 设计参考

参考 `html/创建项目.html` 原型：
- 深色科技风格（背景 #020617, 卡片 rgba(30,41,59,0.7)）
- 玻璃态面板效果（glass-panel 类）
- 渐变按钮（background: linear-gradient(135deg, #6366f1, #8b5cf6)）
- 左侧表单区（8列）+ 右侧预览区（4列）网格布局
- 风格选择网格（4列）、模型选择网格（3列）
- 标签选择器（tag-pill 类）
- 实时预览面板

### 文件清单

**新建文件:**
- `frontend/src/app/(main)/projects/new/page.tsx` - 创建项目页面
- `frontend/src/components/features/projects/ProjectForm.tsx` - 项目表单
- `frontend/src/components/features/projects/StyleSelector.tsx` - 风格选择
- `frontend/src/components/features/projects/AspectRatioSelector.tsx` - 画幅选择
- `frontend/src/components/features/projects/ModelConfig.tsx` - 模型配置
- `frontend/src/components/features/projects/AdvancedSettings.tsx` - 高级设置
- `frontend/src/components/features/projects/ProjectPreview.tsx` - 预览面板
- `frontend/src/stores/project.ts` - Project Store
- `frontend/src/lib/api/projects.ts` - Projects API 客户端
- `frontend/src/app/api/v1/projects/route.ts` - 创建项目 API

**修改文件:**
- `frontend/src/app/(main)/layout.tsx` - 添加创建项目路由（如需要）

### 依赖关系

- **前置依赖**: Story 1.1-1.3 (用户认证) - 必须先完成
- **后续依赖**: Story 2.2 (查看项目列表) - 需要能显示创建的项目

---

## Dev Agent Record

### Agent Model Used
MiniMax-M2 (Claude Code)

### Debug Log References
N/A - 新故事

### Completion Notes List
Story 2.1 创建项目 - 已完成实现

**实现内容:**
1. 创建项目页面路由 `(main)/projects/new/page.tsx` 和布局
2. 项目表单组件 `ProjectForm` - 包含所有基础字段和验证
3. 视觉风格选择组件 `StyleSelector` - 8种风格 + 16种标签
4. 画幅比例选择器 `AspectRatioSelector` - 4种预设 + 自定义
5. AI模型配置组件 `ModelConfig` - LLM/T2I/I2V 三类模型选择
6. 高级设置组件 `AdvancedSettings` - 采样步数/CFG/资产共享
7. 右侧预览面板 `ProjectPreview` - 实时预览 + 快捷模板
8. Projects API Route - `POST /api/v1/projects` + `GET /api/v1/projects`
9. Project Store (Zustand) - `createProject`, `fetchProjects`, `fetchProject`
10. API Client `lib/api/projects.ts`
11. Prisma Schema 更新 - 添加 User, Project, Episode 模型
12. 样式更新 `globals.css` - 添加玻璃面板/按钮/卡片等样式

### File List

**新建:**
- `frontend/src/app/(main)/layout.tsx`
- `frontend/src/app/(main)/projects/new/page.tsx`
- `frontend/src/components/features/projects/ProjectForm.tsx`
- `frontend/src/components/features/projects/StyleSelector.tsx`
- `frontend/src/components/features/projects/AspectRatioSelector.tsx`
- `frontend/src/components/features/projects/ModelConfig.tsx`
- `frontend/src/components/features/projects/AdvancedSettings.tsx`
- `frontend/src/components/features/projects/ProjectPreview.tsx`
- `frontend/src/stores/project.ts`
- `frontend/src/lib/api/projects.ts`
- `frontend/src/app/api/v1/projects/route.ts`

**修改:**
- `frontend/prisma/schema.prisma` - 添加 Project, Episode 模型
- `frontend/src/app/globals.css` - 添加玻璃面板等样式
- `frontend/src/app/projects/page.tsx` - 添加创建项目导航

---

## Change Log

- 2026/04/29: 故事文件创建 (status: ready-for-dev)
- 2026/04/29: 完成所有任务实现 (status: review)
