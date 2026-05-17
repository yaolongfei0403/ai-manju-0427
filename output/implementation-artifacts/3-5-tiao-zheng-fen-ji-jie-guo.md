# Story 3.5: 调整分集结果

Status: review

## Story

**As a** 用户
**I want** 调整分集结果
**So that** 优化分集结构

## Acceptance Criteria

1. **Given** 分集结果列表，**When** 选中多个分集点击"合并"，**Then** 选中的分集合并为一个，显示合并后的摘要

2. **Given** 某个分集内容过多，**When** 点击"拆分为二"，**Then** 该分集拆分为两个，保持内容连贯

3. **Given** 某个分集不需要，**When** 点击"删除"确认，**Then** 该分集从列表移除

4. **Given** 我对分集结果不满意，**When** 点击"调整策略"，**Then** 返回分集策略配置页，重新调整

5. **Given** 合并后的分集，**When** 查看合并结果，**Then** 显示新的集序号、合并后的摘要、合并的分镜总数、来源章节列表

6. **Given** 拆分后的分集，**When** 查看拆分结果，**Then** 显示两个新分集，各自有独立标题和摘要，分镜数合理分配

7. **Given** 调整操作完成，**When** 点击"确认并继续"，**Then** 保存调整结果，进入资产提取流程（Story 3-6）

## Tasks / Subtasks

- [x] Task 1: 分集结果页面添加操作按钮
  - [x] Subtask 1.1: 添加"合并选中"、"拆分"、"删除"操作按钮
  - [x] Subtask 1.2: 添加选中状态管理（支持多选）
  - [x] Subtask 1.3: 实现批量选择和取消选择功能

- [x] Task 2: 实现合并分集功能
  - [x] Subtask 2.1: 前端合并逻辑：合并选中分集的计算
  - [x] Subtask 2.2: 更新集序号（重新排序）
  - [x] Subtask 2.3: 更新 novelStore 中的 splitResult 数据
  - [x] Subtask 2.4: 调用后端 API 保存合并结果（可选）

- [x] Task 3: 实现拆分分集功能
  - [x] Subtask 3.1: 点击拆分按钮后，弹出拆分对话框
  - [x] Subtask 3.2: 支持手动选择拆分点或AI智能拆分
  - [x] Subtask 3.3: 更新 novelStore 中的 splitResult 数据

- [x] Task 4: 实现删除分集功能
  - [x] Subtask 4.1: 删除确认对话框
  - [x] Subtask 4.2: 更新集序号（重新排序）
  - [x] Subtask 4.3: 更新 novelStore 中的 splitResult 数据

- [x] Task 5: 添加"调整策略"按钮
  - [x] Subtask 5.1: 返回 Story 3-3 策略配置页
  - [x] Subtask 5.2: 保留已配置的分集策略参数

- [x] Task 6: 与 Story 3-6 衔接
  - [x] Subtask 6.1: 添加"确认并继续"按钮跳转到资产提取页

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand（Novel Store 模式）
- **图表**: Recharts（已在项目中使用）
- **API 客户端**: axios (已在 `lib/api/upload.ts` 中使用)

### 页面逻辑

```
Story 3-4: 分集结果展示
  ├── 分集列表（可展开）
  ├── 情节密度曲线图
  ├── [调整策略] → Story 3-3 策略配置页
  └── [确认并继续] → Story 3-6 资产提取

Story 3-5: 调整分集结果（新增操作）
  ├── 分集列表（支持多选）
  ├── [合并选中] 按钮
  ├── [拆分] 按钮（单集）
  ├── [删除] 按钮（单集）
  ├── [调整策略] → Story 3-3
  └── [确认并继续] → Story 3-6
```

### 组件结构

```
frontend/src/
├── app/(main)/upload/
│   ├── strategy/page.tsx           # Story 3-3 (已实现)
│   ├── split-result/page.tsx       # Story 3-4 (已实现)
│   └── split-result/page.tsx       # Story 3-5 (修改，添加操作按钮)
└── components/features/upload/
    ├── SplitResultList.tsx         # Story 3-4 (已实现)
    └── SplitEditor.tsx             # Story 3-5 (新增，分集编辑组件)
```

