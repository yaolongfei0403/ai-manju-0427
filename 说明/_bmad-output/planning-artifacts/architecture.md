---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026/04/29'
project_name: 'AI漫剧工厂'
user_name: 'Admin'
date: '2026/04/29'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## 项目概览

**项目名称**: AI漫剧工厂
**项目定位**: 基于 AI 的"小说→漫剧"自动化生成平台
**核心链路**: 用户上传小说 → LLM 自动拆集 → 提取角色/场景/道具资产 → 文生图生成分镜画面 → 图生视频模型生成动态漫剧

---

## 输入文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 详细设计文档 | `docs/项目详细设计文档.md` | 完整技术规范（8章） |
| 项目概览 | `docs/readme.md` | 技术栈、数据库、部署方案 |
| 项目上下文 | `project-context.md` | AI agent 实施规则 |

---

## 技术架构决策

已通过以下步骤协同决策完成：
1. ✅ 项目上下文分析
2. ✅ Starter Template 评估
3. ✅ 核心架构决策
4. ✅ 实现模式与一致性规则
5. ✅ 项目结构与边界
6. ✅ 架构验证

---

## 项目上下文分析

### 需求概述

**功能范围（8大核心页面）：**
- 登录注册（OAuth、邮箱/手机、验证码）
- 项目管理（CRUD、多状态过滤、引擎配置）
- 小说处理（七步向导、智能拆集、资产批量生产）
- 分集工作台（双步生成流、协作锁、AI分镜）
- 视频工作台（双模式生成、时间轴剪辑、转场特效）
- 资产库（统计检索、批量管理、资产重生成）
- 用户中心（积分充值、用户管理、平台大盘、权限矩阵、审计日志）

**非功能需求（NFR）：**
- 实时性：WebSocket推送AI生成进度
- 规模化：任务队列支持批量生成/导出
- 一致性：IP-Adapter角色跨分镜一致性
- 安全性：JWT认证、RBAC权限、积分配额
- 可观测性：全平台审计日志

### 规模评估

- 复杂度：**高**（企业级全栈AI平台）
- 技术领域：Web + API + AI微服务 + 实时通信
- 核心实体：15个
- API接口：50+
- 前端页面：8个
- AI任务类型：7大类

### 技术约束

- AI供应商API依赖（DeepSeek-V4、Seedream、Seedance）
- MinIO对象存储（S3兼容）
- GPU资源需求（AI微服务）
- 第三方OAuth/支付集成

### 跨切面关注点

1. 异步任务编排（BullMQ + Redis）
2. 实时协作（Socket.IO + 协作锁）
3. 统一认证（NextAuth.js + JWT）
4. 多模型适配（LiteLLM统一封装）
5. 端到端类型安全（REST API + OpenAPI schema）

---

## Starter Template 评估

### 技术选型确认

根据项目文档（`readme.md` + `项目详细设计文档.md`），项目已有明确技术栈定义，本次评估确认并补充最新版本信息。

### 初始命令

```bash
# 前端（使用 Next.js 15 App Router）
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"

# AI 微服务（FastAPI + Python）
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn python-multipart
```

### 技术栈确认

**前端技术栈（已选定）：**

| 领域 | 技术 | 版本/说明 |
|------|------|----------|
| 框架 | Next.js 15 (App Router) | 2026年最新稳定版，支持React 19 |
| 语言 | TypeScript 5.x | 严格模式 |
| 样式 | Tailwind CSS v4 | CSS-based配置（v4特性），配合 shadcn/ui |
| 状态管理 | Zustand + TanStack Query | Query 5.x |
| 实时通信 | Socket.IO 4.x | 订阅任务进度与协作锁 |
| 认证 | NextAuth.js v5 | OAuth多Provider |
| 构建 | Turbopack | create-next-app已内置，700倍构建加速 |

**后端技术栈（已选定）：**

