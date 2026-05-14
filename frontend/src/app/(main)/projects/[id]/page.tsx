"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useProjectStore } from "@/stores/project";
import ProjectEditForm from "@/components/features/projects/ProjectEditForm";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const { project, isLoading, error, fetchProject } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);

  // Auto-enable edit mode when navigating with ?edit=true
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const handleBack = () => {
    router.push("/projects");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-primary text-xl" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
          <i className="fas fa-exclamation-triangle text-rose-400 text-2xl" />
        </div>
        <p className="text-rose-400 text-sm">{error || "项目不存在"}</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 rounded-lg bg-surface border border-white/10 text-slate-400 text-sm hover:text-white transition-all"
        >
          返回项目列表
        </button>
      </div>
    );
  }

  // Status config
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "草稿", color: "text-slate-400", bg: "bg-slate-500/15" },
    active: { label: "进行中", color: "text-amber-400", bg: "bg-amber-500/15" },
    completed: { label: "已完成", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    trashed: { label: "已删除", color: "text-rose-400", bg: "bg-rose-500/15" },
  };

  const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;

  // Model names
  const MODEL_NAMES: Record<string, string> = {
    gpt4o: "GPT-4o",
    claude: "Claude 3.5",
    deepseek: "DeepSeek-V3",
    sdxl: "SDXL",
    midjourney: "Midjourney V6",
    dalle3: "DALL·E 3",
    runway: "Runway Gen-3",
    pika: "Pika 1.5",
    luma: "Luma Dream Machine",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {project.genre} · {project.style} · {project.aspectRatio}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-lg bg-surface border border-white/10 text-slate-300 text-sm hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
          >
            <i className="fas fa-pen text-xs" />
            {isEditing ? "取消编辑" : "编辑项目"}
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <ProjectEditForm
          project={project}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            fetchProject(projectId);
          }}
        />
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Main Info */}
          <div className="col-span-8 space-y-6">
            {/* Project Cover & Basic Info */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-info-circle text-primary" />
                项目信息
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <div className="text-xs text-slate-500 mb-1">项目名称</div>
                  <div className="text-sm text-white">{project.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">状态</div>
                  <div className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500 mb-1">项目描述</div>
                  <div className="text-sm text-white/80">{project.description || "暂无描述"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">题材类型</div>
                  <div className="text-sm text-white">{project.genre}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">目标受众</div>
                  <div className="text-sm text-white">{project.targetAudience}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">视觉风格</div>
                  <div className="text-sm text-white">{project.style}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">画幅比例</div>
                  <div className="text-sm text-white">{project.aspectRatio} ({project.width}×{project.height})</div>
                </div>
              </div>
            </div>

            {/* AI Model Config */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-robot text-primary" />
                AI 模型配置
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <i className="fas fa-brain text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">LLM</div>
                    <div className="text-sm text-white font-medium">
                      {MODEL_NAMES[project.llmModel] || project.llmModel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center">
                    <i className="fas fa-image text-cyan" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">文生图</div>
                    <div className="text-sm text-white font-medium">
                      {MODEL_NAMES[project.t2iModel] || project.t2iModel}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                    <i className="fas fa-video text-amber" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">图生视频</div>
                    <div className="text-sm text-white font-medium">
                      {MODEL_NAMES[project.i2vModel] || project.i2vModel}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">采样步数</div>
                  <div className="text-sm text-white">{project.samplingSteps}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">CFG Scale</div>
                  <div className="text-sm text-white">{project.cfgScale}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">资产共享</div>
                  <div className="text-sm text-white">{project.shareAssets ? "开启" : "关闭"}</div>
                </div>
              </div>
            </div>

            {/* Workflow Progress */}
            {(project.novelFiles && project.novelFiles.length > 0) && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-cloud-upload-alt text-primary" />
                  小说文件
                </h3>
                <div className="space-y-3">
                  {project.novelFiles.map((novel) => (
                    <div key={novel.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <i className="fas fa-file-alt text-primary"></i>
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">{novel.originalName}</div>
                          <div className="text-xs text-slate-500">
                            {novel.format.toUpperCase()} · {(novel.size/1024).toFixed(1)}KB · 约{novel.estimatedWords}字
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        novel.status === 'uploaded' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {novel.status === 'uploaded' ? '已上传' : novel.status}
                      </span>
                    </div>
                  ))}

                  {/* Disclaimer status */}
                  {project.disclaimerAgreements && project.disclaimerAgreements.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <i className="fas fa-file-shield text-emerald-400"></i>
                      </div>
                      <div>
                        <div className="text-sm text-emerald-400 font-medium">免责条款已确认</div>
                        <div className="text-xs text-slate-500">
                          确认时间: {new Date(project.disclaimerAgreements[0].agreedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Split strategy status */}
                  {project.splitStrategies && project.splitStrategies.length > 0 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <i className="fas fa-scissors text-primary"></i>
                      </div>
                      <div>
                        <div className="text-sm text-primary font-medium">
                          分集策略: {project.splitStrategies[0].strategy === 'balanced' ? '智能均衡' :
                                     project.splitStrategies[0].strategy === 'plot' ? '情节驱动' :
                                     project.splitStrategies[0].strategy === 'character' ? '角色驱动' : '自定义'}
                        </div>
                        <div className="text-xs text-slate-500">
                          目标 {project.splitStrategies[0].targetEpisodes === 0 ? '自动' : project.splitStrategies[0].targetEpisodes + '集'} ·
                          分镜范围 {project.splitStrategies[0].shotRangeMin}-{project.splitStrategies[0].shotRangeMax}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Quick Actions */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">快捷操作</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = `/upload?projectId=${projectId}`}
                  className="w-full py-3 px-4 rounded-xl bg-primary/15 text-primary border border-primary/25 text-sm font-medium hover:bg-primary/25 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-upload" />
                  上传小说
                </button>
                <button className="w-full py-3 px-4 rounded-xl bg-surface border border-white/10 text-slate-300 text-sm hover:text-white hover:border-white/20 transition-all flex items-center gap-2">
                  <i className="fas fa-list" />
                  分集管理
                </button>
                <button className="w-full py-3 px-4 rounded-xl bg-surface border border-white/10 text-slate-300 text-sm hover:text-white hover:border-white/20 transition-all flex items-center gap-2">
                  <i className="fas fa-video" />
                  视频工作台
                </button>
              </div>
            </div>

            {/* Project Stats */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">项目统计</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">集数</span>
                  <span className="text-sm text-white font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">分镜数</span>
                  <span className="text-sm text-white font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">资产数</span>
                  <span className="text-sm text-white font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">创建时间</span>
                  <span className="text-sm text-white">
                    {new Date(project.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">更新时间</span>
                  <span className="text-sm text-white">
                    {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
