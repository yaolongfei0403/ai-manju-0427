# Story 3.3: 配置AI分集策略

Status: review

## Story Foundation

**As a** 用户
**I want** 配置AI分集策略并启动智能拆解
**So that** 系统根据我的策略将小说自动拆分为合理的分集结构

## Acceptance Criteria

1. **Given** 我已确认免责条款, **When** 进入分集策略配置页面, **Then** 显示策略选择器、参数配置、高级选项和策略预览

2. **Given** 我在策略选择器中, **When** 点击"智能均衡/情节驱动/角色驱动"卡片, **Then** 该卡片高亮选中并隐藏自定义提示词区域

3. **Given** 我在策略选择器中, **When** 点击"自定义策略"卡片, **Then** 该卡片高亮选中并显示自定义提示词文本框

4. **Given** 策略已选中, **When** 我调整目标集数滑块, **Then** 右侧实时显示所选集数值（0=自动）

5. **Given** 策略已选中, **When** 我修改分镜数范围输入, **Then** 右侧实时显示新范围值

6. **Given** 所有配置完成, **When** 点击"开始智能拆解", **Then** 调用AI分集API并跳转到执行进度页面

7. **Given** 策略未选中或配置不完整, **When** 点击"开始智能拆解", **Then** 提示"请选择分集策略"

## Tasks / Subtasks

- [x] Task 1: 创建分集策略组件 StrategyConfig
  - [x] Subtask 1.1: 创建 `frontend/src/components/features/upload/StrategyConfig.tsx`
  - [x] Subtask 1.2: 实现4种策略卡片选择器（智能均衡/情节驱动/角色驱动/自定义）
  - [x] Subtask 1.3: 实现目标集数滑块（0=自动，范围0-50）
  - [x] Subtask 1.4: 实现分镜数范围输入（min-max）
  - [x] Subtask 1.5: 实现高级选项开关（保持章节完整性/首尾集特殊处理/保留插叙倒叙）
  - [x] Subtask 1.6: 实现自定义提示词文本框（仅自定义策略时显示）
  - [x] Subtask 1.7: 实现策略预览文本
  - [x] Subtask 1.8: 策略选择状态保存到 Novel Store
- [x] Task 2: 创建策略配置页面
  - [x] Subtask 2.1: 创建 `frontend/src/app/(main)/upload/strategy/page.tsx` 页面
  - [x] Subtask 2.2: 实现七步进度指示器（Step 3 高亮）
  - [x] Subtask 2.3: 从 novelStore 读取 fileId 和 disclaimerAgreed 状态
- [x] Task 3: 实现策略配置 API
  - [x] Subtask 3.1: 更新 Novel Store 添加 `splitStrategy` 状态和 `configureStrategy` action
  - [x] Subtask 3.2: 创建 `POST /api/v1/upload/novel/split` API Route
  - [x] Subtask 3.3: 创建执行进度页面 `frontend/src/app/(main)/upload/strategy/executing/page.tsx`

## Dev Notes

### 技术栈确认

- **前端框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui 组件
- **状态管理**: Zustand（Novel Store 模式参考 Story 3-1, 3-2）
- **API 客户端**: axios (已在 `lib/api/upload.ts` 中使用)

### 页面逻辑

```
Step 2: 免责确认 (已完成)
  ↓ 同意
Step 3: 配置分集策略
  ├── 策略选择卡片（4选1）
  │     ├── 智能均衡（默认选中）
  │     ├── 情节驱动
  │     ├── 角色驱动
  │     └── 自定义策略 → 显示文本框
  ├── 参数配置
  │     ├── 目标集数滑块（0=自动）
  │     └── 分镜数范围（min-max）
  ├── 高级选项（3个开关）
  ├── 策略预览文本
  ├── [返回] [开始智能拆解]
  ↓ 开始拆解
Step 3 执行: 执行进度页面
```

### 组件结构

```
frontend/src/
├── app/(main)/upload/
│   ├── strategy/page.tsx              # 策略配置页面（新增）
│   └── strategy/executing/page.tsx    # 执行进度页面（新增）
└── components/features/upload/
    ├── DisclaimerAgreement.tsx         # Story 3-2 已实现
    └── StrategyConfig.tsx             # 新增
```

### API 设计

**配置分集策略 API**:
```
POST /api/v1/upload/novel/split
Authorization: Bearer <token>

Request Body:
{
  "fileId": string,
  "strategy": "balanced" | "plot" | "character" | "custom",
  "targetEpisodes": 0,           // 0 = 自动
  "shotRangeMin": 8,
  "shotRangeMax": 14,
  "keepChapterIntegrity": true,
  "specialFirstLast": true,
  "preserveNarrative": false,
  "customPrompt": ""             // 仅 strategy=custom 时使用
}

Response 200:
{
  "data": {
    "taskId": "string",
    "status": "processing"
  }
}
```

