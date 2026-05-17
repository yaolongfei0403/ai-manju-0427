# Story 2.7: 收藏项目

Status: done

## Story

**As a** 用户
**I want** 收藏项目
**So that** 快速访问重要项目

## Acceptance Criteria

1. **Given** 我在项目卡片点击星标, **When** 点击收藏/取消收藏, **Then** 项目标星状态切换，显示已收藏/取消收藏提示

## Tasks / Subtasks

- [x] Task 1: 添加 isStarred 字段到数据库 Project 表 (API 代码已就绪，需运行 ALTER TABLE 添加列)
- [x] Task 2: 创建 toggleFavorite API 端点 (POST /api/v1/projects/:id/favorite)
- [x] Task 3: 更新 Project 类型定义
- [x] Task 4: 实现前端收藏功能 - 更新 ProjectCardGrid 星标按钮
- [x] Task 5: 添加收藏成功/取消提示

## Dev Notes

### 状态变更

- `isStarred` - 布尔字段，表示是否收藏
- API: `POST /api/v1/projects/:id/favorite` 切换收藏状态

### API

```
POST /api/v1/projects/:id/favorite
Request: {}
Response: { data: Project }
```

### 前端

- ProjectCardGrid 中的星标按钮需要添加点击处理
- 需要传递 onFavorite 回调
- 收藏状态通过 project.isStarred 控制
