"use client";

import { useState } from "react";
import { Asset, AssetType } from "@/types/asset";

interface RegenerateModalProps {
  asset: Asset;
  onRegenerate: (assetId: string) => Promise<void>;
  onClose: () => void;
}

export function RegenerateModal({ asset, onRegenerate, onClose }: RegenerateModalProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerate(asset.id);
      onClose();
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">重新生成</h3>
            <p className="text-sm text-slate-400 mt-0.5">{asset.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Prompt */}
        <div
          className="p-3 rounded-xl mb-4"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.15)" }}
        >
          <div className="text-[10px] text-slate-500 mb-1">生成提示词</div>
          <div className="text-xs text-slate-300 line-clamp-3">{asset.prompt}</div>
        </div>

        {/* Warning */}
        <div
          className="p-3 rounded-xl mb-4"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
        >
          <div className="flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-amber-400 text-sm"></i>
            <span className="text-xs text-amber-400">重新生成将替换当前图片</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 font-medium transition-all hover:text-white hover:bg-white/10"
          >
            取消
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="px-5 py-2 rounded-lg text-sm text-white font-bold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            }}
          >
            {isRegenerating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-1"></i>
                生成中...
              </>
            ) : (
              <>
                <i className="fas fa-redo mr-1"></i>
                重新生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
