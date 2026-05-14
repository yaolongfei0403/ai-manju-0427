# Story 2.5: 复制项目

Status: review

## Story

**As a** 用户
**I want** 复制现有项目
**So that** 快速创建相似项目

## Acceptance Criteria

1. **Given** 我在项目卡片点击"复制", **When** 点击确认复制, **Then** 创建项目副本（名称添加"副本"后缀），跳转新项目

## Tasks / Subtasks

- [x] Task 1: 添加复制按钮到项目卡片 (AC: #1)
  - [x] Subtask 1.1: 在 ProjectCardGrid 添加复制按钮
  - [x] Subtask 1.2: 在项目详情页添加复制按钮
- [x] Task 2: 创建确认复制弹窗 (AC: #1)
  - [x] Subtask 2.1: 创建 ConfirmDialog 组件
  - [x] Subtask 2.2: 显示复制确认信息
- [x] Task 3: 实现复制 API (AC: #1)
  - [x] Subtask 3.1: 创建 `POST /api/v1/projects/[id]/duplicate` API Route
  - [x] Subtask 3.2: 创建新项目，名称添加"副本"后缀
- [x] Task 4: 复制成功后跳转 (AC: #1)
  - [x] Subtask 4.1: 调用 API 复制项目
  - [x] Subtask 4.2: 跳转到项目列表页

## Dev Notes

### API 设计

```
POST /api/v1/projects/:id/duplicate
Authorization: Bearer <token>

Response:
{ "data": Project }
```

### 复制逻辑

1. 获取原项目数据
2. 创建新项目，名称 = 原名称 + " 副本"
3. 其他字段保持一致
4. 状态设为 draft