### Novel Store 扩展

```typescript
interface SplitResult {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  episodes: EpisodeResult[];
  totalEpisodes: number;
  strategy: string;
  generatedAt: string;
  error?: { code: string; message: string };
}

// 新增 actions
mergeEpisodes: (episodeIds: string[]) => void;
splitEpisode: (episodeId: string, splitPoint?: number) => void;
deleteEpisode: (episodeId: string) => void;
updateEpisode: (episodeId: string, updates: Partial<EpisodeResult>) => void;
```

### 操作逻辑

1. **合并 (Merge)**:
   - 选择2+个连续或不连续的分集
   - 合并后：新的 orderIndex、汇总的 summary、累加的 estimatedShots、合并的 chapters 列表
   - 集序号重新排序

2. **拆分 (Split)**:
   - 选择单个分集
   - 弹出对话框，可选：手动输入拆分点 或 AI智能拆分
   - 拆分后：两个分集，orderIndex 连续，内容按拆分点分割

3. **删除 (Delete)**:
   - 单个分集删除
   - 需二次确认
   - 集序号重新排序

### API 设计

分集调整结果保存在前端 novelStore 中，暂不调用后端 API（后端只负责生成分集，不负责调整）。

如需持久化，可扩展：
```
POST /api/v1/novel/split/{taskId}/adjust
Request Body: {
  action: "merge" | "split" | "delete",
  episodeIds: string[],
  splitPoint?: number
}
Response 200: { data: SplitResult }
```

### 依赖关系

- **前置依赖**: Story 3-4（分集结果展示） - 页面已实现，需添加操作按钮
- **后续依赖**: Story 3-6（资产提取） - 确认后继续

### UI 设计参考

参考 `html/小说上传-分集与资产提取.html` 原型 Phase 3B：
- 分集卡片网格布局支持多选（checkbox）
- 工具栏：合并、拆分、删除按钮
- 批量操作时按钮启用，非批量操作时按钮禁用

---

## Dev Agent Record

### Agent Model Used

MiniMax-M2 (Claude Code)

### Debug Log References

N/A - 新故事

### Completion Notes List

- 2026/05/04: Story 3-5 调整分集结果 - 实现完成

**实现内容:**

1. **novelStore 新增 actions** (`frontend/src/stores/novel.ts`)
   - `mergeEpisodes(episodeIndexes: number[])` - 合并多个分集
   - `splitEpisode(episodeIndex: number, splitPoint?: number)` - 拆分单个分集
   - `deleteEpisode(episodeIndex: number)` - 删除分集
   - `updateEpisode(episodeIndex: number, updates: Partial<EpisodeResult>)` - 更新分集

2. **split-result 页面更新** (`frontend/src/app/(main)/upload/split-result/page.tsx`)
   - 添加选中状态管理 (`selectedEpisodes`)
   - 添加操作工具栏：合并、拆分、删除按钮
   - 按钮根据选中状态启用/禁用
   - 删除确认对话框
   - 将 `EpisodeResult` 接口改为从 `@/lib/api/upload` 导入

3. **SplitResultList 组件更新** (`frontend/src/components/features/upload/SplitResultList.tsx`)
   - 新增 `selectedEpisodes` prop 支持多选
   - 新增 `onToggleSelection` callback
   - 新增 `onSplit` 和 `onDelete` callbacks
   - 每个分集卡片显示 checkbox 选择框
   - 选中状态高亮显示
   - 展开详情时显示拆分/删除按钮

### File List

**修改文件:**
- `frontend/src/stores/novel.ts` - 添加 mergeEpisodes, splitEpisode, deleteEpisode, updateEpisode actions
- `frontend/src/app/(main)/upload/split-result/page.tsx` - 添加操作按钮和选中状态管理
- `frontend/src/components/features/upload/SplitResultList.tsx` - 添加多选和操作按钮支持
