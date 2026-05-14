"use client";

import { AssetType } from "@/types/asset";

interface AssetExtractCardProps {
  type: AssetType;
  count: number;
  isExtracting: boolean;
  onStartExtract?: () => void;
}

const TYPE_CONFIG = {
  character: {
    label: "角色",
    icon: "fa-user",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  scene: {
    label: "场景",
    icon: "fa-mountain-sun",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  prop: {
    label: "道具",
    icon: "fa-wand-magic-sparkles",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
};

export default function AssetExtractCard({ type, count, isExtracting, onStartExtract }: AssetExtractCardProps) {
  const config = TYPE_CONFIG[type];

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center gap-3 transition-all"
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        <i className={`fas ${config.icon} text-lg`}></i>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium text-white">{config.label}</div>
        <div className="text-2xl font-bold text-white mt-1">{count}</div>
        <div className="text-xs text-slate-400">个{config.label}</div>
      </div>
      {isExtracting && (
        <div className="w-full">
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
            <div
              className="h-full rounded-full animate-pulse"
              style={{ backgroundColor: config.color, width: "60%" }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}