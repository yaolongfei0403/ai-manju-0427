"use client";

import { Asset, AssetType } from "@/types/asset";

interface GenerationCardProps {
  asset: Asset;
  status: "pending" | "generating" | "completed" | "failed";
  generatedImageUrl?: string;
  onRegenerate: (assetId: string) => void;
}

const typeLabels: Record<AssetType, string> = {
  character: "角色",
  scene: "场景",
  prop: "道具",
};

const typeColors: Record<AssetType, { bg: string; text: string }> = {
  character: { bg: "rgba(99, 102, 241, 0.1)", text: "#a5b4fc" },
  scene: { bg: "rgba(6, 182, 212, 0.1)", text: "#22d3ee" },
  prop: { bg: "rgba(245, 158, 11, 0.1)", text: "#fbbf24" },
};

const typeIcons: Record<AssetType, string> = {
  character: "user",
  scene: "image",
  prop: "cube",
};

export function GenerationCard({ asset, status, generatedImageUrl, onRegenerate }: GenerationCardProps) {
  const colors = typeColors[asset.type];

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: "rgba(30, 41, 59, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Image Container */}
      <div
        className="aspect-square relative flex items-center justify-center"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        {/* Pending State */}
        {status === "pending" && (
          <div className="text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: `${typeColors[asset.type].text}10`, border: `1px solid ${typeColors[asset.type].text}20` }}
            >
              <i
                className={`fas fa-${typeIcons[asset.type]} text-${asset.type}`}
                style={{ color: typeColors[asset.type].text, opacity: 0.5 }}
              ></i>
            </div>
            <div className="text-[10px] text-slate-500">等待生成</div>
          </div>
        )}

        {/* Generating State */}
        {status === "generating" && (
          <div className="text-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1" style={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}>
              <i className="fas fa-circle-notch fa-spin text-primary text-xs"></i>
            </div>
            <div className="text-[10px] text-white">生成中...</div>
          </div>
        )}

        {/* Completed State */}
        {status === "completed" && generatedImageUrl && (
          <>
            <img
              src={generatedImageUrl}
              alt={asset.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Regenerate Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => onRegenerate(asset.id)}
                className="px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1"
                style={{ backgroundColor: "rgba(99, 102, 241, 0.8)" }}
              >
                <i className="fas fa-redo text-[10px]"></i>
                重新生成
              </button>
            </div>
          </>
        )}

        {/* Failed State */}
        {status === "failed" && (
          <div className="text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <i className="fas fa-exclamation-circle text-red-400"></i>
            </div>
            <div className="text-[10px] text-red-400">生成失败</div>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span
            className="px-1.5 py-0.5 rounded text-[9px]"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {typeLabels[asset.type]}
          </span>
        </div>

        {/* Regenerate Button (visible when completed) */}
        {status === "completed" && (
          <button
            onClick={() => onRegenerate(asset.id)}
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", border: "1px solid rgba(255, 255, 255, 0.2)" }}
          >
            <i className="fas fa-redo text-[10px] text-white/70 hover:text-white"></i>
          </button>
        )}
      </div>

      {/* Asset Info */}
      <div className="p-2">
        <div className="text-[11px] text-white font-medium truncate">{asset.name}</div>
        <div className="text-[9px] text-slate-500 truncate mt-0.5">
          {asset.prompt?.substring(0, 30)}...
        </div>
      </div>
    </div>
  );
}
