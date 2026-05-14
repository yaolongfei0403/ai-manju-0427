"use client";

import { useEffect, useState } from "react";
import { getPublicModels, PublicModel, PublicModels } from "@/lib/api/models";

interface ModelConfigProps {
  llmModel: string;
  t2iModel: string;
  i2vModel: string;
  onLLMChange: (model: string) => void;
  onT2IChange: (model: string) => void;
  onI2VChange: (model: string) => void;
}

// Default fallback models in case API fails
const DEFAULT_MODELS: PublicModels = {
  llm: [
    { code: "gpt4o", name: "GPT-4o", provider: "OpenAI", description: "最强推理" },
    { code: "claude", name: "Claude 3.5", provider: "Anthropic", description: "长文本" },
    { code: "deepseek", name: "DeepSeek-V3", provider: "DeepSeek", description: "高性价比" },
  ],
  t2i: [
    { code: "sdxl", name: "SDXL", provider: "Stability AI", description: "开源可控" },
    { code: "midjourney", name: "Midjourney V6", provider: "Midjourney", description: "艺术品质" },
    { code: "dalle3", name: "DALL·E 3", provider: "OpenAI", description: "语义理解强" },
  ],
  i2v: [
    { code: "runway", name: "Runway Gen-3", provider: "Runway", description: "电影级运动" },
    { code: "pika", name: "Pika 1.5", provider: "Pika Labs", description: "创意特效" },
    { code: "luma", name: "Luma Dream Machine", provider: "Luma AI", description: "物理真实" },
  ],
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: "primary",
  Anthropic: "secondary",
  DeepSeek: "cyan",
  "Stability AI": "cyan",
  Midjourney: "accent",
  "Pika Labs": "rose",
  "Luma AI": "purple-400",
  default: "primary",
};

const PROVIDER_ICONS: Record<string, string> = {
  OpenAI: "fa-robot",
  Anthropic: "fa-feather",
  DeepSeek: "fa-bolt",
  "Stability AI": "fa-paint-brush",
  Midjourney: "fa-wand-magic-sparkles",
  "Pika Labs": "fa-clapperboard",
  "Luma AI": "fa-wand-magic",
  default: "fa-microchip",
};

function ModelCard({
  model,
  isSelected,
  onClick,
}: {
  model: PublicModel;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colorKey = model.provider as keyof typeof PROVIDER_COLORS;
  const color = PROVIDER_COLORS[colorKey] || PROVIDER_COLORS.default;
  const icon = PROVIDER_ICONS[colorKey] || PROVIDER_ICONS.default;

  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    cyan: "bg-cyan/10 text-cyan border-cyan/20",
    accent: "bg-accent/10 text-accent border-accent/20",
    emerald: "bg-emerald/10 text-emerald border-emerald/20",
    amber: "bg-amber/10 text-amber border-amber/20",
    rose: "bg-rose/10 text-rose border-rose/20",
    "purple-400": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div
      onClick={onClick}
      className={`model-card rounded-xl border bg-surface/30 p-4 cursor-pointer transition-all hover:shadow-lg group ${
        isSelected ? "active" : ""
      }`}
      style={{
        borderColor: isSelected ? "#6366f1" : "rgba(255,255,255,0.1)",
        background: isSelected ? "rgba(99,102,241,0.06)" : undefined,
        boxShadow: isSelected ? "0 0 0 2px rgba(99,102,241,0.15), 0 8px 24px rgba(99,102,241,0.1)" : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClasses[color] || colorClasses.primary} transition-all group-hover:scale-105`}
          style={{
            boxShadow: isSelected ? `0 0 12px currentColor` : undefined,
          }}
        >
          <i className={`fas ${icon} text-lg`} />
        </div>
        <div
          className={`model-check w-5 h-5 rounded-full flex items-center justify-center ${
            isSelected ? "opacity-100 scale-100" : "opacity-0 scale-0"
          }`}
          style={{
            background: "#6366f1",
            transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <i className="fas fa-check text-white text-[10px]" />
        </div>
      </div>
      <div className="text-sm font-bold text-white mb-1">{model.name}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400">{model.provider}</span>
        {model.description && (
          <>
            <span className="text-slate-600 text-[10px]">·</span>
            <span className="text-[10px] text-slate-500">{model.description}</span>
          </>
        )}
      </div>
      {isSelected && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-[10px] text-emerald-400">已选择</span>
        </div>
      )}
    </div>
  );
}

export default function ModelConfig({
  llmModel,
  t2iModel,
  i2vModel,
  onLLMChange,
  onT2IChange,
  onI2VChange,
}: ModelConfigProps) {
  const [models, setModels] = useState<PublicModels>(DEFAULT_MODELS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const data = await getPublicModels();
        setModels(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load models:", err);
        setError("加载模型失败，使用默认配置");
        // Keep default models on error
      } finally {
        setIsLoading(false);
      }
    }

    loadModels();
  }, []);

  return (
    <div className="glass-panel rounded-2xl p-6 slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <i className="fas fa-robot text-emerald-400 text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">AI 模型配置</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                默认
              </span>
            </div>
            <span className="text-[11px] text-slate-500">项目默认模型，后续各环节可单独调整</span>
          </div>
        </div>
        {isLoading && (
          <span className="text-[10px] text-slate-500">
            <i className="fas fa-circle-notch fa-spin mr-1" />
            加载中...
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-amber-400 text-sm" />
          <span className="text-amber-400 text-xs">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* LLM Models */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <i className="fas fa-brain text-white text-sm" />
            </div>
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                LLM 大语言模型
                <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] border border-primary/20">
                  文本生成
                </span>
              </label>
              <div className="text-[10px] text-slate-500">用于小说分析、分镜拆分、Prompt 生成</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {models.llm.map((model) => (
              <ModelCard
                key={model.code}
                model={model}
                isSelected={llmModel === model.code}
                onClick={() => onLLMChange(model.code)}
              />
            ))}
          </div>
        </div>

        {/* T2I Models */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan to-teal-400 flex items-center justify-center shadow-lg shadow-cyan/30">
              <i className="fas fa-image text-white text-sm" />
            </div>
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                文生图模型
                <span className="px-1.5 py-0.5 rounded bg-cyan/15 text-cyan text-[10px] border border-cyan/20">
                  画面生成
                </span>
              </label>
              <div className="text-[10px] text-slate-500">用于分镜画面生成</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {models.t2i.map((model) => (
              <ModelCard
                key={model.code}
                model={model}
                isSelected={t2iModel === model.code}
                onClick={() => onT2IChange(model.code)}
              />
            ))}
          </div>
        </div>

        {/* I2V Models */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber to-orange-400 flex items-center justify-center shadow-lg shadow-amber/30">
              <i className="fas fa-video text-white text-sm" />
            </div>
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                图生视频模型
                <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[10px] border border-amber/20">
                  动态生成
                </span>
              </label>
              <div className="text-[10px] text-slate-500">用于分镜图转动态视频</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {models.i2v.map((model) => (
              <ModelCard
                key={model.code}
                model={model}
                isSelected={i2vModel === model.code}
                onClick={() => onI2VChange(model.code)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
