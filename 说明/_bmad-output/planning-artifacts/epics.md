---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "docs/项目详细设计文档.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "docs/readme.md"
workflowType: 'epics'
lastStep: 4
status: 'complete'
completedAt: '2026/04/29'
project_name: 'AI漫剧工厂'
user_name: 'Admin'
date: '2026/04/29'
---

# AI漫剧工厂 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for AI漫剧工厂 (AI Comic Drama Factory), decomposing the requirements from the PRD, Architecture, and existing project documentation into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1**: 用户可以使用用户名/邮箱和密码登录系统
**FR2**: 用户可以注册新账户（用户名+密码）
**FR3**: ~~用户可以使用第三方OAuth登录（微信/QQ/GitHub）~~ （暂不做）
**FR4**: 用户可以获取短信/邮件验证码（暂不做，简化为无验证码）
**FR5**: 用户可以重置密码（暂不做）
**FR6**: 系统自动记住登录状态（JWT Token管理）

**FR7**: 用户可以创建新项目，配置名称/风格/AI模型
**FR8**: 用户可以查看项目列表（网格/列表视图切换）
**FR9**: 用户可以搜索项目（关键词实时过滤）
**FR10**: 用户可以按状态筛选项目（全部/进行中/已完成/草稿）
**FR11**: 用户可以编辑项目配置
**FR12**: 用户可以复制项目（创建副本）
**FR13**: 用户可以删除项目（移入回收站）
**FR14**: 用户可以恢复已删除项目
**FR15**: 用户可以永久删除项目（二次确认）
**FR16**: 用户可以收藏项目（标星）

**FR17**: 用户可以上传小说文件（TXT/DOCX/PDF，最大50MB）
**FR18**: 系统显示上传文件信息（名称/大小/字数统计）
**FR19**: 用户需要确认原创声明和免责条款才能继续
**FR20**: 用户可以选择AI分集策略（智能均衡/情节驱动/角色驱动/自定义）
**FR21**: 系统根据AI策略自动将小说拆分为分集列表
**FR22**: 用户可以调整分集结果（合并/拆分/删除分集）
**FR23**: 系统自动提取资产（角色/场景/道具）
**FR24**: 用户可以编辑资产提示词
**FR25**: 系统批量生成资产参考图
**FR26**: 用户可以重新生成不满意的资产图
**FR27**: 用户确认后资产正式入库
**FR28**: 系统执行内容安全扫描（涉政/涉暴/涉黄检测）

**FR29**: 系统显示在线团队成员和任务状态
**FR30**: 用户可以按全部/我的/未指派过滤分集
**FR31**: 用户可以指派分集负责人
**FR32**: 系统AI自动将小说内容拆分为分镜
**FR33**: 用户可以编辑分镜描述
**FR34**: 系统提供AI优化建议并可一键采纳
**FR35**: 用户可以关联资产（角色/场景/道具）到分镜
**FR36**: 用户可以调整IP-Adapter参考图权重
**FR37**: 系统调用T2I模型生成分镜画面
**FR38**: 用户可以采用或重新生成（抽卡）
**FR39**: 系统保存分镜图历史版本
**FR40**: 用户提交后自动跳转到视频工作台
**FR41**: 系统实现编辑锁机制防止编辑冲突
**FR42**: 系统支持团队成员邀请和协作

**FR43**: 系统支持单图生视频和首尾帧过渡两种模式
**FR44**: 用户可以继承上段尾帧作为下段首帧
**FR45**: 系统可以AI生成尾帧图片
**FR46**: 用户可以输入运动描述
**FR47**: 系统可以AI优化运动描述
**FR48**: 用户可以调整首尾帧约束强度（0-100滑块）
**FR49**: 系统提供低质量预演预览
**FR50**: 系统调用I2V模型生成视频
**FR51**: 用户可以一键批量生成所有分镜视频
**FR52**: 用户可以在时间轴上拖拽排序片段
**FR53**: 用户可以为片段间设置转场效果（淡入淡出/溶解等）
**FR54**: 用户可以分割/删除/复制片段
**FR55**: 用户可以导出最终成片（MP4）
**FR56**: AI助手可以推荐/优化提示词

**FR57**: 系统展示资产统计（总数/角色/场景/道具数量）
**FR58**: 用户可以按类型筛选资产
**FR59**: 用户可以按项目筛选资产
**FR60**: 用户可以排序资产（最近使用/名称/按集数/创建时间）
**FR61**: 用户可以批量选择/删除/导出资产
**FR62**: 用户可以查看资产详情（高清大图/出场集数/历史提示词）
**FR63**: 用户可以重新生成资产图片
**FR64**: 用户可以将资产关联到新分镜
**FR65**: 用户可以下载资产

**FR66**: 用户可以查看个人信息和会员等级
**FR67**: 用户可以查看积分余额和消耗统计
**FR68**: 用户可以充值积分（支付宝/微信支付模拟）
**FR69**: 用户可以查看积分流水记录
**FR70**: 管理员可以查看所有用户列表
**FR71**: 管理员可以新增用户
**FR72**: 管理员可以编辑用户信息/权限/积分
**FR73**: 管理员可以封禁/启用用户
**FR74**: 管理员可以查看平台运营数据大盘
**FR75**: 管理员可以查看充值趋势和Top排行
**FR76**: 管理员可以配置角色权限矩阵
**FR77**: 管理员可以查看和导出审计日志

**FR78**: 系统通过WebSocket实时推送AI任务进度
**FR79**: 系统实时同步编辑锁状态（锁定/解锁/超时释放）
**FR80**: 系统广播在线成员状态
**FR81**: 系统支持房间机制定向推送事件

### NonFunctional Requirements

