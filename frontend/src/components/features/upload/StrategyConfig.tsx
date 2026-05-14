"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNovelStore } from "@/stores/novel";

export type SplitStrategyType = "balanced" | "plot" | "character" | "custom";

export interface SplitStrategyConfig {
  strategy: SplitStrategyType;
  targetEpisodes: number;
  shotRangeMin: number;
  shotRangeMax: number;
  keepChapterIntegrity: boolean;
  specialFirstLast: boolean;
  preserveNarrative: boolean;
  customPrompt: string;
}

const STRATEGIES = [
  {
    id: "balanced" as SplitStrategyType,
    title: "智能均衡",
    icon: "fas fa-scale-balanced",
    description: "自动平衡章节完整性与情节节奏，适合大多数小说。",
  },
  {
    id: "plot" as SplitStrategyType,
    title: "情节驱动",
    icon: "fas fa-mountain",
    description: "以高潮、转折点和悬念为边界拆分，增强追剧吸引力。",
  },
  {
    id: "character" as SplitStrategyType,
    title: "角色驱动",
    icon: "fas fa-users",
    description: "以角色出场、成长和关系变化为边界。适合群像剧。",
  },
  {
    id: "custom" as SplitStrategyType,
    title: "自定义策略",
    icon: "fas fa-wand-magic-sparkles",
    description: "输入个性化提示词，AI 完全按照您的需求定制分集。",
  },
];

const DEFAULT_CONFIG: SplitStrategyConfig = {
  strategy: "balanced",
  targetEpisodes: 0,
  shotRangeMin: 8,
  shotRangeMax: 14,
  keepChapterIntegrity: true,
  specialFirstLast: true,
  preserveNarrative: false,
  customPrompt: "",
};

interface StrategyConfigProps {
  fileId: string;
  projectId?: string;
}

// Strategy color mapping
const STRATEGY_COLORS = {
  balanced: {
    bg: "rgba(16, 185, 129, 0.1)",
    bgSelected: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.2)",
    borderSelected: "rgba(16, 185, 129, 0.4)",
    iconBg: "rgba(16, 185, 129, 0.1)",
    iconBorder: "rgba(16, 185, 129, 0.2)",
    iconColor: "#10b981",
    checkBg: "#10b981",
    textColor: "#10b981",
  },
  plot: {
    bg: "rgba(99, 102, 241, 0.1)",
    bgSelected: "rgba(99, 102, 241, 0.15)",
    border: "rgba(99, 102, 241, 0.2)",
    borderSelected: "rgba(99, 102, 241, 0.4)",
    iconBg: "rgba(99, 102, 241, 0.1)",
    iconBorder: "rgba(99, 102, 241, 0.2)",
    iconColor: "#6366f1",
    checkBg: "#6366f1",
    textColor: "#6366f1",
  },
  character: {
    bg: "rgba(6, 182, 212, 0.1)",
    bgSelected: "rgba(6, 182, 212, 0.15)",
    border: "rgba(6, 182, 212, 0.2)",
    borderSelected: "rgba(6, 182, 212, 0.4)",
    iconBg: "rgba(6, 182, 212, 0.1)",
    iconBorder: "rgba(6, 182, 212, 0.2)",
    iconColor: "#06b6d4",
    checkBg: "#06b6d4",
    textColor: "#06b6d4",
  },
  custom: {
    bg: "rgba(245, 158, 11, 0.1)",
    bgSelected: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.2)",
    borderSelected: "rgba(245, 158, 11, 0.4)",
    iconBg: "rgba(245, 158, 11, 0.1)",
    iconBorder: "rgba(245, 158, 11, 0.2)",
    iconColor: "#f59e0b",
    checkBg: "#f59e0b",
    textColor: "#f59e0b",
  },
};

