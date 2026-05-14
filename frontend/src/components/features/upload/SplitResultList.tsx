"use client";

import { useState } from "react";
import { EpisodeResult } from "@/lib/api/upload";

interface SplitResultListProps {
  episodes: EpisodeResult[];
  totalEpisodes: number;
  strategy: string;
  selectedEpisodes?: number[];
  onToggleSelection?: (index: number) => void;
  onSplit?: (index: number) => void;
  onDelete?: (index: number) => void;
}

const STRATEGY_NAMES: Record<string, string> = {
  balanced: "智能均衡",
  plot: "情节驱动",
  character: "角色驱动",
  custom: "自定义策略",
};

function DensityBadge({ density }: { density: number }) {
  const getColor = (d: number) => {
    if (d >= 0.9) return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", label: "高潮" };
    if (d >= 0.75) return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", label: "高能" };
    if (d >= 0.5) return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", label: "平稳" };
    return { bg: "rgba(100, 116, 139, 0.15)", text: "#64748b", label: "铺垫" };
  };
  const color = getColor(density);

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {color.label}
    </span>
  );
}

function EpisodeCard({
  episode,
  index,
  isSelected,
  onToggleSelection,
  onSplit,
  onDelete,
  showSelection,
}: {
  episode: EpisodeResult;
  index: number;
  isSelected: boolean;
  onToggleSelection?: (index: number) => void;
  onSplit?: (index: number) => void;
  onDelete?: (index: number) => void;
  showSelection: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 hover:border-emerald/30 ${
        isSelected ? "border-blue-500/50 bg-blue-500/5" : ""
      }`}
      style={{
        backgroundColor: "rgba(30, 41, 59, 0.5)",
        borderColor: isSelected ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Episode Header */}
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {showSelection && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection?.(index);
                }}
                className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-slate-500 hover:border-blue-400"
                }`}
              >
                {isSelected && <i className="fas fa-check text-xs"></i>}
              </button>
            )}
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
            >
              {episode.orderIndex}
            </span>
            <h3 className="text-sm font-semibold text-white">{episode.title}</h3>
          </div>
          <DensityBadge density={episode.sceneDensity} />
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
          <span className="flex items-center gap-1">
            <i className="fas fa-camera" style={{ fontSize: "10px" }}></i>
            {episode.estimatedShots}分镜
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-book" style={{ fontSize: "10px" }}></i>
            {episode.chapters.length}章节
          </span>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2">{episode.summary}</p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
        >
          <div className="pt-3">
            <h4 className="text-xs font-medium text-slate-300 mb-2">章节列表</h4>
            <div className="space-y-1">
              {episode.chapters.map((chapter, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs text-slate-400"
                >
                  <i className="fas fa-file-lines" style={{ fontSize: "10px", color: "#64748b" }}></i>
                  {chapter}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">情节密度</span>
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${episode.sceneDensity * 100}%`,
                    backgroundColor: episode.sceneDensity >= 0.9 ? "#ef4444" : episode.sceneDensity >= 0.75 ? "#f59e0b" : "#10b981",
                  }}
                ></div>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "#64748b" }}>
                {Math.round(episode.sceneDensity * 100)}%
              </span>
            </div>
            {showSelection && (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplit?.(index);
                  }}
                  className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                >
                  <i className="fas fa-expand-alt"></i>
                  拆分
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(index);
                  }}
                  className="text-xs text-red-400 hover:underline flex items-center gap-1"
                >
                  <i className="fas fa-trash-alt"></i>
                  删除
                </button>
              </div>
            )}
            {!showSelection && (
              <button
                className="text-xs text-emerald hover:underline"
                style={{ color: "#10b981" }}
              >
                查看分镜预览
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expand indicator */}
      <div
        className="px-4 pb-2 flex items-center justify-center"
        style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
      >
        <button
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <i className={`fas ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"} mr-1`}></i>
          {isExpanded ? "收起" : "展开详情"}
        </button>
      </div>
    </div>
  );
}

export default function SplitResultList({
  episodes,
  totalEpisodes,
  strategy,
  selectedEpisodes = [],
  onToggleSelection,
  onSplit,
  onDelete,
}: SplitResultListProps) {
  const [showAll, setShowAll] = useState(false);
  const showSelection = selectedEpisodes.length > 0 || onToggleSelection !== undefined;

  // Limit display to 12 episodes unless "show all" is clicked
  const MAX_VISIBLE = 12;
  const displayedEpisodes = showAll ? episodes : episodes.slice(0, MAX_VISIBLE);
  const hasMore = episodes.length > MAX_VISIBLE;

  // Calculate statistics
  const totalShots = episodes.reduce((sum, ep) => sum + ep.estimatedShots, 0);
  const avgDensity = episodes.reduce((sum, ep) => sum + ep.sceneDensity, 0) / episodes.length;
  const peakEpisode = episodes.reduce((max, ep) => (ep.sceneDensity > max.sceneDensity ? ep : max), episodes[0]);

  return (
    <div>
      {/* Stats Summary */}
      <div
        className="p-4 rounded-xl mb-4"
        style={{ backgroundColor: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-film text-emerald" style={{ color: "#10b981", fontSize: "12px" }}></i>
            <span className="text-sm font-medium text-white">分集统计</span>
          </div>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
          >
            {STRATEGY_NAMES[strategy] || strategy}策略
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-0.5">{totalEpisodes}</div>
            <div className="text-xs text-slate-400">总集数</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-0.5">{totalShots}</div>
            <div className="text-xs text-slate-400">总分镜</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-0.5">{Math.round(avgDensity * 100)}%</div>
            <div className="text-xs text-slate-400">平均密度</div>
          </div>
        </div>

        {peakEpisode && (
          <div
            className="mt-3 p-2 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
          >
            <i className="fas fa-fire text-red-400" style={{ fontSize: "12px", color: "#ef4444" }}></i>
            <span className="text-xs text-slate-300">
              高潮集：第{peakEpisode.orderIndex}集「{peakEpisode.title.replace("第" + peakEpisode.orderIndex + "集：", "")}」
            </span>
          </div>
        )}
      </div>

      {/* Episode List */}
      <div className="space-y-3">
        {displayedEpisodes.map((episode, idx) => (
          <EpisodeCard
            key={episode.orderIndex}
            episode={episode}
            index={idx}
            isSelected={selectedEpisodes.includes(idx)}
            onToggleSelection={onToggleSelection}
            onSplit={onSplit}
            onDelete={onDelete}
            showSelection={showSelection}
          />
        ))}
      </div>

      {/* Show More Button */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
          style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <i className="fas fa-chevron-down mr-2"></i>
          查看更多集数 ({episodes.length - MAX_VISIBLE}集)
        </button>
      )}

      {showAll && hasMore && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full mt-4 py-3 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
          style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <i className="fas fa-chevron-up mr-2"></i>
          收起
        </button>
      )}
    </div>
  );
}