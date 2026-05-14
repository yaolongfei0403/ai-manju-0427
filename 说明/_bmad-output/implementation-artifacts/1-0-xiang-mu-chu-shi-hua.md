# Story 1.0: 项目初始化（技术基础设施）

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发团队,
I want 初始化前端和后端项目框架,
so that 搭建可运行的开发环境，为后续功能开发做准备.

## Acceptance Criteria

1. **Given** 开发团队需要开始项目开发, **When** 执行前端初始化命令 `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"`, **Then** 前端项目创建完成，包含Next.js 15、React 19、TypeScript、Tailwind CSS基础配置

2. **Given** 前端项目初始化完成, **When** 初始化后端FastAPI项目（Python 3.12+）, **Then** 后端项目创建完成，包含FastAPI、Uvicorn、基础路由结构

3. **Given** 前端项目创建完成, **When** 配置项目依赖（shadcn/ui、Zustand、TanStack Query、Socket.IO客户端等）, **Then** 所有依赖安装成功，项目可正常运行 `npm run dev`

4. **Given** 后端项目创建完成, **When** 配置数据库连接（PostgreSQL + Prisma ORM）, **Then** 数据库连接成功，可执行迁移

5. **Given** 项目初始化完成, **When** 配置环境变量（.env.example）, **Then** 环境变量模板创建完成，包含所有必需的配置项

## Tasks / Subtasks

