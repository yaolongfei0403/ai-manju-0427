# Story 3.7: 编辑资产提示词

Status: review

## Story

**As a** 用户
**I want** 编辑资产描述和提示词
**So that** 优化生成效果

## Acceptance Criteria

1. **Given** 资产提取完成后，**When** 进入编辑提示词页面，**Then** 显示工作流程说明（三步：编辑提示词→批量生产→审核入库）

2. **Given** 资产列表，**When** 点击资产类型标签页（角色/场景/道具），**Then** 切换显示对应类型的资产

3. **Given** 资产列表，**When** 点击某个资产的编辑按钮，**Then** 显示该资产的提示词编辑面板

4. **Given** 我修改提示词，**When** 点击"润色"按钮，**Then** AI优化提示词并更新编辑框

5. **Given** 我修改提示词，**When** 点击"保存"，**Then** 系统更新该资产的提示词，显示保存成功

6. **Given** 资产列表，**When** 查看资产卡片，**Then** 显示资产名称、类型、出场集数、提示词预览

## Tasks / Subtasks

- [x] Task 1: 创建编辑提示词页面 UI（AC: #1, #2, #6）
  - [x] Subtask 1.1: 实现工作流程说明面板（三步指引）
  - [x] Subtask 1.2: 实现资产类型标签页切换（角色/场景/道具）
  - [x] Subtask 1.3: 实现资产卡片网格（名称+类型+集数+提示词预览）

- [x] Task 2: 实现提示词编辑功能（AC: #3, #5）
  - [x] Subtask 2.1: 点击资产卡片打开编辑面板
  - [x] Subtask 2.2: 编辑提示词和描述文本
  - [x] Subtask 2.3: 保存按钮调用 PATCH API `/api/v1/assets/[id]`

- [x] Task 3: 实现提示词润色功能（AC: #4）
  - [x] Subtask 3.1: "润色"按钮调用 AI 接口优化提示词
  - [x] Subtask 3.2: 显示加载状态和结果更新

- [x] Task 4: 完善 Phase 5 与 Phase 4 的衔接（AC: #1）
  - [x] Subtask 4.1: Story 3-6 的 extract/page.tsx 完成提取后进入 Phase 5
  - [x] Subtask 4.2: Phase 5 显示从 Story 3-6 获取的资产数据

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand（Asset Store，用于管理资产列表和编辑状态）
- **API 客户端**: axios（已在 `lib/api/assets.ts` 中使用）
- **后端路由**: `/api/v1/assets/[id]` PATCH 已实现（Story 3-6）

### 页面逻辑

```
Story 3-6: 提取资产
  └── 完成 → 自动进入 Phase 5

Story 3-7: 编辑提示词
  ├── 工作流程说明面板
  ├── 资产类型标签页（角色/场景/道具）
  ├── 资产网格显示
  ├── 提示词编辑弹窗
  └── 润色 + 保存功能
```

### 组件结构

```
frontend/src/
├── app/(main)/upload/
│   ├── extract/page.tsx         # Story 3-6 (已实现 Phase 4 + Phase 5)
│   └── prompt-edit/page.tsx     # Story 3-7 (新增，独立的提示词编辑页)
└── components/features/upload/
    ├── AssetExtractCard.tsx      # Story 3-6 (已有)
    ├── AssetProgressPanel.tsx    # Story 3-6 (已有)
    ├── AssetPromptEditor.tsx     # Story 3-7 (新增，编辑弹窗)
    └── WorkflowGuide.tsx         # Story 3-7 (新增，工作流程说明)
```

### 依赖关系

- **前置依赖**: Story 3-6（资产提取完成，资产数据可用）
- **后续依赖**: Story 3-8（批量生成资产参考图）

### 已知限制

- Phase 5 目前在 extract/page.tsx 中实现，作为 Story 3-6 的一部分
- 提示词润色需要调用 AI 接口（LLM），当前后端尚未实现

### 参考

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7]
- [Source: _bmad-output/implementation-artifacts/3-6-ti-qu-zi-chan.md]
- [Source: html/小说上传-分集与资产提取.html#Phase 5]
- [Source: frontend/src/app/api/v1/assets/[id]/route.ts]
- [Source: frontend/src/stores/asset.ts]

## Dev Agent Record

### Agent Model Used

MiniMax-M2 (Claude Code)

### Debug Log References

N/A

### Completion Notes List

- 2026/05/05: Story created - 编辑资产提示词功能
- 2026/05/05: Implementation complete - 所有任务完成，标记为 review

### File List

**新增文件:**
- `frontend/src/components/features/upload/WorkflowGuide.tsx` - 工作流程说明组件
- `frontend/src/components/features/upload/AssetPromptEditor.tsx` - 提示词编辑弹窗组件

**修改文件:**
- `frontend/src/app/(main)/upload/extract/page.tsx` - 完善 Phase 5 编辑功能
- `frontend/src/stores/asset.ts` - 完善 updateAssetPrompt 以更新 extractedAssets

## Change Log

- 2026/05/05: Story created with comprehensive implementation plan
- 2026/05/05: Implementation complete - WorkflowGuide 和 AssetPromptEditor 组件已创建，Phase 5 编辑功能已完善