**NFR1**: 实时性：WebSocket推送延迟不超过1秒
**NFR2**: 规模化：任务队列支持批量生成和导出
**NFR3**: 一致性：IP-Adapter确保角色跨分镜一致性
**NFR4**: 安全性：JWT认证 + RBAC权限 + 积分配额
**NFR5**: 可观测性：全平台审计日志记录
**NFR6**: 可扩展性：微服务架构支持水平扩展
**NFR7**: 高可用：关键服务支持冗余部署
**NFR8**: 事务一致性：数据库操作符合ACID
**NFR9**: 前端性能：首屏加载和交互响应流畅
**NFR10**: 异步处理：视频生成等长耗时任务必须异步
**NFR11**: 合规性：内容安全审核（NSFW检测）
**NFR12**: 安全性：敏感操作二次确认
**NFR13**: 灾备：数据备份和恢复机制
**NFR14**: API规范：REST + OpenAPI schema
**NFR15**: 错误处理：完善的异常捕获和重试机制

### Additional Requirements

**技术栈确认（Architecture）：**
- Next.js 15 (App Router) + React 19 + TypeScript 5.x
- Tailwind CSS v4 + shadcn/ui
- Zustand + TanStack Query 状态管理
- Socket.IO 4.x 实时通信
- NextAuth.js v5 认证
- Turbopack 构建加速

**后端技术栈（Architecture）：**
- Next.js API Routes (REST) + FastAPI (AI微服务)
- PostgreSQL 16 + Prisma ORM
- Redis 7.x + BullMQ 任务队列
- MinIO 对象存储
- LiteLLM AI编排

**架构决策（Architecture）：**
- Monorepo结构：frontend/ + backend/ 分立，FastAPI独立部署
- Feature-based代码组织（按业务域）
- REST API通信（非tRPC，跨语言场景）
- 命名规范：DB(snake_case) / API(snake_case) / Code(PascalCase/camelCase)
- API响应格式：{data} 或 {error}
- Socket.IO事件：task:progress / task:complete / task:error / collab:lock / collab:unlock
- 日期格式：ISO 8601

**Starter Template（Architecture）：**
- 前端初始化命令：npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"
- 后端初始化：FastAPI + Python 3.12+
- 项目初始化应作为第一个实现Story

### UX Design Requirements

**全局布局框架（HTML原型）：**
- UX-DR1: 实现GlobalHeader固定顶部导航（Logo + 主导航标签 + AI模型状态 + 通知）
- UX-DR2: 实现Sidebar双栏布局（部分页面：分集工作台、视频工作台）
- UX-DR3: 实现Modal/Drawer弹层系统（编辑用户、充值确认、素材库选择）
- UX-DR4: 实现Toast通知系统

**登录注册页（html/登录注册.html）：**
- UX-DR5: 实现星空粒子动画背景（StarfieldBackground）
- UX-DR6: 实现左侧品牌介绍面板（标语 + 特性列表 + 数据统计）
- UX-DR7: 实现登录/注册表单切换（TabSwitcher）
- UX-DR8: 实现用户名 + 密码登录
- UX-DR9: 实现注册表单（用户名 + 密码 + 协议勾选）
- UX-DR10: 实现密码显隐切换

**项目列表页（html/项目列表.html）：**
- UX-DR12: 实现搜索框和快捷项目标签过滤
- UX-DR13: 实现状态过滤Tabs（全部/进行中/已完成/草稿）
- UX-DR14: 实现网格/列表视图切换
- UX-DR15: 实现项目卡片（封面 + 进度环 + 集数/分镜数 + 模型组合）
- UX-DR16: 实现卡片悬停快捷操作栏（编辑/复制/删除）
- UX-DR17: 实现收藏项目功能（星标）
- UX-DR18: 实现空状态引导

**创建项目页（html/创建项目.html）：**
- UX-DR19: 实现七种预设视觉风格选择 + 自定义上传
- UX-DR20: 实现风格关键词多选（赛博朋克/太空歌剧/未来都市等）
- UX-DR21: 实现画幅比例选择器（16:9/9:16/1:1/4:3/自定义）
- UX-DR22: 实现AI模型配置（LLM/T2I/I2V选择器）
- UX-DR23: 实现高级设置折叠面板（采样步数/CFG Scale/资产共享）
- UX-DR24: 实现右侧实时预览面板（画幅边框 + 配置汇总）
- UX-DR25: 实现快捷预设模板（一键套用：科幻太空/二次元奇幻/国风仙侠）

**小说上传与资产提取页（html/小说上传-分集与资产提取.html）：**
- UX-DR26: 实现七步进度指示器
- UX-DR27: 实现文件拖拽上传（FileDropzone: TXT/DOCX/PDF）
- UX-DR28: 实现AI拆解策略选择器（智能均衡/情节驱动/角色驱动/自定义）
- UX-DR29: 实现目标集数滑块（自动~50集可调）
- UX-DR30: 实现分集结果可视化图表（情节密度曲线、角色出场分布）
- UX-DR31: 实现合并/拆分/删除分集操作
- UX-DR32: 实现资产编辑面板（提示词AI润色）
- UX-DR33: 实现批量资产参考图生成进度展示

**分集工作台（html/分集.html）：**
- UX-DR34: 实现团队在线成员状态显示
- UX-DR35: 实现当前编辑者锁定状态
- UX-DR36: 实现左侧分集列表（全部/我的/未指派过滤）
- UX-DR37: 实现双步生成流（Step1编辑描述 → Step2生成画面）
- UX-DR38: 实现AI分镜描述生成 + 重新生成
- UX-DR39: 实现PromptEditor（画面描述 + 负面提示 + AI优化建议）
- UX-DR40: 实现资产关联（角色/场景/道具素材库选择）
- UX-DR41: 实现IP-Adapter参考图权重滑块
- UX-DR42: 实现历史生成版本管理
- UX-DR43: 实现"采用/重抽"交互
- UX-DR44: 实现提交进入视频工作台按钮