export default function StrategyConfig({ fileId, projectId }: StrategyConfigProps) {
  const router = useRouter();

  const [config, setConfig] = useState<SplitStrategyConfig>(DEFAULT_CONFIG);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // AC7: 追踪用户是否已手动选择过策略（而非仅依赖默认选中）
  const [strategyManuallySelected, setStrategyManuallySelected] = useState(false);

  useEffect(() => {
    const stored = useNovelStore.getState().splitStrategy;
    if (stored) {
      setConfig(stored);
    }
  }, []);

  const handleStrategySelect = (strategyId: SplitStrategyType) => {
    setStrategyManuallySelected(true);
    setConfig((prev) => ({ ...prev, strategy: strategyId }));
  };

  const handleEpisodeCountChange = (value: number) => {
    setConfig((prev) => ({ ...prev, targetEpisodes: value }));
  };

  const handleShotMinChange = (value: number) => {
    setConfig((prev) => ({ ...prev, shotRangeMin: Math.min(value, prev.shotRangeMax) }));
  };

  const handleShotMaxChange = (value: number) => {
    setConfig((prev) => ({ ...prev, shotRangeMax: Math.max(value, prev.shotRangeMin) }));
  };

  const handleToggle = (field: keyof SplitStrategyConfig) => {
    setConfig((prev) => ({ ...prev, [field]: !prev[field as keyof typeof prev] }));
  };

  const handleCustomPromptChange = (value: string) => {
    setConfig((prev) => ({ ...prev, customPrompt: value }));
  };

  const getEpisodeCountDisplay = () => {
    return config.targetEpisodes === 0 ? "自动" : `${config.targetEpisodes}`;
  };

  const getStrategyPreview = () => {
    const strategyNames: Record<SplitStrategyType, string> = {
      balanced: "智能均衡",
      plot: "情节驱动",
      character: "角色驱动",
      custom: "自定义策略",
    };
    const episodeText = config.targetEpisodes === 0 ? "自动" : `${config.targetEpisodes}集`;
    const shotText = `${config.shotRangeMin}-${config.shotRangeMax}个分镜`;
    return `AI 将基于「${strategyNames[config.strategy]}」策略分析小说结构，预计生成 ${episodeText}，每集 ${shotText}。`;
  };

  const handleSubmit = async () => {
    // AC7: 防止未完成配置就提交
    if (!strategyManuallySelected) {
      setShowError(true);
      setErrorMessage("请选择分集策略");
      return;
    }
    if (config.strategy === "custom" && config.customPrompt.trim().length === 0) {
      setShowError(true);
      setErrorMessage("请输入自定义分集提示词");
      return;
    }

    // 立即跳转到执行页面，不等待 API 响应
    // 将策略配置通过 URL 传递
    const strategyParams = new URLSearchParams({
      strategy: config.strategy,
      targetEpisodes: String(config.targetEpisodes),
      shotRangeMin: String(config.shotRangeMin),
      shotRangeMax: String(config.shotRangeMax),
      keepChapterIntegrity: String(config.keepChapterIntegrity),
      specialFirstLast: String(config.specialFirstLast),
      preserveNarrative: String(config.preserveNarrative),
      customPrompt: config.customPrompt,
    });

    const params = new URLSearchParams();
    params.set("fileId", fileId);
    if (projectId) params.set("projectId", projectId);
    params.set("strategyConfig", strategyParams.toString());

    router.push(`/upload/strategy/executing?${params.toString()}`);
  };

  const colors = STRATEGY_COLORS[config.strategy];

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/5">
          <i className="fas fa-sliders text-primary text-xl" style={{ color: "#6366f1" }}></i>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">配置分集策略</h2>
        <p className="text-sm text-slate-400">选择拆分模式并调整参数，AI 将基于您的策略定制分集方案</p>
      </div>

      <div className="glass-panel rounded-2xl p-5 md:p-6 mb-5 shadow-2xl shadow-black/20">
        {/* 策略模式选择 */}
        <div className="mb-6">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 block">
            选择拆分策略
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {STRATEGIES.map((strategy) => {
              const isSelected = config.strategy === strategy.id;
              const c = STRATEGY_COLORS[strategy.id];

              return (
                <div
                  key={strategy.id}
                  id={`strategy-${strategy.id}`}
                  className="strategy-card rounded-xl border p-4 cursor-pointer transition-all duration-300"
                  style={{
                    backgroundColor: isSelected ? c.bgSelected : c.bg,
                    borderColor: isSelected ? c.borderSelected : c.border,
                  }}
                  onClick={() => handleStrategySelect(strategy.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: c.iconBg,
                        border: `1px solid ${c.iconBorder}`,
                      }}
                    >
                      <i className={`${strategy.icon}`} style={{ color: c.iconColor, fontSize: "12px" }}></i>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: isSelected ? c.checkBg : "transparent",
                        opacity: isSelected ? 1 : 0,
                        transition: "all 0.3s ease",
                      }}
                    >
                      <i className="fas fa-check text-white" style={{ fontSize: "9px" }}></i>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{strategy.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{strategy.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 参数配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* 目标集数 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">目标集数</label>
              <span className="text-sm font-bold" style={{ color: "#10b981" }} id="episodeCountValue">{getEpisodeCountDisplay()}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={config.targetEpisodes}
              onChange={(e) => handleEpisodeCountChange(parseInt(e.target.value))}
              className="w-full mb-1"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>自动</span>
              <span>25</span>
              <span>50集</span>
            </div>
          </div>

          {/* 分镜数范围 */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">每集分镜数范围</label>
              <span className="text-sm font-bold" style={{ color: "#10b981" }} id="shotRangeValue">
                {config.shotRangeMin} - {config.shotRangeMax}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3"
                max="30"
                value={config.shotRangeMin}
                onChange={(e) => handleShotMinChange(parseInt(e.target.value) || 3)}
                className="w-16 px-2 py-1.5 rounded-lg text-sm text-white text-center focus:outline-none"
                style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                min="3"
                max="30"
                value={config.shotRangeMax}
                onChange={(e) => handleShotMaxChange(parseInt(e.target.value) || 14)}
                className="w-16 px-2 py-1.5 rounded-lg text-sm text-white text-center focus:outline-none"
                style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              />
            </div>
          </div>
        </div>

        {/* 高级选项 */}
        <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <label className="text-sm font-medium text-white mb-3 block">高级选项</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: "#cbd5e1" }}>保持章节完整性</div>
                <div className="text-xs text-slate-500">避免同一章节被拆分到两集</div>
              </div>
              <input
                type="checkbox"
                className="toggle-switch"
                checked={config.keepChapterIntegrity}
                onChange={() => handleToggle("keepChapterIntegrity")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: "#cbd5e1" }}>首尾集特殊处理</div>
                <div className="text-xs text-slate-500">首集铺垫，尾集收尾或留悬念</div>
              </div>
              <input
                type="checkbox"
                className="toggle-switch"
                checked={config.specialFirstLast}
                onChange={() => handleToggle("specialFirstLast")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: "#cbd5e1" }}>保留插叙/倒叙结构</div>
                <div className="text-xs text-slate-500">非线性叙事作品建议开启</div>
              </div>
              <input
                type="checkbox"
                className="toggle-switch"
                checked={config.preserveNarrative}
                onChange={() => handleToggle("preserveNarrative")}
              />
            </div>
          </div>
        </div>

        {/* 自定义提示词 - 仅自定义策略显示 */}
        {config.strategy === "custom" && (
          <div className="mb-5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              自定义分集提示词
            </label>
            <textarea
              value={config.customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
              rows={4}
              placeholder="描述您的分集需求，例如：&#10;- 前3集为铺垫期，每集不超过10个分镜&#10;- 第5集必须是全剧第一个高潮&#10;- 每集结尾必须留下悬念钩子..."
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 resize-none custom-scroll leading-relaxed transition-all"
              style={{
                backgroundColor: "#1e293b",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* 策略预览 */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-eye text-emerald text-xs" style={{ color: "#10b981" }}></i>
            <span className="text-xs font-medium" style={{ color: "#10b981" }}>策略预览</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed" id="strategyPreview">
            {getStrategyPreview()}
          </p>
        </div>
      </div>

      {/* 错误提示 */}
      {showError && (
        <div className="mb-3 p-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <i className="fas fa-exclamation-circle text-red-400 text-xs" />
          <span className="text-red-400 text-xs">{errorMessage}</span>
        </div>
      )}

      {/* 按钮 */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-slate-300 font-medium transition-all hover:text-white"
          style={{ backgroundColor: "#1e293b", border: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <i className="fas fa-arrow-left mr-2" />
          返回
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed generate-btn"
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin" />
              <span>处理中...</span>
            </>
          ) : (
            <>
              <i className="fas fa-bolt"></i>
              <span>开始智能拆解</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
