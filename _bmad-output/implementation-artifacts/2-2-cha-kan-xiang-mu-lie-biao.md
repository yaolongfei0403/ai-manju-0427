# Story 2.2: 查看项目列表

Status: review

## Story

**As a** 用户
**I want** 查看所有项目列表
**So that** 管理和选择要编辑的项目

## Acceptance Criteria

1. **Given** 我有多个项目, **When** 访问项目列表页, **Then** 显示所有项目卡片（封面、名称、状态、进度、集数/分镜数）

2. **Given** 我没有项目, **When** 访问项目列表页, **Then** 显示空状态引导"还没有项目，创建你的第一个漫剧吧"

3. **Given** 在项目列表页, **When** 点击项目卡片, **Then** 跳转到项目详情页

## Tasks / Subtasks

- [x] Task 1: 创建项目列表页面路由 (AC: #1, #2, #3)
  - [x] Subtask 1.1: 创建 `frontend/src/app/(main)/projects/page.tsx` 路由
  - [x] Subtask 1.2: 创建项目列表页面布局（Header + 内容区）
  - [x] Subtask 1.3: 复用 GlobalHeader 组件
- [x] Task 2: 实现项目卡片组件 (AC: #1, #3)
  - [x] Subtask 2.1: 创建 `ProjectCard` 组件
  - [x] Subtask 2.2: 显示项目封面、名称、状态、进度
  - [x] Subtask 2.3: 显示集数/分镜数统计
  - [x] Subtask 2.4: 点击卡片跳转详情页
- [x] Task 3: 实现网格/列表视图切换 (AC: #1)
  - [x] Subtask 3.1: 添加视图切换按钮
  - [x] Subtask 3.2: 实现网格视图布局
  - [x] Subtask 3.3: 实现列表视图布局
- [x] Task 4: 实现空状态引导 (AC: #2)
  - [x] Subtask 4.1: 创建空状态组件
  - [x] Subtask 4.2: 显示引导文案和创建按钮
- [x] Task 5: 集成 Store 获取项目数据 (AC: #1)
  - [x] Subtask 5.1: 使用 `fetchProjects` 加载项目列表
  - [x] Subtask 5.2: 显示加载状态
  - [x] Subtask 5.3: 处理错误状态

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand (已有 project store)
- **API 客户端**: axios (已在 `lib/api/projects.ts` 中使用)
- **路由**: App Router 文件系统路由

### 项目列表页面设计

页面路径: `/projects`

页面结构:
```
+------------------------------------------+
|              GlobalHeader                 |
+------------------------------------------+
|  我的项目              [+ 新建项目] [网格][列表] |
+------------------------------------------+
|                                          |
|  +--------+  +--------+  +--------+     |
|  | 项目1   |  | 项目2   |  | 项目3   |     |
|  | 封面   |  | 封面   |  | 封面   |     |
|  | 状态   |  | 状态   |  | 状态   |     |
|  +--------+  +--------+  +--------+     |
|                                          |
|  +--------+  +--------+  +--------+     |
|  | 项目4   |  | 项目5   |  | 项目6   |     |
|  +--------+  +--------+  +--------+     |
|                                          |
+------------------------------------------+
```

### API 端点

```
GET /api/v1/projects
Authorization: Bearer <token>

Response:
{
  "data": [
    {
      "id": "proj_xxx",
      "name": "项目名称",
      "description": "项目描述",
      "genre": "scifi",
      "style": "scifi-real",
      "status": "draft",
      "coverUrl": "https://...",
      "createdAt": "2026-04-29T00:00:00Z",
      "updatedAt": "2026-04-29T00:00:00Z"
    }
  ]
}
```

### 项目状态

- `draft`: 草稿
- `active`: 进行中
- `completed`: 已完成
- `trashed`: 已删除

### 视图切换

使用 React state 管理视图模式:
```typescript
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
```