| 领域 | 技术 | 版本/说明 |
|------|------|----------|
| 主业务层 | Next.js API Routes (REST) | 标准 REST API，解耦跨语言调用 |
| AI 微服务 | FastAPI + Python 3.12+ | 异步高性能，自动OpenAPI文档 |
| 数据库 | PostgreSQL 16 + Prisma ORM | 关系型强一致 |
| 任务队列 | Redis 7.x + BullMQ | 异步任务编排 |
| 对象存储 | MinIO (S3兼容) | 预签名URL直传 |
| AI 编排 | LiteLLM | 多模型统一调用 |

### 架构决策确立

| 决策项 | 选择 | 说明 |
|--------|------|------|
| **API 层** | REST (非 tRPC) | Next.js API Routes 直接调用 FastAPI REST endpoints；tRPC 在跨语言场景下收益有限，降级为标准 REST + OpenAPI schema 维持类型安全 |
| **Monorepo 结构** | pnpm workspaces (Node.js only) | 前端 `frontend/` + AI微服务 `backend/` 分立，FastAPI 不进 monorepo |
| **代码组织** | Feature-based | 按业务域（project、episode、asset、user）组织 |
| **组件库** | shadcn/ui | Headless + Tailwind，与原型深色科技风契合 |
| **路由** | App Router | 文件系统路由，布局/加载/错误边界原生支持 |
| **状态管理** | 分离原则 | Zustand管UI状态，TanStack Query管服务端状态 |
| **实时推送** | Socket.IO Room | 任务进度+协作锁订阅 |

**注：** 项目初始化应作为第一个实现Story。

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Frontend framework: Next.js 15 + React 19 + Tailwind CSS v4 ✅
- Backend BFF: Next.js API Routes (REST, non-tRPC) ✅
- AI microservice: FastAPI + Python 3.12+ ✅
- Database: PostgreSQL 16 + Prisma ORM ✅
- Task queue: Redis 7.x + BullMQ ✅
- Object storage: MinIO (S3 compatible) ✅
- Real-time: Socket.IO 4.x ✅

**Important Decisions (Shape Architecture):**
- API layer: REST + OpenAPI schema (not tRPC due to cross-language limitation)
- Monorepo: pnpm workspaces (Node.js only), FastAPI as separate repo
- Auth: NextAuth.js v5 (OAuth multi-provider)
- AI orchestration: LiteLLM (multi-model unified abstraction)

**Deferred Decisions (Post-MVP):**
- Drizzle ORM (consider migration from Prisma if heavy-write performance issues arise)
- NextAuth v5 stability monitoring (downgrade to v4 if needed)

### Data Architecture

**Database:** PostgreSQL 16 + Prisma ORM
- Schema: 15 core entities (User, Project, Episode, Frame, Asset, Task, etc.)
- Naming: snake_case for tables/columns, PascalCase for models
- Migrations: `prisma/migrations/` directory, team-lock permissions

### Authentication & Security

**Auth Method:** NextAuth.js v5 + JWT
- OAuth providers: WeChat, QQ, GitHub
- Session: JWT stored in httpOnly cookies
- RBAC: Admin / Editor / Regular User roles
- Quota: UserQuota table with balance tracking

### API & Communication Patterns

**API Design:** REST (Standard)
- Base URL: `/api/v1/{resource}`
- Response format: `{ data: T }` for success, `{ error: { code, message } }` for errors
- Status codes: 200/201 success, 400 validation, 401 auth, 403 forbid, 404 not found, 500 internal

**Real-time Communication:** Socket.IO
- Room-based event broadcasting
- AI task progress: `task:progress`, `task:complete`, `task:error`
- Collab lock: `collab:lock`, `collab:unlock`

### Infrastructure & Deployment

**CI/CD:** GitHub Actions + Docker Compose
- Frontend: CDN deployment
- Backend: Docker container
- AI Service: Independent Docker deployment
- Local dev: `docker-compose up` for PostgreSQL, Redis, MinIO

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialize Next.js frontend project
2. Setup Prisma schema and migrations
3. Implement authentication (NextAuth.js)
4. Build project list page (first story)
5. Add REST API routes for projects
6. Setup FastAPI AI microservice
7. Integrate Socket.IO for real-time
8. Implement remaining pages and features

