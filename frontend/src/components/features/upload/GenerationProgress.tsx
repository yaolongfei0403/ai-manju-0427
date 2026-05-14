"use client";

interface GenerationProgressProps {
  currentIndex: number;
  total: number;
  currentName: string;
  currentType: "character" | "scene" | "prop";
  currentPrompt: string;
  progress: number;
  eta: string;
}

const typeLabels = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

const typeColors = {
  character: "#6366f1",
  scene: "#06b6d4",
  prop: "#f59e0b",
};

export function GenerationProgress({
  currentIndex,
  total,
  currentName,
  currentType,
  currentPrompt,
  progress,
  eta,
}: GenerationProgressProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}
        >
          <i className="fas fa-spinner fa-spin text-primary"></i>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">正在生成资产参考图</h3>
          <p className="text-xs text-slate-400">
            {currentIndex + 1} / {total}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">生成进度</span>
          <span className="text-xs font-mono font-bold" style={{ color: "#6366f1" }}>
            {progress}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#334155" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #6366f1, #8b5cf6)",
            }}
          />
        </div>
      </div>

      {/* Current Generation Info */}
      <div
        className="p-3 rounded-xl mb-4"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">当前生成</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${typeColors[currentType]}20`,
              color: typeColors[currentType],
            }}
          >
            {typeLabels[currentType]}
          </span>
        </div>
        <div className="text-sm font-medium text-white mb-1">{currentName}</div>
        <div className="text-xs text-slate-500 line-clamp-2">{currentPrompt}</div>
      </div>

      {/* ETA */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          <i className="fas fa-clock mr-1"></i>
          预计剩余时间
        </span>
        <span className="text-xs text-slate-400">{eta}</span>
      </div>
    </div>
  );
}
