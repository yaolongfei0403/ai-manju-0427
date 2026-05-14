# Story 2.4: 编辑项目

Status: done

## Story

**As a** 用户
**I want** 编辑项目配置
**So that** 调整项目设置

## Acceptance Criteria

1. **Given** 我在项目详情页点击编辑, **When** 修改项目简介、题材、受众、风格、画幅比例、AI模型配置，点击保存, **Then** 系统更新配置，显示保存成功提示

2. **Given** 我尝试修改项目名称, **When** 编辑项目名称, **Then** 系统提示"项目名称创建后不可修改"（只读）

## Tasks / Subtasks

- [x] Task 1: 创建项目详情页 (AC: #1, #2)
  - [x] Subtask 1.1: 创建 `frontend/src/app/(main)/projects/[id]/page.tsx` 路由
  - [x] Subtask 1.2: 显示项目信息（名称只读、状态、配置等）
  - [x] Subtask 1.3: 添加编辑按钮
- [x] Task 2: 创建项目编辑表单 (AC: #1, #2)
  - [x] Subtask 2.1: 创建 `ProjectEditForm` 组件
  - [x] Subtask 2.2: 项目名称设为只读，提示不可修改
  - [x] Subtask 2.3: 可编辑字段（简介、题材、受众、风格、画幅比例、AI模型）
  - [x] Subtask 2.4: 表单验证和保存逻辑
- [x] Task 3: 实现 API 更新接口 (AC: #1)
  - [x] Subtask 3.1: 创建 `PUT /api/v1/projects/[id]` API Route
  - [x] Subtask 3.2: 实现数据验证和更新
- [x] Task 4: 更新 Store 和 UI (AC: #1)
  - [x] Subtask 4.1: 添加 `updateProject` action 到 project store
  - [x] Subtask 4.2: 添加保存成功提示

## Dev Notes

### 页面路径

`/projects/[id]` - 项目详情页

### API 设计

```
PUT /api/v1/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "description": string,
  "genre": string,
  "targetAudience": string,
  "style": string,
  "aspectRatio": string,
  "width": number,
  "height": number,
  "llmModel": string,
  "t2iModel": string,
  "i2vModel": string,
  "samplingSteps": number,
  "cfgScale": number,
  "shareAssets": boolean
}

Response:
{ "data": Project }
```

### 项目名称只读

项目名称在创建时确定，编辑时不可修改。表单中显示为禁用状态并有提示。