**Cross-Component Dependencies:**
- Auth decisions affect all API routes (middleware)
- Socket.IO events require coordination between Frontend hooks and Backend emitters
- MinIO upload flow depends on Presigned URL generation API

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**5 大类冲突区域已识别：**
- 命名冲突（数据库、API、代码）
- 结构冲突（测试、组件、配置）
- 格式冲突（API 响应、错误、日期）
- 通信冲突（事件命名、payload 结构）
- 流程冲突（加载状态、错误恢复）

### Naming Patterns

**Database (Prisma):**
- Table: snake_case plural (`user_profiles`, `project_episodes`)
- Column: snake_case (`created_at`, `user_id`)
- FK: `{table_singular}_id` (`user_id`, `project_id`)
- Index: `idx_{table}_{column}` (`idx_users_email`)
- Unique constraint: `uq_{table}_{column}` (`uq_users_email`)

**API (REST):**
- Endpoint: snake_case plural (`/api/v1/project-episodes`)
- Response fields: camelCase (`{ "episodeId": 123 }`)
- Query params: snake_case (`?filter_status=active`)
- Headers: `X-` prefix + camelCase (`X-Request-ID`)

**Code:**
- Components: PascalCase (`EpisodeCard.tsx`)
- Utils: camelCase (`useEpisodeList.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_FRAME_COUNT`)
- Database models: PascalCase (`Episode`, `FrameAsset`)

### Structure Patterns

**Project Organization (Feature-based):**
```
frontend/src/
├── app/                 # Next.js App Router
├── components/
│   ├── ui/             # shadcn/ui base components
│   ├── forms/           # Form components
│   └── features/        # Business feature components
├── lib/                 # Utilities (api, db, socket)
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
└── types/               # Shared TypeScript types

tests/
├── components/           # Co-located unit tests
├── integration/         # API integration tests
└── e2e/                 # Playwright E2E tests
```

**Test File Location:**
- Unit tests: Co-located with source file `EpisodeCard.test.tsx` next to `EpisodeCard.tsx`
- Integration tests: `tests/integration/` directory
- API tests: `tests/api/` directory

### Format Patterns

**API Response Formats:**
```json
// Success
{ "data": T, "meta"?: { pagination?: {...} } }

// Error
{ "error": { "code": string, "message": string, "details"?: any } }

// Pagination
{ "data": T[], "meta": { "pagination": { "page", "pageSize", "total", "totalPages" } } }
```

**API Status Code Convention:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Forbidden |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Internal server error |

**Date/Time Format:**
- API request/response: ISO 8601 strings (`"2026-04-29T10:30:00Z"`)
- Database storage: DateTime with timezone

### Communication Patterns

**Socket.IO Event Naming:**
| Event | Direction | Description |
|-------|-----------|-------------|
| `task:progress` | Server → Client | AI task progress update |
| `task:complete` | Server → Client | Task completed |
| `task:error` | Server → Client | Task error |
| `collab:lock` | Server → Client | Collab lock state change |
| `collab:unlock` | Server → Client | Collab lock released |

**Event Payload Format:**
```typescript
interface TaskProgressEvent {
  taskId: string;
  taskType: 'LLM_ANALYSIS' | 'ASSET_EXTRACTION' | 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'VIDEO_EXPORT';
  progress: number;  // 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: { code: string; message: string };
}
```

**State Management (Zustand) Conventions:**
- Store naming: `use{Entity}Store` e.g., `useProjectStore`
- State updates: Immutable (using Immer or spread operator)
- Action naming: `fetch{Entity}`, `create{Entity}`, `update{Entity}`, `delete{Entity}`

### Process Patterns

