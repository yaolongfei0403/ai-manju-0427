"use client";

import { ExtractedAssets } from "@/types/asset";

interface AssetProgressPanelProps {
  progress: number;
  status: "idle" | "processing" | "completed" | "failed";
  assets: ExtractedAssets | null;
  error?: string | null;
  onRetry?: () => void;
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">总体进度</span>
        <span className="text-xs font-mono" style={{ color }}>{progress}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}

function AssetCounter({ label, count, icon, color }: { label: string; count: number; icon: string; color: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
        <i className={`fas ${icon} text-sm`}></i>
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-lg font-bold text-white">{count}</div>
      </div>
    </div>
  );
}

export default function AssetProgressPanel({ progress, status, assets, error, onRetry }: AssetProgressPanelProps) {
  if (status === "failed") {
    return (
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
            <i className="fas fa-exclamation-circle text-lg"></i>
          </div>
          <div>
            <div className="text-sm font-medium text-red-400">提取失败</div>
            <div className="text-xs text-slate-400">{error || "未知错误"}</div>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#ef4444" }}
          >
            <i className="fas fa-redo mr-2"></i>
            重新提取
          </button>
        )}
      </div>
    );
  }

  if (status === "completed" && assets) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-check-circle text-emerald" style={{ color: "#10b981" }}></i>
          <span className="text-sm font-medium text-emerald" style={{ color: "#10b981" }}>提取完成</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <AssetCounter label="角色" count={assets.characters?.length || 0} icon="fa-user" color="#3b82f6" />
          <AssetCounter label="场景" count={assets.scenes?.length || 0} icon="fa-mountain-sun" color="#10b981" />
          <AssetCounter label="道具" count={assets.props?.length || 0} icon="fa-wand-magic-sparkles" color="#f59e0b" />
        </div>

        <ProgressBar progress={100} color="#10b981" />
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <div className="flex items-center gap-2 mb-4">
        <i className="fas fa-spinner fa-spin text-primary" style={{ color: "#10b981" }}></i>
        <span className="text-sm font-medium text-slate-300">提取中...</span>
      </div>

      <ProgressBar progress={progress} color="#10b981" />

      {assets && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <AssetCounter label="角色" count={assets.characters?.length || 0} icon="fa-user" color="#3b82f6" />
          <AssetCounter label="场景" count={assets.scenes?.length || 0} icon="fa-mountain-sun" color="#10b981" />
          <AssetCounter label="道具" count={assets.props?.length || 0} icon="fa-wand-magic-sparkles" color="#f59e0b" />
        </div>
      )}
    </div>
  );
}