**视频工作台（html/分镜生视频.html）：**
- UX-DR45: 实现单图/首尾帧双模式切换
- UX-DR46: 实现首帧/尾帧上传或AI生成
- UX-DR47: 实现运动描述输入 + AI优化
- UX-DR48: 实现约束强度滑块（0-100）
- UX-DR49: 实现专业时间轴编辑器（拖拽排序/片段切割/转场设置）
- UX-DR50: 实现AI智能助理面板（提示词推荐/优化/自动分镜/风格推荐）
- UX-DR51: 实现转场特效选择（淡入淡出/溶解/滑动/缩放）

**资产库（html/资产库.html）：**
- UX-DR52: 实现资产统计Bar（总数/角色/场景/道具）
- UX-DR53: 实现分类Tab切换 + 项目快捷筛选
- UX-DR54: 实现排序下拉 + 关键词搜索
- UX-DR55: 实现批量管理模式
- UX-DR56: 实现资产详情Drawer（高清大图/出场集数/历史提示词/重新生成）

**用户中心（html/用户中心.html）：**
- UX-DR57: 实现个人/管理双视角Tab切换
- UX-DR58: 实现积分余额和消耗统计卡片
- UX-DR59: 实现充值闭环（套餐选择/支付二维码/模拟回调）
- UX-DR60: 实现功能权限和资源配额展示
- UX-DR61: 实现用户CRUD操作和封禁/启用
- UX-DR62: 实现平台大盘（总用户/在线/积分/充值统计）
- UX-DR63: 实现充值趋势图表和Top充值排行
- UX-DR64: 实现权限矩阵配置（管理员/编辑/普通用户勾选）
- UX-DR65: 实现审计日志表格（筛选 + 导出）

## Epic List

### Epic 1: 用户认证与账户
用户可以使用用户名和密码注册和登录系统。覆盖FR1, FR2（简化版，无邮箱/验证码/第三方OAuth）。

**FRs covered:** FR1, FR2

### Epic 2: 项目管理与协作
用户可以创建、查看、搜索、编辑、复制、删除、恢复项目，管理项目配置和状态。

**FRs covered:** FR7-FR16

### Epic 3: 小说上传与资产处理
用户可以上传小说文件、AI自动拆分章节、提取和管理资产、批量生成资产参考图。

**FRs covered:** FR17-FR28

### Epic 4: 分集故事板创作
用户可以在分集工作台中编辑分镜、AI辅助创作描述、关联资产、生成分镜图。

**FRs covered:** FR29-FR42

### Epic 5: 视频生成与时间轴编辑
用户可以生成视频片段、编辑时间轴、添加转场效果、导出最终成片。

**FRs covered:** FR43-FR56

### Epic 6: 资产库管理
用户可以浏览、搜索、筛选、管理全局资产，支持跨项目复用。

**FRs covered:** FR57-FR65

### Epic 7: 用户中心与积分
用户可以查看个人信息、充值积分、查看消费记录；管理员可以管理用户和平台运营。

**FRs covered:** FR66-FR77

### Epic 8: 实时协作与通知
系统实时推送AI任务进度、编辑锁状态、团队在线状态，支持房间机制定向推送。

**FRs covered:** FR78-FR81

### FR Coverage Map

| Epic | FRs Covered | Description |
|------|-------------|-------------|
| Epic 1 | FR1, FR2 | 用户登录、注册（简化版） |
| Epic 2 | FR7-FR16 | 项目创建、列表、搜索、筛选、编辑、复制、删除、恢复、收藏 |
| Epic 3 | FR17-FR28 | 小说上传、免责确认、分集策略、AI拆分、资产提取、批量生成 |
| Epic 4 | FR29-FR42 | 团队协作、分集过滤、AI分镜、Prompt编辑、资产关联、生图、采用/重抽 |
| Epic 5 | FR43-FR56 | 视频模式、首尾帧、运动描述、时间轴、转场、导出、AI助手 |
| Epic 6 | FR57-FR65 | 资产统计、筛选、排序、批量管理、详情、重生成、下载 |
| Epic 7 | FR66-FR77 | 个人信息、积分、充值、用户管理、平台数据、权限配置、审计日志 |
| Epic 8 | FR78-FR81 | WebSocket进度推送、编辑锁、在线状态、房间广播 |

---

## Epic 1: 用户认证与账户

用户可以使用用户名和密码注册和登录系统。

### Story 1.0: 项目初始化（技术基础设施）

**As a** 开发团队
**I want** 初始化前端和后端项目框架
**So that** 搭建可运行的开发环境，为后续功能开发做准备

**Acceptance Criteria:**

**Given** 开发团队需要开始项目开发
**When** 执行前端初始化命令 `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"`
**Then** 前端项目创建完成，包含Next.js 15、React 19、TypeScript、Tailwind CSS基础配置

**Given** 前端项目初始化完成
**When** 初始化后端FastAPI项目（Python 3.12+）
**Then** 后端项目创建完成，包含FastAPI、Uvicorn、基础路由结构

**Given** 前端项目创建完成
**When** 配置项目依赖（shadcn/ui、Zustand、TanStack Query、Socket.IO客户端等）
**Then** 所有依赖安装成功，项目可正常运行 `npm run dev`

**Given** 后端项目创建完成
**When** 配置数据库连接（PostgreSQL + Prisma ORM）
**Then** 数据库连接成功，可执行迁移

**Given** 项目初始化完成
**When** 配置环境变量（.env.example）
**Then** 环境变量模板创建完成，包含所有必需的配置项

**Note:** 此故事为技术基础设施，优先于所有业务故事执行。

### Story 1.1: 用户注册

**As a** 新用户
**I want** 使用用户名和密码创建账户
**So that** 可以开始使用平台

**Acceptance Criteria:**

**Given** 我是未注册的新用户，访问注册页面
**When** 输入有效用户名（3-20位字母数字）、密码（6位以上），点击注册
**Then** 系统创建账户，自动登录并跳转项目列表