**Error Handling:**
```typescript
try {
  const result = await createEpisode(data);
  return Response.json({ data: result }, { status: 201 });
} catch (error) {
  if (error instanceof ValidationError) {
    return Response.json({
      error: { code: 'VALIDATION_ERROR', message: error.message }
    }, { status: 400 });
  }
  console.error('Unexpected error:', error);
  return Response.json({
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }, { status: 500 });
}
```

**Loading State Naming:**
| State variable | Naming | Description |
|---------------|--------|-------------|
| Loading | `isLoading` | Generic loading state |
| Submitting | `isSubmitting` | Form submission state |
| Initial load | `isInitialLoading` | Page first load |
| Optimistic | `isOptimistic` | Optimistic update in progress |

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow naming patterns (database, API, code)
2. Organize files using the specified project structure
3. API responses must include `{ data }` or `{ error }` structure
4. Socket.IO events must use specified event names
5. Errors must be logged to console AND return user-friendly message
6. All date/time must use ISO 8601 format

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ai-manhua-factory/
├── docker-compose.yml              # Full service orchestration
├── .env.example                    # Environment template
├── .gitignore
├── README.md
│
├── frontend/                      # Next.js 15 frontend app
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/            # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (main)/            # Main app route group
│   │   │   │   ├── layout.tsx     # Global layout
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx   # Project list
│   │   │   │   │   └── new/page.tsx  # Create project
│   │   │   │   ├── projects/[projectId]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── episodes/[episodeId]/
│   │   │   │   │       ├── page.tsx   # Episode workspace
│   │   │   │   │       └── frames/[frameId]/
│   │   │   │   │           └── page.tsx  # Video workspace
│   │   │   │   ├── upload/page.tsx    # Novel upload
│   │   │   │   ├── assets/page.tsx    # Asset library
│   │   │   │   └── user/page.tsx      # User center
│   │   │   ├── api/v1/              # REST API Routes
│   │   │   │   ├── auth/route.ts
│   │   │   │   ├── projects/route.ts
│   │   │   │   ├── episodes/route.ts
│   │   │   │   ├── assets/route.ts
│   │   │   │   ├── upload/route.ts
│   │   │   │   └── tasks/route.ts
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui base
│   │   │   ├── forms/               # Form components
│   │   │   └── features/            # Business components
│   │   │       ├── projects/
│   │   │       ├── episodes/
│   │   │       ├── assets/
│   │   │       └── user/
│   │   ├── lib/
│   │   │   ├── api/                 # API client
│   │   │   ├── db/                  # Prisma client
│   │   │   └── socket/              # Socket.IO client
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useTaskProgress.ts   # WebSocket task progress
│   │   │   └── useCollabLock.ts     # Collab lock
│   │   ├── stores/                 # Zustand stores
│   │   └── types/                   # Shared types
│   └── prisma/
│       └── schema.prisma
│
├── backend/                         # FastAPI AI microservice
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── main.py                 # FastAPI entry
│       ├── api/v1/
│       │   ├── generate/           # Task create/query
│       │   ├── models/             # LLM/T2I/I2V interfaces
│       │   └── assets/             # Asset extraction
│       ├── core/                   # Config/security/rate limit
│       ├── models/                 # Pydantic models
│       ├── services/               # Business logic
│       └── tasks/                  # BullMQ queue
│
└── docs/
    ├── 项目详细设计文档.md
    └── readme.md