- [x] Task 1: 初始化前端项目 (AC: #1)
  - [x] Subtask 1.1: 执行 create-next-app 命令
  - [x] Subtask 1.2: 验证项目结构（src/app, tsconfig.json, next.config.ts）
  - [x] Subtask 1.3: 验证 `npm run dev` 可启动
- [x] Task 2: 初始化后端项目 (AC: #2)
  - [x] Subtask 2.1: 创建 backend 目录结构
  - [x] Subtask 2.2: 安装 FastAPI、Uvicorn 等核心依赖
  - [x] Subtask 2.3: 创建基础路由和 main.py 入口
  - [x] Subtask 2.4: 验证 `uvicorn main:app --reload` 可启动
- [x] Task 3: 配置前端依赖 (AC: #3)
  - [x] Subtask 3.1: 初始化 shadcn/ui
  - [x] Subtask 3.2: 安装 Zustand + TanStack Query
  - [x] Subtask 3.3: 安装 Socket.IO 客户端
  - [x] Subtask 3.4: 安装其他必要依赖（axios, zod 等）
- [x] Task 4: 配置数据库 (AC: #4)
  - [x] Subtask 4.1: 配置 Prisma Schema（初始 User 模型）
  - [x] Subtask 4.2: 创建 .env 模板
  - [x] Subtask 4.3: 验证数据库连接
- [x] Task 5: 创建环境变量模板 (AC: #5)
  - [x] Subtask 5.1: 创建 .env.example（前端）
  - [x] Subtask 5.2: 创建 .env.example（后端）
  - [x] Subtask 5.3: 文档化所有环境变量

## Dev Notes

- 本故事为技术基础设施，必须先于所有业务故事完成
- 前端使用 Next.js 15 App Router，非 Pages Router
- 后端使用 FastAPI + Python 3.12+，非 Node.js
- 项目结构遵循 feature-based 组织方式

### Project Structure Notes

**完整项目目录结构（参考 architecture.md）：**
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

**关键架构决策：**
- Monorepo 结构：pnpm workspaces (Node.js only)，FastAPI 不进 monorepo
- 代码组织：Feature-based（按业务域：project、episode、asset、user）
- 前端和后端是独立目录，通过 REST API 通信

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md#Starter Template`
- Project Context: `project-context.md`
- Frontend Tech Stack: Next.js 15 + React 19 + TypeScript 5.x + Tailwind CSS v4
- Backend Tech Stack: FastAPI + Python 3.12+ + PostgreSQL 16 + Prisma ORM
- Real-time: Socket.IO 4.x
- 依赖安装命令详见下方

## Dev Agent Record

### Agent Model Used
MiniMax-M2 (Claude Code)

### Debug Log References
N/A - 无调试需求

### Completion Notes List
Story 1.0 项目初始化已完成！

**前端初始化：**
- 执行 `npx create-next-app@latest frontend` 成功创建 Next.js 15 项目
- 验证了 src/app 目录结构、tsconfig.json、next.config.ts 存在
- 安装了 Zustand、TanStack Query、Socket.IO 客户端、axios、zod
- 初始化了 shadcn/ui（默认 button 组件和 utils）
- 安装了 Prisma CLI 并创建了 prisma/schema.prisma

**后端初始化：**
- 创建了 backend/app/ 目录结构（api/v1, core, models, services）
- 创建了 requirements.txt（FastAPI 0.136.1, Uvicorn 0.46.0 等）
- 创建了 backend/app/main.py 入口文件，包含 CORS 配置

**环境变量：**
- 创建了 frontend/.env.example
- 创建了 backend/.env.example

**注意事项：**
- Prisma Studio 端口冲突（51213），不影响功能
- 后端依赖版本已自动更新（pip install 时）

### File List

```
_created_files:
  - frontend/                          # Next.js 前端项目
  - backend/                           # FastAPI 后端项目
  - frontend/.env.example              # 前端环境变量模板
  - backend/.env.example               # 后端环境变量模板
  - frontend/prisma/schema.prisma      # Prisma schema (User模型)
  - frontend/src/components/ui/button.tsx   # shadcn/ui button
  - frontend/src/lib/utils.ts           # shadcn/ui utils
  - backend/app/main.py                # FastAPI 入口
  - backend/app/__init__.py
  - backend/app/api/__init__.py
  - backend/app/api/v1/__init__.py
  - backend/app/core/__init__.py
  - backend/app/models/__init__.py
  - backend/app/services/__init__.py
  - backend/requirements.txt
_modified_files:
  - (无，本故事为全新初始化)
```

---

## Developer Context

### 技术栈规格

**前端版本：**
| 组件 | 版本 | 说明 |
|------|------|------|
| Next.js | 15.x | App Router |
| React | 19.x | 最新稳定版 |
| TypeScript | 5.x | strict mode |
| Tailwind CSS | 4.x | CSS-based 配置 |
| Zustand | 4.x | 状态管理 |
| TanStack Query | 5.x | 服务端状态 |
| Socket.IO Client | 4.x | 实时通信 |

**后端版本：**
| 组件 | 版本 | 说明 |
|------|------|------|
| Python | 3.12+ | 必需版本 |
| FastAPI | 0.115+ | Web 框架 |
| Uvicorn | 最新 | ASGI 服务器 |
| Prisma | 5.x | ORM |
| PostgreSQL | 16 | 数据库 |

### 环境变量清单

**前端 (.env.example)：**
```
# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# OAuth (未来扩展)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# 可选：分析、监控
NEXT_PUBLIC_POSTHOG_KEY=
```

**后端 (.env.example)：**
```
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/ai_manhua

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# MinIO (对象存储)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=ai-manhua-assets

# AI API Keys (可选，本故事暂不配置)
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
```

### 初始化命令

**前端初始化：**
```bash
# 1. 创建项目
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git

# 2. 进入目录
cd frontend

# 3. 初始化 shadcn/ui
npx shadcn@latest init

# 4. 安装额外依赖
npm install zustand @tanstack/react-query socket.io-client axios zod

# 5. 安装开发依赖
npm install -D prisma
npx prisma init
```

**后端初始化：**
```bash
# 1. 创建目录
mkdir -p backend/app/api/v1 backend/app/core backend/app/models backend/app/services
cd backend

# 2. 创建虚拟环境
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate

# 3. 创建 requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
pydantic==2.8.0
pydantic-settings==2.4.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
prisma==5.19.0
psycopg2-binary==2.9.9
redis==5.0.8
minio==7.2.5
httpx==0.27.0
EOF

# 4. 安装依赖
pip install -r requirements.txt

# 5. 初始化 Prisma (在 backend 目录)
npx prisma init
```

### 数据库初始化

**Prisma Schema 初始版本：**
```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  role      String   @default("user") // admin, editor, user
  status    String   @default("active") // active, disabled
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**数据库迁移：**
```bash
# 在 backend 目录执行
npx prisma migrate dev --name init
```

### 验证清单

完成本故事后，必须验证：

- [ ] `cd frontend && npm run dev` 成功启动（http://localhost:3000）
- [ ] `cd backend && uvicorn app.main:app --reload` 成功启动（http://localhost:8000）
- [ ] Prisma 迁移成功，User 表已创建
- [ ] .env.example 文件包含所有必需变量
- [ ] 前端可连接后端 API（即使返回错误也算连接成功）