**Given** 用户名已被注册
**When** 点击注册
**Then** 提示"用户名已被占用"

**Given** 密码少于6位
**When** 点击注册
**Then** 提示"密码至少6位"

### Story 1.2: 用户登录

**As a** 已注册用户
**I want** 使用用户名和密码登录
**So that** 访问我的项目和内容

**Acceptance Criteria:**

**Given** 我输入正确的用户名和密码
**When** 点击登录
**Then** 验证通过，跳转项目列表

**Given** 密码错误
**When** 点击登录
**Then** 提示"用户名或密码错误"

**Given** 用户名不存在
**When** 点击登录
**Then** 提示"用户名或密码错误"（不区分是否存在，保护安全）

### Story 1.3: 保持登录状态

**As a** 已登录用户
**I want** 关闭浏览器后重新打开仍保持登录
**So that** 不需要频繁重新登录

**Acceptance Criteria:**

**Given** 我成功登录后关闭浏览器
**When** 7天内重新访问平台
**Then** 自动保持登录状态

**Given** 我点击"退出登录"
**When** 确认退出
**Then** 清除会话，跳转登录页

---

## Epic 2: 项目管理与协作

用户可以创建、查看、搜索、编辑、复制、删除、恢复项目，管理项目配置和状态。

### Story 2.1: 创建项目

**As a** 用户
**I want** 创建新项目并配置基本信息
**So that** 开始我的漫剧创作

**Acceptance Criteria:**

**Given** 我在项目列表页点击"创建新项目"
**When** 输入项目名称（2-50字符）、选择题材（科幻/玄幻/都市等）、目标受众，选择视觉风格，填写简介，点击创建
**Then** 系统创建项目并跳转项目详情页，显示创建成功提示

**Given** 项目名称为空或超长
**When** 点击创建
**Then** 提示"项目名称需2-50字符"

**Given** 未填写必填项
**When** 点击创建
**Then** 高亮缺失字段，提示必填

### Story 2.2: 查看项目列表

**As a** 用户
**I want** 查看所有项目列表
**So that** 管理和选择要编辑的项目

**Acceptance Criteria:**

**Given** 我有多个项目
**When** 访问项目列表页
**Then** 显示所有项目卡片（封面、名称、状态、进度、集数/分镜数）

**Given** 我没有项目
**When** 访问项目列表页
**Then** 显示空状态引导"还没有项目，创建你的第一个漫剧吧"

### Story 2.3: 搜索和筛选项目

**As a** 用户
**I want** 搜索和筛选项目
**So that** 快速找到目标项目

**Acceptance Criteria:**

**Given** 我在项目列表页
**When** 输入关键词搜索
**Then** 实时过滤显示匹配的项目（按名称模糊匹配）

**Given** 我在项目列表页
**When** 点击状态Tab（全部/进行中/已完成/草稿）
**Then** 仅显示对应状态的项目

**Given** 我切换视图模式
**When** 点击网格/列表图标
**Then** 切换项目展示方式

### Story 2.4: 编辑项目

**As a** 用户
**I want** 编辑项目配置
**So that** 调整项目设置

**Acceptance Criteria:**

**Given** 我在项目详情页点击编辑
**When** 修改项目简介、题材、受众、风格、画幅比例、AI模型配置，点击保存
**Then** 系统更新配置，显示保存成功提示

**Given** 我尝试修改项目名称
**When** 编辑项目名称
**Then** 系统提示"项目名称创建后不可修改"（只读）

### Story 2.5: 复制项目

**As a** 用户
**I want** 复制现有项目
**So that** 快速创建相似项目

**Acceptance Criteria:**

**Given** 我在项目卡片点击"复制"
**When** 点击确认复制
**Then** 创建项目副本（名称添加"副本"后缀），跳转新项目

### Story 2.6: 删除和恢复项目

**As a** 用户
**I want** 删除和恢复项目
**So that** 管理不需要的项目

**Acceptance Criteria:**

**Given** 我在项目列表或详情页点击"删除"
**When** 确认删除（二次确认弹窗）
**Then** 项目移入回收站（状态变为trashed），从列表隐藏，显示"已移到回收站"

**Given** 我切换到"回收站"筛选
**When** 查看已删除项目
**Then** 显示回收站中的项目列表

**Given** 我在回收站中点击"恢复"
**When** 确认恢复
**Then** 项目恢复为"进行中"状态，重新出现在项目列表

**Given** 我在回收站中点击"永久删除"
**When** 确认永久删除（二次确认）
**Then** 项目及关联数据彻底删除

### Story 2.7: 收藏项目

**As a** 用户
**I want** 收藏项目
**So that** 快速访问重要项目

**Acceptance Criteria:**

**Given** 我在项目卡片点击星标
**When** 点击收藏/取消收藏
**Then** 项目标星状态切换，显示已收藏/取消收藏提示

---

## Epic 3: 小说上传与资产处理

用户可以上传小说文件、AI自动拆分章节、提取和管理资产、批量生成资产参考图。

### Story 3.1: 上传小说文件

**As a** 用户
**I want** 上传小说文件
**So that** 开始我的漫剧创作

**Acceptance Criteria:**

**Given** 我在小说上传页
**When** 拖拽或选择TXT/DOCX/PDF文件（不超过50MB）
**Then** 系统上传文件，显示文件信息（名称、大小、预估字数）

**Given** 我上传了不支持的文件格式
**When** 点击上传
**Then** 提示"仅支持TXT/DOCX/PDF格式"

**Given** 我上传的文件超过50MB
**When** 点击上传
**Then** 提示"文件大小不能超过50MB"

### Story 3.2: 确认免责条款

**As a** 用户
**I want** 确认原创声明和免责条款
**So that** 合法使用平台服务

**Acceptance Criteria:**

**Given** 文件上传成功后
**When** 阅读免责条款并勾选"我确认上传内容为原创或已获得授权"
**Then** 启用"同意并继续"按钮

