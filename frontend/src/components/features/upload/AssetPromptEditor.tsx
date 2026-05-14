"use client";

import { useState } from "react";
import { Asset, AssetType } from "@/types/asset";
import { pollishPrompt } from "@/lib/api/assets";

interface AssetPromptEditorProps {
  asset: Asset;
  projectId: string;
  onSave: (assetId: string, prompt: string, description?: string) => Promise<void>;
  onClose: () => void;
}

const polishTemplates = {
  character: [
    "电影级画面质量，{prompt}，8K超高清，详细光影，辛烷渲染",
    "详细面部特写，{prompt}，专业摄影棚灯光，柔和背景",
    "全身角色设计，{prompt}，动态姿态，电影级构图",
  ],
  scene: [
    "史诗级场景概念图，{prompt}，广角视角，大气光效",
    "电影感场景，{prompt}，景深效果，8K渲染",
    "氛围感场景，{prompt}，戏剧性光线，影视级质感",
  ],
  prop: [
    "精细道具设计，{prompt}，3D渲染，工业设计风格",
    "高细节道具，{prompt}，收藏级品质，8K贴图",
    "艺术道具展示，{prompt}，纯色背景，产品摄影风格",
  ],
};

const typeColors: Record<AssetType, { bg: string; text: string; border: string }> = {
  character: { bg: "rgba(99, 102, 241, 0.1)", text: "#a5b4fc", border: "rgba(99, 102, 241, 0.3)" },
  scene: { bg: "rgba(6, 182, 212, 0.1)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" },
  prop: { bg: "rgba(245, 158, 11, 0.1)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
};

const typeLabels: Record<AssetType, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

export function AssetPromptEditor({ asset, projectId, onSave, onClose }: AssetPromptEditorProps) {
  const [prompt, setPrompt] = useState(asset.prompt || "");
  const [description, setDescription] = useState(asset.description || "");
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const colors = typeColors[asset.type];

  const handlePolish = async () => {
    if (!prompt.trim()) return;

    setIsPolishing(true);
    try {
      const polished = await pollishPrompt(
        projectId,
        asset.type,
        prompt
      );
      setPrompt(polished);
    } catch (err) {
      console.error("润色失败:", err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = async () => {
    if (!prompt.trim()) return;

    setIsSaving(true);
    try {
      await onSave(asset.id, prompt, description || undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">编辑资产提示词</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              {typeLabels[asset.type]} - {asset.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Type badge */}
        <div className="mb-4">
          <span
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {typeLabels[asset.type]}
          </span>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              <i className="fas fa-align-left mr-1"></i>
              补充描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-16 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary/50 resize-none custom-scroll"
              placeholder="输入补充描述..."
            />
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-slate-400">
                <i className="fas fa-wand-magic-sparkles mr-1"></i>
                生成提示词
              </label>
              <button
                onClick={handlePolish}
                disabled={isPolishing || !prompt.trim()}
                className="px-2 py-0.5 rounded text-xs flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(139, 92, 246, 0.25)",
                }}
              >
                {isPolishing ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-xs"></i>
                    润色中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-wand-magic-sparkles text-xs"></i>
                    AI润色
                  </>
                )}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-24 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary/50 resize-none custom-scroll"
              placeholder="输入或修改生成提示词..."
            />
          </div>

          {/* Episode count */}
          <div className="text-xs text-slate-500">
            <i className="fas fa-link mr-1"></i>
            关联分集：{asset.episodeIds?.length || 0} 集
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 font-medium transition-all hover:text-white hover:bg-white/10"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !prompt.trim()}
            className="px-5 py-2 rounded-lg text-sm text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            }}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-1"></i>
                保存中...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-1"></i>
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
