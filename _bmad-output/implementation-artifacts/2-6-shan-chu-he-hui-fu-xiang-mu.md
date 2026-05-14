# Story 2.6: 删除和恢复项目

Status: done

## Story

**As a** 用户
**I want** 删除和恢复项目
**So that** 管理不需要的项目

## Acceptance Criteria

1. **Given** 我在项目列表或详情页点击"删除", **When** 确认删除（二次确认弹窗）, **Then** 项目移入回收站（状态变为trashed），从列表隐藏，显示"已移到回收站"

2. **Given** 我切换到"回收站"筛选, **When** 查看已删除项目, **Then** 显示回收站中的项目列表

3. **Given** 我在回收站中点击"恢复", **When** 确认恢复, **Then** 项目恢复到原状态，重新显示在列表中

## Tasks / Subtasks

- [x] Task 1: 实现删除功能 (AC: #1)
  - [x] Subtask 1.1: 已有确认删除弹窗
  - [x] Subtask 1.2: 调用 API 将项目状态设为 trashed
  - [x] Subtask 1.3: 显示删除成功提示
- [x] Task 2: 实现回收站视图 (AC: #2)
  - [x] Subtask 2.1: 添加回收站 Tab 筛选
  - [x] Subtask 2.2: 显示回收站项目列表
- [x] Task 3: 实现恢复功能 (AC: #3)
  - [x] Subtask 3.1: 添加恢复按钮
  - [x] Subtask 3.2: 调用 API 将项目状态恢复原状态

## Dev Notes

### 状态变更

- `trashed` - 回收站状态
- 恢复时状态变回 `draft`

### API

```
POST /api/v1/projects/:id/restore
```