**Given** 我未勾选确认
**When** 点击"同意并继续"
**Then** 提示"请先阅读并同意免责条款"

### Story 3.3: 配置AI分集策略

**As a** 用户
**I want** 配置AI分集策略
**So that** 得到满意的分集结果

**Acceptance Criteria:**

**Given** 我在分集策略配置页
**When** 选择拆分策略（智能均衡/情节驱动/角色驱动/自定义）
**Then** 高亮选中策略，显示策略说明

**Given** 我选择智能均衡策略
**When** 拖动目标集数滑块（1-100集）
**Then** 显示预估的每集分镜数范围

**Given** 我选择自定义策略
**When** 输入自定义提示词
**Then** 系统保存自定义策略

### Story 3.4: AI智能拆分小说

**As a** 用户
**I want** AI自动拆分小说为分集
**So that** 得到结构化的分集大纲

**Acceptance Criteria:**

**Given** 我配置好分集策略
**When** 点击"开始智能拆解"
**Then** 系统显示AI处理进度（分析→识别→应用→拆解→摘要），完成后显示分集列表

**Given** AI拆分过程中
**When** 出现错误
**Then** 显示错误提示，允许重试

**Given** 拆分完成
**When** 查看分集结果
**Then** 显示总集数、每集标题/摘要/分镜数预估

### Story 3.5: 调整分集结果

**As a** 用户
**I want** 调整分集结果
**So that** 优化分集结构

**Acceptance Criteria:**

**Given** 分集结果列表
**When** 选中多个分集点击"合并"
**Then** 选中的分集合并为一个，显示合并后的摘要

**Given** 某个分集内容过多
**When** 点击"拆分为二"
**Then** 该分集拆分为两个，保持内容连贯

**Given** 某个分集不需要
**When** 点击"删除"确认
**Then** 该分集从列表移除

**Given** 我对分集结果不满意
**When** 点击"调整策略"
**Then** 返回分集策略配置页，重新调整

### Story 3.6: 提取资产

**As a** 用户
**I want** AI自动提取角色、场景、道具
**So that** 生成资产库

**Acceptance Criteria:**

**Given** 分集结果确认后
**When** 点击"提取资产"
**Then** 系统三路并行提取（角色/场景/道具），显示进度，完成后列出所有资产

**Given** 提取过程中
**When** 查看进度
**Then** 显示各类型提取进度（角色X个/场景Y个/道具Z个）

### Story 3.7: 编辑资产提示词

**As a** 用户
**I want** 编辑资产描述和提示词
**So that** 优化生成效果

**Acceptance Criteria:**

**Given** 资产列表
**When** 点击某个资产的编辑按钮
**Then** 打开编辑面板，显示当前描述和提示词

**Given** 我修改提示词
**When** 点击保存
**Then** 系统更新该资产的提示词，显示保存成功

### Story 3.8: 批量生成资产参考图

**As a** 用户
**I want** 批量生成资产参考图
**So that** 快速获得可视化资产

**Acceptance Criteria:**

**Given** 资产提取完成
**When** 点击"进入批量生产"
**Then** 系统开始逐个生成资产参考图，显示进度条

**Given** 某个资产生成结果不满意
**When** 点击"重新生成"
**Then** 该资产重新生成，不影响其他资产

**Given** 批量生成完成
**When** 查看资产预览
**Then** 显示所有资产的参考图缩略图

### Story 3.9: 资产确认入库

**As a** 用户
**I want** 确认资产入库
**So that** 资产正式进入资产库

**Acceptance Criteria:**

**Given** 资产参考图生成完成
**When** 点击"确认入库"
**Then** 资产正式保存，显示入库统计（角色X个/场景Y个/道具Z个），显示"进入分镜工作台"按钮

---

## Epic 4: 分集故事板创作

用户可以在分集工作台中编辑分镜、AI辅助创作描述、关联资产、生成分镜图。

### Story 4.1: 团队协作界面

**As a** 用户
**I want** 查看团队在线状态
**So that** 了解团队协作情况

**Acceptance Criteria:**

**Given** 我在分集工作台
**When** 查看顶部团队面板
**Then** 显示在线成员列表（头像+名称）、当前任务状态

**Given** 某个成员正在编辑某分集
**When** 其他成员查看
**Then** 显示该分集"xxx正在编辑"锁定状态

**Given** 编辑者超过5分钟无操作
**When** 系统检测
**Then** 自动释放锁，通知其他用户

### Story 4.2: 分集列表与过滤

**As a** 用户
**I want** 查看和过滤分集列表
**So that** 快速找到要编辑的分集

**Acceptance Criteria:**

**Given** 我在分集工作台
**When** 点击过滤Tab（全部/我的/未指派）
**Then** 仅显示对应状态的分集

**Given** 分集列表
**When** 点击某个分集
**Then** 加载该分集内容到右侧编辑区

### Story 4.3: AI自动生成分镜

**As a** 用户
**I want** AI自动将小说内容拆分为分镜
**So that** 快速获得分镜描述

**Acceptance Criteria:**

**Given** 我在分集编辑区
**When** 点击"AI自动拆分"
**Then** 系统分析该集内容，生成多个分镜描述，添加到列表

**Given** AI拆分进行中
**When** 查看进度
**Then** 显示拆分进度和当前处理位置

### Story 4.4: 编辑分镜描述

**As a** 用户
**I want** 编辑分镜描述
**So that** 调整AI生成的内容

**Acceptance Criteria:**

**Given** 某个分镜
**When** 点击编辑
**Then** 展开编辑面板，显示原文引用、AI描述、Prompt编辑器

**Given** 我修改描述文字
**When** 点击保存
**Then** 更新分镜描述，显示保存成功

### Story 4.5: AI优化建议

**As a** 用户
**I want** 获取AI优化建议
**So that** 提升Prompt质量

**Acceptance Criteria:**

