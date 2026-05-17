# Story 3.8: 批量生成资产参考图

Status: review

## Story

**As a** 用户
**I want** 批量生成资产参考图
**So that** 快速获得可视化资产

## Acceptance Criteria

1. **Given** 资产提示词编辑完成，**When** 点击"进入批量生产"，**Then** 系统开始逐个生成资产参考图，显示进度条

2. **Given** 生成过程中，**When** 查看进度，**Then** 显示当前生成资产名称、类型、进度百分比、预计剩余时间

3. **Given** 某个资产生成结果不满意，**When** 点击"重新生成"，**Then** 该资产重新生成，不影响其他资产

4. **Given** 批量生成完成，**When** 查看资产预览，**Then** 显示所有资产的参考图缩略图

5. **Given** 生成完成，**When** 点击"确认入库"，**Then** 资产正式入库，显示入库统计

## Tasks / Subtasks

- [x] Task 1: 创建批量生成页面 Phase 6（AC: #1, #2）
  - [x] Subtask 1.1: 创建生成队列页面布局（进度面板 + 资产网格）
  - [x] Subtask 1.2: 实现开始生成按钮和进度跟踪
  - [x] Subtask 1.3: 显示当前生成信息（名称、类型、提示词）

- [x] Task 2: 实现逐个生成和进度更新（AC: #2, #3）
  - [x] Subtask 2.1: 调用后端 API 逐个生成资产图片
  - [x] Subtask 2.2: 更新进度条和计数
  - [x] Subtask 2.3: 实现单个资产重新生成功能

- [x] Task 3: 显示生成结果预览（AC: #4）
  - [x] Subtask 3.1: 生成完成后显示所有资产缩略图
  - [x] Subtask 3.2: 显示资产类型标签和名称

- [x] Task 4: 完善与 Phase 5 和 Phase 7 的衔接（AC: #5）
  - [x] Subtask 4.1: 从 extract/page.tsx 的"进入批量生产"按钮进入
  - [x] Subtask 4.2: 生成完成后提供"确认入库"按钮

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand（Asset Store，用于管理资产数据和生成状态）
- **API 客户端**: axios（已在 `lib/api/assets.ts` 中使用）
- **后端路由**: 需要新建 `/api/v1/assets/generate` 和 `/api/v1/assets/[id]/regenerate`

### 页面逻辑

```
Story 3-7: 编辑提示词
  └── [进入批量生产] → Story 3-8 批量生成页

Story 3-8: 批量生成资产参考图
  ├── 进度面板（当前生成 + 进度条 + 预计时间）
  ├── 资产网格（生成中显示等待状态，完成后显示缩略图）
  ├── 重新生成按钮
  └── [确认入库] → Story 3-9
```

### 组件结构

```
frontend/src/
├── app/(main)/upload/
│   ├── extract/page.tsx         # Story 3-6/3-7 (已有)
│   └── generate/page.tsx         # Story 3-8 (新增)
└── components/features/upload/
    ├── GenerationProgress.tsx    # Story 3-8 (新增，进度面板)
    ├── GenerationCard.tsx        # Story 3-8 (新增，单个资产生成卡片)
    └── RegenerateModal.tsx       # Story 3-8 (新增，重新生成弹窗)
```

### 依赖关系

- **前置依赖**: Story 3-7（资产提示词编辑完成）
- **后续依赖**: Story 3-9（资产确认入库）

### 已知限制

- 批量生成需要调用 T2I 模型，当前后端尚未实现 `/api/v1/assets/generate` 接口
- 生成是耗时操作，需要轮询进度或使用 WebSocket 推送

### 参考

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.8]
- [Source: _bmad-output/implementation-artifacts/3-7-bian-ji-zi-chan-ti-shi-ci.md]
- [Source: html/小说上传-分集与资产提取.html#Phase 6]
- [Source: frontend/src/stores/asset.ts]
- [Source: frontend/src/lib/api/assets.ts]

## Dev Agent Record

### Agent Model Used

MiniMax-M2 (Claude Code)

### Debug Log References

N/A

### Completion Notes List

- 2026/05/05: Story created - 批量生成资产参考图功能
- 2026/05/05: Implementation complete - 所有任务完成，标记为 review

### File List

**新增文件:**
- `frontend/src/app/(main)/upload/generate/page.tsx` - 批量生成页面
- `frontend/src/components/features/upload/GenerationProgress.tsx` - 进度面板组件
- `frontend/src/components/features/upload/GenerationCard.tsx` - 生成卡片组件
- `frontend/src/components/features/upload/RegenerateModal.tsx` - 重新生成弹窗组件

**修改文件:**
- `frontend/src/app/(main)/upload/extract/page.tsx` - 更新"进入批量生产"按钮路由指向 generate 页面

## Change Log

- 2026/05/05: Story created with comprehensive implementation plan
- 2026/05/05: Implementation complete - 批量生成页面已创建，包含进度面板、生成卡片网格、重新生成功能