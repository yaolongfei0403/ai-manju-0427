# Story 1.3: 保持登录状态

Status: ready-for-dev

## Story

**As a** 已登录用户
**I want** 关闭浏览器后重新打开仍保持登录
**So that** 不需要频繁重新登录

## Acceptance Criteria

1. **Given** 我成功登录后关闭浏览器, **When** 7天内重新访问平台, **Then** 自动保持登录状态

2. **Given** 我点击"退出登录", **When** 确认退出, **Then** 清除会话，跳转登录页

## Tasks / Subtasks

- [ ] Task 1: 实现JWT Token存储和自动登录 (AC: #1)
  - [ ] Subtask 1.1: 创建 auth store (Zustand) 管理登录状态
  - [ ] Subtask 1.2: 实现页面加载时检查 localStorage 中的 token
  - [ ] Subtask 1.3: 验证 token 有效性（如过期检查）
  - [ ] Subtask 1.4: 实现自动登录逻辑
- [ ] Task 2: 实现退出登录功能 (AC: #2)
  - [ ] Subtask 2.1: 创建 logout 函数
  - [ ] Subtask 2.2: 清除 localStorage 中的 auth_token 和 user
  - [ ] Subtask 2.3: 跳转登录页
- [ ] Task 3: 创建全局认证检查 (AC: #1)
  - [ ] Subtask 3.1: 创建 middleware 检查登录状态
  - [ ] Subtask 3.2: 未登录用户访问受保护页面时跳转登录页

## Dev Notes

### 技术栈确认

- Zustand (状态管理)
- Next.js Middleware (路由保护)
- JWT (已在 Story 1.1, 1.2 中实现)

### JWT Token 结构

**Token Payload:**
```json
{
  "sub": "user_id",
  "username": "string",
  "role": "string",
  "exp": "expiration_timestamp"
}
```

**Token过期时间:** 7天

### 前端存储

**localStorage:**
- `auth_token`: JWT token 字符串
- `user`: 用户信息 JSON 字符串

### Auth Store 设计

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
}
```

### Middleware 设计

**受保护的路由：** `/projects`, `/upload`, `/assets`, `/user`

**检查流程：**
1. 检查 localStorage 中是否有 token
2. 解析 token 检查是否过期
3. 如果 token 无效，清除并跳转登录页

### 文件清单

**新建文件：**
- `frontend/src/stores/auth.ts` - Auth store (Zustand)
- `frontend/src/middleware.ts` - 认证中间件

**修改文件：**
- `frontend/src/app/(auth)/login/page.tsx` - 使用 auth store
- `frontend/src/app/(auth)/register/page.tsx` - 使用 auth store
- `frontend/src/app/layout.tsx` - 添加认证状态检查

---

## Dev Agent Record

### Agent Model Used
MiniMax-M2 (Claude Code)

### Debug Log References
N/A - 新故事

### Completion Notes List
Story 1.3 保持登录状态 - 待实现

---

## Change Log

- 2026/04/29: 故事文件创建 (status: ready-for-dev)