```

### Architectural Boundaries

| Boundary | Communication |
|----------|---------------|
| Frontend ↔ Backend | REST API (`/api/v1/*`) |
| Backend BFF ↔ AI Service | FastAPI REST internal |
| AI Service ↔ Queue | BullMQ + Redis |
| Frontend ↔ WebSocket | Socket.IO |
| File Upload | MinIO presigned URL direct upload |

### Feature to Structure Mapping

| Feature | Directory |
|---------|-----------|
| Login/Register | `app/(auth)/` + `components/forms/` |
| Project Management | `app/(main)/projects/` + `components/features/projects/` |
| Novel Upload | `app/(main)/upload/` + `backend/app/api/v1/assets/` |
| Episode Workspace | `app/(main)/projects/[id]/episodes/[eid]/` + `components/features/episodes/` |
| Video Workspace | `.../frames/[fid]/` + `FrameTimeline.tsx` |
| Asset Library | `app/(main)/assets/` + `components/features/assets/` |
| User Center | `app/(main)/user/` + `components/features/user/` |
| AI Task Queue | `backend/app/tasks/queue.py` + `services/worker.py` |
| Real-time Collab | `hooks/useCollabLock.ts` + `lib/socket/` |

---

## Architecture Validation Results

### ✅ Coherence Validation

**Decision Compatibility:**
- Next.js 15 + React 19 + Tailwind CSS v4: ✅ Compatible
- Next.js API Routes + FastAPI + REST: ✅ Compatible
- PostgreSQL 16 + Prisma ORM: ✅ Compatible
- Redis + BullMQ + Socket.IO: ✅ Compatible
- MinIO + S3 multipart upload: ✅ Compatible (requires chunk size config)
- LiteLLM + multi-model API: ✅ Compatible

**Pattern Consistency:**
- Naming conventions (snake/camel/PascalCase) consistent across DB, API, code layers
- Project structure aligned with App Router filesystem routing
- Socket.IO event naming matches task queue state machine

**Structure Alignment:**
- Feature-based component organization matches dual-column layout requirements
- API Routes split by business domain, 1:1 mapped to Prisma schema entities

### ✅ Requirements Coverage Validation

**Functional Requirements Coverage (8 Pages):**
| Page | Architecture Support |
|------|---------------------|
| Login/Register | `app/(auth)/` + NextAuth.js |
| Project List/Create | `app/(main)/projects/` + REST API |
| Novel Upload | `app/(main)/upload/` + FastAPI `/assets/extract` |
| Episode Workspace | `.../episodes/[eid]/` + dual-column layout |
| Video Workspace | `.../frames/[fid]/` + FrameTimeline + Socket.IO |
| Asset Library | `app/(main)/assets/` + asset management API |
| User Center | `app/(main)/user/` + RBAC + audit log |

**Non-Functional Requirements Coverage:**
| NFR | Architecture Response |
|-----|----------------------|
| Real-time | Socket.IO Room subscription for task progress |
| Scale | BullMQ queue + Redis cache |
| Consistency | IP-Adapter + asset association |
| Security | JWT + RBAC + quota management |
| Observability | Audit log table + error tracking |

### ✅ Implementation Readiness Validation

**Decision Completeness:**
- ✅ All critical decisions documented with versions
- ✅ Technology stack locked (Next.js 15, React 19, Tailwind CSS v4, FastAPI, PostgreSQL 16)
- ✅ API routes defined (REST + OpenAPI schema)
- ✅ Socket.IO events defined and typed

**Structure Completeness:**
- ✅ Complete directory tree defined (frontend + backend separated)
- ✅ All features mapped to specific directories
- ✅ Integration boundaries defined (REST / Socket.IO / MinIO)

**Pattern Completeness:**
- ✅ Naming conventions cover DB, API, code layers
- ✅ Communication patterns complete (event naming + payload structure)
- ✅ Process patterns complete (error handling + loading states)

### Gap Analysis Results

**No Critical Gaps** — Architecture coverage complete, ready for implementation.

**Secondary Suggestions (iterable later):**
1. **Drizzle ORM**: Consider migration from Prisma if heavy-write performance issues arise
2. **NextAuth v5 stability**: Monitor v5 LTS release, downgrade to v4 if needed
3. **Video frame file size limit**: Define in architecture (affects MinIO chunk size config)

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Implementation Handoff

**Overall Status: READY FOR IMPLEMENTATION** 🎉

**Confidence Level:** High — based on comprehensive validation checklist

**Next Steps:**
1. Initialize project: `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir`
2. Create epics/stories: Run `bmad-create-epics-and-stories`
3. First story: Project list page (routing + basic CRUD)

---

*Architecture document completed on 2026/04/29*