**Given** 我在编辑分镜Prompt
**When** 点击"AI优化建议"
**Then** 系统分析当前Prompt，给出优化建议（含置信度）

**Given** AI给出优化建议
**When** 点击"采纳"
**Then** 自动应用优化建议到Prompt

### Story 4.6: 关联资产

**As a** 用户
**I want** 关联资产到分镜
**So that** 保持角色/场景一致性

**Acceptance Criteria:**

**Given** 分镜编辑区
**When** 点击"添加角色"
**Then** 打开资产库选择器，显示角色列表

**Given** 我选择角色
**When** 点击确认
**Then** 该角色关联到分镜，显示在元素列表

**Given** 我可以调整参考图权重
**When** 拖动权重滑块（0-100%）
**Then** 保存权重设置，影响生成效果

### Story 4.7: 生成分镜图

**As a** 用户
**I want** 生成分镜画面
**So that** 获得可视化内容

**Acceptance Criteria:**

**Given** 分镜Prompt和资产配置完成
**When** 点击"开始生成"
**Then** 调用T2I模型，显示生成进度，完成后显示图片预览

**Given** 生成失败
**When** 查看错误信息
**Then** 显示错误原因，允许重试

### Story 4.8: 采用/重新生成

**As a** 用户
**I want** 决定分镜图结果
**So that** 控制内容质量

**Acceptance Criteria:**

**Given** 分镜图生成完成
**When** 点击"采用"
**Then** 该图片标记为已采用，保存到分镜

**Given** 分镜图不满意
**When** 点击"重抽"
**Then** 重新调用T2I生成新图片，替换当前预览

### Story 4.9: 历史版本管理

**As a** 用户
**I want** 查看生成历史
**So that** 比较不同版本

**Acceptance Criteria:**

**Given** 某个分镜有多个生成版本
**When** 展开历史版本面板
**Then** 显示所有版本缩略图（时间/种子/影响度）

**Given** 我选择某个历史版本
**When** 点击"使用此版本"
**Then** 该版本成为当前版本

### Story 4.10: 提交到视频工作台

**As a** 用户
**I want** 提交分镜到视频工作台
**So that** 继续视频生成流程

**Acceptance Criteria:**

**Given** 当前分集所有分镜已采用
**When** 点击"提交并进入视频工作台"
**Then** 保存所有更改，跳转到视频工作台

**Given** 仍有分镜未采用
**When** 点击提交
**Then** 提示"仍有X个分镜未采用，确认提交？"

---

## Epic 5: 视频生成与时间轴编辑

用户可以生成视频片段、编辑时间轴、添加转场效果、导出最终成片。

### Story 5.1: 视频生成模式切换

**As a** 用户
**I want** 切换视频生成模式
**So that** 选择适合的生成方式

**Acceptance Criteria:**

**Given** 我在视频工作台
**When** 点击"单图"模式
**Then** 显示单图生视频界面（上传图片+运动描述）

**Given** 我在视频工作台
**When** 点击"首尾帧"模式
**Then** 显示首尾帧过渡界面（首帧+尾帧+运动描述）

### Story 5.2: 首尾帧配置

**As a** 用户
**I want** 从已生成分镜图中选择首尾帧
**So that** 无缝衔接分镜到视频的工作流

**Acceptance Criteria:**

**Given** 首尾帧模式
**When** 点击"上传首帧"
**Then** 弹出分镜图选择列表（来自当前项目的分镜图），默认显示所有已采用的分镜图

**Given** 我选择某个分镜图
**When** 点击确认
**Then** 该分镜图作为首帧，显示预览

**Given** 我想使用上一段尾帧
**When** 点击"继承上一段尾帧"
**Then** 自动使用上段视频的尾帧分镜图作为当前首帧

**Given** 我需要AI生成尾帧
**When** 点击"AI生成尾帧"
**Then** 系统基于首帧和运动描述生成尾帧图片

### Story 5.3: 运动描述配置

**As a** 用户
**I want** 输入和优化运动描述
**So that** 控制视频运动效果

**Acceptance Criteria:**

**Given** 运动描述输入框
**When** 手动输入运动描述（如"镜头缓慢推进"）
**Then** 保存描述内容

**Given** 我有初步描述
**When** 点击"AI优化"
**Then** 系统优化描述，增强表现力

**Given** 约束强度滑块
**When** 拖动调整（0-100）
**Then** 保存约束强度，影响生成效果

### Story 5.4: 视频预览与生成

**As a** 用户
**I want** 预览和生成视频
**So that** 获取最终视频内容

**Acceptance Criteria:**

**Given** 配置完成
**When** 点击"预演"
**Then** 生成低质量快速预览（约5秒），显示预览窗口

**Given** 预览满意
**When** 点击"生成视频"
**Then** 调用I2V模型，显示生成进度，完成后显示高清视频

**Given** 生成失败
**When** 查看错误信息
**Then** 显示失败原因，显示积分消耗（扣除的积分退还）

### Story 5.5: 批量生成

**As a** 用户
**I want** 一键批量生成所有分镜视频
**So that** 提高效率

**Acceptance Criteria:**

**Given** 有多个待生成的分镜
**When** 点击"一键生成全部"
**Then** 系统自动排队生成所有分镜视频，显示总进度

**Given** 批量生成中
**When** 我可以查看每个分镜的生成状态
**Then** 实时更新进度，支持取消

### Story 5.6: 时间轴编辑

**As a** 用户
**I want** 在时间轴上编辑视频片段
**So that** 组织最终成片

**Acceptance Criteria:**

**Given** 时间轴面板
**When** 拖拽片段调整顺序
**Then** 片段重新排序，显示新的时间位置

**Given** 某个片段
**When** 点击"分割"
**Then** 在当前位置分割为两个片段

**Given** 某个片段
**When** 点击"删除"确认
**Then** 从时间轴移除该片段

**Given** 某个片段
**When** 点击"复制"
**Then** 复制该片段，插入到后面

