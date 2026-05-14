# Story 1.2: 用户登录

Status: review

## Story

**As a** 已注册用户
**I want** 使用用户名和密码登录
**So that** 访问我的项目和内容

## Acceptance Criteria

1. **Given** 我输入正确的用户名和密码, **When** 点击登录, **Then** 验证通过，跳转项目列表

2. **Given** 密码错误, **When** 点击登录, **Then** 提示"用户名或密码错误"

3. **Given** 用户名不存在, **When** 点击登录, **Then** 提示"用户名或密码错误"（不区分是否存在，保护安全）

## Tasks / Subtasks

- [x] Task 1: 创建前端登录页面UI (AC: #1, #2, #3)
  - [x] Subtask 1.1: 创建 `frontend/src/app/(auth)/login/page.tsx` 登录页面
  - [x] Subtask 1.2: 实现用户名输入框
  - [x] Subtask 1.3: 实现密码输入框 + 密码显隐切换
  - [x] Subtask 1.4: 实现登录按钮（禁用状态处理）
  - [x] Subtask 1.5: 实现错误提示显示逻辑
- [x] Task 2: 实现后端登录API (AC: #1, #2, #3)
  - [x] Subtask 2.1: 创建 `POST /api/v1/auth/login` 接口
  - [x] Subtask 2.2: 实现用户名/密码验证（bcrypt）
  - [x] Subtask 2.3: 实现JWT token生成
  - [x] Subtask 2.4: 错误时统一返回"用户名或密码错误"（不泄露具体原因）
- [x] Task 3: 实现前端登录表单提交 (AC: #1, #2, #3)
  - [x] Subtask 3.1: 更新 `frontend/src/lib/api/auth.ts` 添加 login 函数
  - [x] Subtask 3.2: 实现表单提交和错误处理
  - [x] Subtask 3.3: 实现登录成功后跳转

## Dev Notes

### 技术栈确认

与 Story 1.1 相同：
- Next.js 15 (App Router)
- React 19
- TypeScript 5.x
- Tailwind CSS v4
- shadcn/ui
- bcrypt (密码验证)
- jsonwebtoken (JWT)

### 数据库模式

**User模型（已存在）：**
```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  role      String   @default("user")
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 登录API设计

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "role": "user",
      "status": "active"
    },
    "token": "jwt_token_string"
  }
}
```

**Error Response (400):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "用户名或密码错误"
  }
}
```

### 安全要求

- **不泄露具体错误**：无论是用户名不存在还是密码错误，统一返回"用户名或密码错误"
- **使用bcrypt验证密码**：使用 bcrypt.compare() 而不是简单字符串比较
- **JWT Token**：与注册相同的 token 生成逻辑

### 验证规则

**用户名验证：** 无特殊要求，用户可以输入任意字符

**密码验证：** 无特殊要求，只要与存储的哈希匹配即可

### 前端路由设计

**登录页面:** `frontend/src/app/(auth)/login/page.tsx`

**登录成功后的行为：**
1. 存储JWT token到客户端
2. 跳转到项目列表页 `/projects`

### 文件清单

**新建文件：**
- `frontend/src/app/(auth)/login/page.tsx` - 登录页面

**修改文件：**
- `frontend/src/lib/api/auth.ts` - 添加 login 函数
- `frontend/src/app/api/v1/auth/login/route.ts` - 添加登录 API

---

## Dev Agent Record

### Agent Model Used
MiniMax-M2 (Claude Code)

### Debug Log References
N/A - 新故事

### Completion Notes List
Story 1.2 用户登录 - 已完成实现

**后端实现：**
- 创建 `frontend/src/app/api/v1/auth/login/route.ts` - 登录 API

**前端实现：**
- 创建 `frontend/src/app/(auth)/login/page.tsx` - 登录页面
- 更新 `frontend/src/lib/api/auth.ts` - 添加 login 函数

**功能验证：**
- ✅ 正确用户名/密码登录成功
- ✅ 错误密码返回"用户名或密码错误"
- ✅ 不存在用户名返回"用户名或密码错误"（安全考虑统一错误信息）
- ✅ 登录页面正常加载

**文件清单：**
```
_created_files:
  - frontend/src/app/(auth)/login/page.tsx
  - frontend/src/app/api/v1/auth/login/route.ts
_modified_files:
  - frontend/src/lib/api/auth.ts
```

---

## Change Log

- 2026/04/29: 故事文件创建 (status: ready-for-dev)
- 2026/04/29: 完成实现 (status: review)

---

## Developer Context

### 依赖清单

已安装（Story 1.1）：
- bcryptjs
- jsonwebtoken
- @prisma/client

### 环境变量

**前端 (.env)：**
```
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/ai_manhua"
JWT_SECRET=ai-manhua-dev-secret-key-2026
JWT_EXPIRES_IN=7d
```