### 策略卡片样式（参考原型）

| 策略 | 图标 | 颜色 | 描述 |
|------|------|------|------|
| 智能均衡 | `fa-scale-balanced` | emerald | 自动平衡章节完整性与情节节奏 |
| 情节驱动 | `fa-mountain` | primary | 以高潮、转折点和悬念为边界拆分 |
| 角色驱动 | `fa-users` | cyan | 以角色出场、成长和关系变化为边界 |
| 自定义策略 | `fa-wand-magic-sparkles` | amber | 输入个性化提示词定制 |

### Novel Store 扩展

```typescript
interface SplitStrategy {
  strategy: "balanced" | "plot" | "character" | "custom";
  targetEpisodes: number;
  shotRangeMin: number;
  shotRangeMax: number;
  keepChapterIntegrity: boolean;
  specialFirstLast: boolean;
  preserveNarrative: boolean;
  customPrompt: string;
}

// 新增状态和方法
splitStrategy: SplitStrategy | null;
configureStrategy: (fileId: string, strategy: SplitStrategy) => Promise<{ taskId: string }>;
```

### UI 设计参考

参考 `html/小说上传-分集与资产提取.html` 原型 Phase 3A：
- 深色科技风格 + 玻璃态面板
- 策略卡片网格布局（1/2/4列响应式）
- 选中卡片高亮 + 右上角勾选图标
- 滑块和数字输入联动显示
- 自定义提示词 textarea（仅自定义策略可见）
- 策略预览卡片（绿色边框提示框）
- "开始智能拆解"渐变按钮

### 依赖关系

- **前置依赖**: Story 3-2（确认免责条款）- 需要 fileId 和 disclaimerAgreed 状态
- **后续依赖**: Story 3-4（AI智能拆分小说）- 策略配置完成后才能进入分集拆分

### 注意事项

1. **步骤指示器**: Step 3 高亮，需要参考 Story 3-1, 3-2 的七步进度指示器实现
2. **参数校验**: 分镜数范围 min <= max
3. **自定义策略**: 仅当 strategy="custom" 时 customPrompt 才必填
4. **状态持久化**: 策略配置需要保存到 novelStore 或 localStorage，防止页面刷新丢失

---

## Change Log

- 2026/04/30: 故事文件创建 (status: ready-for-dev)
- 2026/04/30: 完成所有任务实现 (status: review)

---

## Dev Agent Record

### Agent Model Used
MiniMax-M2 (Claude Code)

### Debug Log References
N/A - 新故事

### Completion Notes List

Story 3-3 配置AI分集策略 - 已完成实现

**实现内容:**
1. StrategyConfig组件 `frontend/src/components/features/upload/StrategyConfig.tsx`
   - 4种策略卡片选择器（智能均衡/情节驱动/角色驱动/自定义）
   - 目标集数滑块（0=自动，范围0-50）
   - 分镜数范围输入（min-max）
   - 高级选项开关（保持章节完整性/首尾集特殊处理/保留插叙倒叙）
   - 自定义提示词文本框（仅自定义策略时显示）
   - 策略预览文本（实时更新）

2. 策略配置页面 `frontend/src/app/(main)/upload/strategy/page.tsx`
   - 七步进度指示器（Step 3 高亮）
   - 复用 StrategyConfig 组件

3. Novel Store更新
   - 添加 `splitStrategy` 状态
   - 添加 `configureStrategy` action

4. 上传API客户端更新
   - 添加 `SplitStrategyConfig` 接口
   - 添加 `configureSplitStrategy` 函数

5. 策略配置API Route `POST /api/v1/upload/novel/split`
   - JWT验证、策略类型校验、分镜范围校验、自定义提示词校验
   - 返回 taskId 和配置信息

6. 执行进度页面 `frontend/src/app/(main)/upload/strategy/executing/page.tsx`
   - 显示5个拆分任务及其进度
   - 实时进度条动画
   - 完成后显示"查看分集结果"按钮

### File List

**新建文件:**
- `frontend/src/components/features/upload/StrategyConfig.tsx` - 分集策略配置组件
- `frontend/src/app/(main)/upload/strategy/page.tsx` - 策略配置页面
- `frontend/src/app/(main)/upload/strategy/executing/page.tsx` - 执行进度页面
- `frontend/src/app/api/v1/upload/novel/split/route.ts` - 策略配置API Route

**修改文件:**
- `frontend/src/stores/novel.ts` - 添加splitStrategy状态和configureStrategy action
- `frontend/src/lib/api/upload.ts` - 添加SplitStrategyConfig接口和configureSplitStrategy函数