### Story 5.7: 转场效果

**As a** 用户
**I want** 设置片段间转场效果
**So that** 提升成片质感

**Acceptance Criteria:**

**Given** 两个相邻片段
**When** 选择转场效果（淡入淡出/溶解/滑动/缩放）
**Then** 预览转场效果，保存配置

**Given** 转场时长
**When** 调整时长滑块（0.5-2秒）
**Then** 保存转场时长

### Story 5.8: 导出成片

**As a** 用户
**I want** 导出最终成片
**So that** 获取完成的漫剧视频

**Acceptance Criteria:**

**Given** 时间轴编排完成
**When** 点击"导出成片"
**Then** 系统合成所有片段，生成最终MP4，显示导出进度

**Given** 导出完成
**When** 下载视频
**Then** 视频文件下载到本地，显示导出成功

### Story 5.9: AI智能助手

**As a** 用户
**I want** 使用AI辅助功能
**So that** 提升创作效率和质量

**Acceptance Criteria:**

**Given** AI助手面板
**When** 点击"提示词推荐"
**Then** 系统根据当前画面生成推荐提示词

**Given** 当前提示词
**When** 点击"提示词优化"
**Then** 系统优化提示词，增强表现力

**Given** 当前画面
**When** 点击"风格推荐"
**Then** 系统推荐匹配的视觉风格

---

## Epic 6: 资产库管理

用户可以浏览、搜索、筛选、管理全局资产，支持跨项目复用。

### Story 6.1: 资产统计展示

**As a** 用户
**I want** 查看资产统计信息
**So that** 了解资产库概况

**Acceptance Criteria:**

**Given** 我在资产库页面
**When** 查看顶部统计Bar
**Then** 显示总资产数、角色数、场景数、道具数

### Story 6.2: 资产筛选

**As a** 用户
**I want** 按类型筛选资产
**So that** 快速找到目标资产

**Acceptance Criteria:**

**Given** 资产库页面
**When** 点击分类Tab（全部/角色/场景/道具）
**Then** 仅显示对应类型的资产

**Given** 资产列表
**When** 选择"按项目筛选"
**Then** 显示该项目的所有资产

### Story 6.3: 资产搜索和排序

**As a** 用户
**I want** 搜索和排序资产
**So that** 快速定位资产

**Acceptance Criteria:**

**Given** 资产列表
**When** 输入关键词搜索
**Then** 实时过滤显示匹配的资产（按名称模糊匹配）

**Given** 资产列表
**When** 选择排序方式（最近使用/名称/按集数/创建时间）
**Then** 按选定方式重新排列资产

### Story 6.4: 批量管理资产

**As a** 用户
**I want** 批量选择和操作资产
**So that** 高效管理多个资产

**Acceptance Criteria:**

**Given** 资产列表
**When** 开启批量选择模式
**Then** 每个资产显示复选框，可多选

**Given** 已选中多个资产
**When** 点击"批量删除"确认
**Then** 选中资产全部删除，显示删除成功

**Given** 已选中多个资产
**When** 点击"导出"
**Then** 导出选中资产（ZIP包）

### Story 6.5: 资产详情查看

**As a** 用户
**I want** 查看资产详情
**So that** 了解资产完整信息

**Acceptance Criteria:**

**Given** 资产列表
**When** 点击某个资产
**Then** 打开详情Drawer，显示高清大图、名称、类型、出场集数、创建时间、历史提示词

**Given** 详情页
**When** 点击提示词旁边的复制按钮
**Then** 提示词复制到剪贴板，显示"已复制"

### Story 6.6: 重新生成资产图

**As a** 用户
**I want** 重新生成资产参考图
**So that** 获得更满意的效果

**Acceptance Criteria:**

**Given** 资产详情页
**When** 点击"重新生成"
**Then** 系统重新调用T2I模型生成参考图，显示生成进度

**Given** 生成完成
**When** 查看新图
**Then** 显示新生成的参考图，替换旧图

### Story 6.7: 资产关联到分镜

**As a** 用户
**I want** 将资产关联到新分镜
**So that** 复用已有资产

**Acceptance Criteria:**

**Given** 资产详情或列表
**When** 点击"关联到分镜"
**Then** 显示项目-分集-分镜选择器

**Given** 我选择目标分镜
**When** 点击确认关联
**Then** 资产关联到该分镜，显示关联成功

### Story 6.8: 下载资产

**As a** 用户
**I want** 下载资产文件
**So that** 本地使用资产

**Acceptance Criteria:**

**Given** 资产详情页
**When** 点击"下载"
**Then** 资产图片下载到本地，显示下载成功

---

## Epic 7: 用户中心与积分

用户可以查看个人信息、充值积分、查看消费记录；管理员可以管理用户和平台运营。

### Story 7.1: 查看个人信息

**As a** 普通用户
**I want** 查看个人信息
**So that** 了解账户状态

**Acceptance Criteria:**

**Given** 我在用户中心-个人Tab
**When** 查看个人信息区
**Then** 显示头像、用户名、会员等级、注册时间

### Story 7.2: 查看积分余额和消耗

**As a** 普通用户
**I want** 查看积分余额和消耗统计
**So that** 了解消费情况

**Acceptance Criteria:**

**Given** 我在用户中心-个人Tab
**When** 查看积分卡片
**Then** 显示当前余额、今日消耗、本月调用次数

**Given** 积分消耗记录
**When** 点击"查看全部"
**Then** 显示完整积分流水列表（类型/时间/数额/余额）

### Story 7.3: 积分充值

**As a** 普通用户
**I want** 充值积分
**So that** 继续使用付费功能

**Acceptance Criteria:**

**Given** 我在充值页面
**When** 选择充值套餐（100/500/1000/2000积分档）
**Then** 套餐高亮选中，显示价格

**Given** 我选择支付方式
**When** 选择支付宝或微信
**Then** 显示对应二维码

**Given** 我点击"模拟支付成功"
**Then** 积分到账，余额更新，显示充值成功提示

### Story 7.4: 用户管理（管理员）

**As a** 管理员
**I want** 管理用户账户
**So that** 维护平台用户

**Acceptance Criteria:**

**Given** 我在管理Tab-用户管理
**When** 查看用户列表
**Then** 显示所有用户（分页），包含用户名/邮箱/状态/注册时间

**Given** 我点击"新增用户"
**When** 填写用户名、密码，选择角色，点击保存
**Then** 创建新用户，显示成功提示

**Given** 我点击用户"编辑"
**When** 修改用户信息/权限/积分，点击保存
**Then** 更新用户，显示保存成功

**Given** 我点击"封禁/启用"
**When** 确认操作
**Then** 用户状态切换，显示操作成功

### Story 7.5: 管理员手动充值

**As a** 管理员
**I want** 手动为用户充值积分
**So that** 处理特殊情况或补偿

**Acceptance Criteria:**

**Given** 用户管理列表
**When** 点击用户"编辑"
**Then** 显示用户信息编辑面板，含积分调整输入框

**Given** 我输入充值积分数额
**When** 选择调整原因（充值/补偿/其他），点击确认
**Then** 用户积分余额更新，记录到审计日志，显示操作成功

**Given** 我输入负数或非数字
**When** 点击确认
**Then** 提示"请输入有效积分数额"

### Story 7.6: 平台运营数据（管理员）

**As a** 管理员
**I want** 查看平台运营数据
**So that** 了解平台状态

**Acceptance Criteria:**

**Given** 我在管理Tab
**When** 查看平台大盘
**Then** 显示总用户数、在线用户数、总积分、充值金额

**Given** 我在平台数据区
**When** 查看充值趋势图
**Then** 显示7天/30天充值趋势曲线

**Given** 我在平台数据区
**When** 查看充值排行
**Then** 显示Top 5充值用户（昵称+金额）

### Story 7.7: 权限配置（管理员）

**As a** 管理员
**I want** 配置角色权限矩阵
**So that** 控制用户功能访问

**Acceptance Criteria:**

**Given** 我在权限配置页
**When** 查看角色模板（管理员/编辑/普通用户）
**Then** 显示各角色对应的功能权限勾选矩阵

**Given** 我勾选/取消某权限
**When** 点击保存
**Then** 更新权限配置，显示保存成功

### Story 7.8: 审计日志（管理员）

**As a** 管理员
**I want** 查看和导出审计日志
**So that** 追溯操作记录

**Acceptance Criteria:**

**Given** 我在审计日志页
**When** 查看日志列表
**Then** 显示操作记录（时间/操作者/操作类型/详情/IP）

**Given** 日志列表
**When** 设置筛选条件（操作类型/时间范围/操作者）
**Then** 显示符合条件的日志

**Given** 我点击"导出日志"
**When** 选择导出格式（CSV/Excel）
**Then** 生成并下载日志文件

---

## Epic 8: 实时协作与通知

系统实时推送AI任务进度、编辑锁状态、团队在线状态，支持房间机制定向推送。

### Story 8.1: AI任务进度推送

**As a** 用户
**I want** 实时接收AI任务进度
**So that** 了解任务执行状态

**Acceptance Criteria:**

**Given** 我提交了AI任务（分集拆分/资产提取/生图/视频生成）
**When** 任务执行中
**Then** WebSocket实时推送进度更新（0-100%），显示当前步骤

**Given** 任务完成
**When** 系统推送task:complete事件
**Then** 显示完成提示，可查看结果

**Given** 任务失败
**When** 系统推送task:error事件
**Then** 显示错误提示，允许重试

### Story 8.2: 编辑锁状态同步

**As a** 用户
**I want** 实时了解分集编辑锁状态
**So that** 避免编辑冲突

**Acceptance Criteria:**

**Given** 某用户开始编辑分集
**When** 锁定分集
**Then** 其他用户看到"xxx正在编辑"状态，自动进入只读模式

**Given** 编辑者完成编辑或超时（5分钟无操作）
**When** 释放锁
**Then** 系统推送collab:unlock事件，其他用户可编辑

### Story 8.3: 团队在线状态

**As a** 用户
**I want** 查看团队在线成员
**So that** 了解团队协作情况

**Acceptance Criteria:**

**Given** 分集工作台
**When** 成员上线/下线
**Then** WebSocket推送成员状态更新，在线列表实时变化

**Given** 团队面板
**When** 查看在线成员
**Then** 显示所有在线成员头像和名称

### Story 8.4: 房间定向推送

**As a** 用户
**I want** 接收特定房间的消息
**So that** 只关注我参与的项目

**Acceptance Criteria:**

**Given** 我加入某项目房间
**When** 该项目有事件发生
**Then** 仅该房间成员收到推送

**Given** 我切换到其他项目
**When** 加入新项目房间
**Then** 退出旧房间，加入新房间，接收新房间消息

---

## Summary

**Total Epics:** 8
**Total Stories:** 58

| Epic | Stories | FRs Covered |
|------|---------|-------------|
| Epic 1: 用户认证与账户 | 4（含Story 1.0项目初始化） | FR1, FR2 |
| Epic 2: 项目管理与协作 | 7 | FR7-FR16 |
| Epic 3: 小说上传与资产处理 | 9 | FR17-FR28 |
| Epic 4: 分集故事板创作 | 10 | FR29-FR42 |
| Epic 5: 视频生成与时间轴编辑 | 9 | FR43-FR56 |
| Epic 6: 资产库管理 | 8 | FR57-FR65 |
| Epic 7: 用户中心与积分 | 8 | FR66-FR77 |
| Epic 8: 实时协作与通知 | 4 | FR78-FR81 |

**Note:** Story 1.0（项目初始化）为技术基础设施故事，应作为第一个实现的故事，先于所有业务故事执行。
