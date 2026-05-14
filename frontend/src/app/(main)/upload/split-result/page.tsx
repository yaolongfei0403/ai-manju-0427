"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useNovelStore } from "@/stores/novel";
import { EpisodeResult } from "@/lib/api/upload";

interface SplitResult {
  taskId: string;
  status: "processing" | "completed" | "failed";
  episodes: EpisodeResult[];
  totalEpisodes: number;
  strategy: string;
  generatedAt: string;
  error?: { code: string; message: string };
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

function SplitResultPageContent() {
  const searchParams = useSearchParams();
  const { _hasHydrated, splitResult, loadSplitResult, mergeEpisodes, splitEpisode, deleteEpisode } = useNovelStore();

  const fileId = searchParams.get("fileId");
  const projectId = searchParams.get("projectId");
  const taskIdParam = searchParams.get("taskId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SplitResult | null>(null);
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState<number | null>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);
  const [isMergeMode, setIsMergeMode] = useState(false);

  // Sync local result with store splitResult
  useEffect(() => {
    if (splitResult && _hasHydrated) {
      setResult(splitResult);
    }
  }, [splitResult, _hasHydrated]);

  // Sync result after store operations (merge/split/delete)
  useEffect(() => {
    if (result && splitResult && result !== splitResult) {
      // Check if episodes differ (store was updated)
      const storeEpisodes = splitResult.episodes;
      const localEpisodes = result.episodes;
      if (JSON.stringify(storeEpisodes) !== JSON.stringify(localEpisodes)) {
        setResult(splitResult);
      }
    }
  }, [splitResult]);

  // Load split result on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!taskIdParam || !_hasHydrated) return;

      setLoading(true);
      try {
        const data = await loadSplitResult(taskIdParam, projectId || undefined);
        if (mounted) {
          setResult(data);
          setError(null);
          // Select first episode by default
          if (data.episodes.length > 0) {
            setSelectedEpisodeIdx(0);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "加载分集结果失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [taskIdParam, _hasHydrated, loadSplitResult]);

  // Calculate statistics
  const stats = result ? {
    totalEpisodes: result.totalEpisodes,
    totalShots: result.episodes.reduce((sum, ep) => sum + ep.estimatedShots, 0),
    avgShots: Math.round(result.episodes.reduce((sum, ep) => sum + ep.estimatedShots, 0) / result.episodes.length * 10) / 10,
    maxShots: Math.max(...result.episodes.map(ep => ep.estimatedShots)),
    minShots: Math.min(...result.episodes.map(ep => ep.estimatedShots)),
  } : null;

  const selectedEpisode = selectedEpisodeIdx !== null ? result?.episodes[selectedEpisodeIdx] : null;

  // Build density data for chart
  const densityData = result?.episodes.map(ep => ({
    label: `第${ep.orderIndex}集`,
    value: Math.round(ep.sceneDensity * 100),
    color: ep.sceneDensity >= 0.9 ? "#ef4444" : ep.sceneDensity >= 0.75 ? "#f59e0b" : "#10b981",
  })) || [];

  const handleEpisodeClick = (index: number) => {
    if (isMergeMode) {
      // In merge mode, toggle selection
      setSelectedForMerge(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    } else {
      // Normal mode, select episode
      setSelectedEpisodeIdx(index);
    }
  };

  const toggleMergeMode = () => {
    setIsMergeMode(!isMergeMode);
    setSelectedForMerge([]);
  };

  if (!fileId) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">缺少文件信息</p>
          <Link href="/upload" className="text-primary hover:underline">
            返回上传页面
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scroll">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header Toolbar */}
        <div
          className="glass-panel rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2"
          style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <i className="fas fa-check-circle text-emerald text-xs" style={{ color: "#10b981" }}></i>
              <span className="text-xs font-medium text-emerald" style={{ color: "#10b981" }}>拆分完成</span>
            </div>
            <span className="text-xs text-slate-500">
              基于「<span className="text-slate-300">{result ? STRATEGY_NAMES[result.strategy] || result.strategy : "智能均衡"}</span>」策略
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMergeMode}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                backgroundColor: isMergeMode ? "rgba(245, 158, 11, 0.15)" : "rgba(30, 41, 59, 0.8)",
                border: `1px solid ${isMergeMode ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                color: isMergeMode ? "#fbbf24" : "#94a3b8",
              }}
            >
              <i className="fas fa-object-group mr-1"></i>
              合并模式
            </button>
            <Link
              href={`/upload/strategy?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}&from=result`}
              className="px-3 py-1.5 rounded-lg text-xs transition-all hover:text-white"
              style={{ backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8" }}
            >
              <i className="fas fa-sliders mr-1"></i>
              调整策略
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-3xl text-emerald mb-3" style={{ color: "#10b981" }}></i>
              <p className="text-slate-400">加载分集结果中...</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            <div className="flex items-center gap-2 text-red-400">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Three Column Editor Layout */}
            <div className="grid grid-cols-12 gap-4 min-h-0">
              {/* Left Column: Episode List */}
              <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                {/* Episode List Header */}
                <div
                  className="glass-panel rounded-xl p-3 mb-3 flex items-center justify-between"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <span className="text-sm font-semibold text-white">分集列表</span>
                  <span className="text-xs text-slate-500">共 {result.totalEpisodes} 集</span>
                </div>

                {/* Episode List */}
                <div
                  className="glass-panel rounded-xl p-3 flex-1 overflow-y-auto custom-scroll min-h-0"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <div className="space-y-2">
                    {result.episodes.map((episode, idx) => (
                      <div
                        key={episode.orderIndex}
                        onClick={() => handleEpisodeClick(idx)}
                        className={`episode-card flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          selectedEpisodeIdx === idx ? "active" : ""
                        } ${selectedForMerge.includes(idx) ? "selected-for-merge" : ""}`}
                        style={{
                          backgroundColor: selectedEpisodeIdx === idx ? "rgba(99, 102, 241, 0.06)" : "rgba(30, 41, 59, 0.3)",
                          borderColor: selectedEpisodeIdx === idx
                            ? "rgba(99, 102, 241, 0.3)"
                            : selectedForMerge.includes(idx)
                            ? "rgba(245, 158, 11, 0.3)"
                            : "rgba(255, 255, 255, 0.05)",
                          border: `1px solid ${selectedEpisodeIdx === idx ? "rgba(99, 102, 241, 0.3)" : selectedForMerge.includes(idx) ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                        }}
                      >
                        {isMergeMode && (
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                              selectedForMerge.includes(idx) ? "bg-amber-500 border-amber-500 text-white" : "border-slate-500"
                            }`}
                          >
                            {selectedForMerge.includes(idx) && <i className="fas fa-check text-[8px]"></i>}
                          </div>
                        )}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
                        >
                          {episode.orderIndex}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium text-white truncate">{episode.title}</span>
                            <DensityBadge density={episode.sceneDensity} />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{episode.estimatedShots}分镜</span>
                            <span>·</span>
                            <span>{episode.chapters.length}章节</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Merge Action Bar */}
                {isMergeMode && (
                  <div
                    className="mt-3 p-3 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
                  >
                    <span className="text-xs text-amber-400">
                      已选择 <span className="font-bold">{selectedForMerge.length}</span> 集
                    </span>
                    <button
                      onClick={() => {
                        if (selectedForMerge.length < 2) return;
                        mergeEpisodes(selectedForMerge);
                        // Update local result to trigger re-render
                        const updated = useNovelStore.getState().splitResult;
                        if (updated) setResult(updated);
                        setSelectedForMerge([]);
                        setIsMergeMode(false);
                      }}
                      disabled={selectedForMerge.length < 2}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ backgroundColor: "#f59e0b" }}
                    >
                      合并选中
                    </button>
                  </div>
                )}
              </div>

              {/* Middle Column: Episode Detail */}
              <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                {/* Detail Header */}
                <div
                  className="glass-panel rounded-xl p-3 mb-3 flex items-center justify-between"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <span className="text-sm font-semibold text-white">分集详情</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const point = prompt("请输入拆分点位置（字数）：");
                        if (point !== null) {
                          splitEpisode(selectedEpisodeIdx!, parseInt(point) || undefined);
                          const updated = useNovelStore.getState().splitResult;
                          if (updated) setResult(updated);
                        }
                      }}
                      disabled={selectedEpisodeIdx === null}
                      className="px-2.5 py-1 rounded-lg text-[10px] transition-all disabled:opacity-40"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8" }}
                    >
                      <i className="fas fa-code-branch mr-1"></i>拆分为二
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`确认删除第${selectedEpisode?.orderIndex}集「${selectedEpisode?.title}」？`)) {
                          deleteEpisode(selectedEpisodeIdx!);
                          const updated = useNovelStore.getState().splitResult;
                          if (updated) setResult(updated);
                          setSelectedEpisodeIdx(null);
                        }
                      }}
                      disabled={selectedEpisodeIdx === null}
                      className="px-2.5 py-1 rounded-lg text-[10px] transition-all disabled:opacity-40"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8" }}
                    >
                      <i className="fas fa-trash mr-1"></i>删除
                    </button>
                  </div>
                </div>

                {/* Detail Content */}
                <div
                  className="glass-panel rounded-xl p-4 flex-1 overflow-y-auto custom-scroll min-h-0"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  {selectedEpisode ? (
                    <div>
                      {/* Episode Title */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                          style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
                        >
                          {selectedEpisode.orderIndex}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{selectedEpisode.title}</h3>
                          <DensityBadge density={selectedEpisode.sceneDensity} />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-slate-400 mb-2">集摘要</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{selectedEpisode.summary}</p>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                          <div className="text-lg font-bold text-white">{selectedEpisode.estimatedShots}</div>
                          <div className="text-xs text-slate-400">预估分镜</div>
                        </div>
                        <div
                          className="p-3 rounded-lg"
                          style={{ backgroundColor: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                        >
                          <div className="text-lg font-bold text-white">{selectedEpisode.chapters.length}</div>
                          <div className="text-xs text-slate-400">涉及章节</div>
                        </div>
                      </div>

                      {/* Chapters */}
                      <div>
                        <h4 className="text-xs font-medium text-slate-400 mb-2">章节列表</h4>
                        <div className="space-y-1">
                          {selectedEpisode.chapters.map((chapter, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-2 rounded-lg text-sm text-slate-300"
                              style={{ backgroundColor: "rgba(30, 41, 59, 0.3)" }}
                            >
                              <i className="fas fa-file-lines text-slate-500 text-xs"></i>
                              {chapter}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <i className="fas fa-hand-pointer text-2xl mb-2 opacity-30 text-slate-500"></i>
                      <p className="text-sm text-slate-500">点击左侧分集查看详情</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Statistics */}
              <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0 gap-4">
                {/* Stats Card */}
                <div
                  className="glass-panel rounded-xl p-4"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">分集统计</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">总集数</span>
                      <span className="text-sm font-bold text-white">{stats?.totalEpisodes || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">总分镜数</span>
                      <span className="text-sm font-bold text-white">{stats?.totalShots || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">平均每集</span>
                      <span className="text-sm font-bold text-white">{stats?.avgShots || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">最长/最短</span>
                      <span className="text-sm font-bold text-white">{stats?.maxShots || 0} / {stats?.minShots || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Density Distribution */}
                <div
                  className="glass-panel rounded-xl p-4 flex-1 min-h-0 overflow-y-auto custom-scroll"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">情节密度分布</h3>
                  <div className="space-y-2">
                    {densityData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-12">{item.label}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1e293b" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${item.value}%`, backgroundColor: item.color }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Character Distribution Placeholder */}
                <div
                  className="glass-panel rounded-xl p-4 flex-1 min-h-0 overflow-y-auto custom-scroll"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.7)" }}
                >
                  <h3 className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">角色出场分布</h3>
                  <div className="text-center py-4 text-slate-500 text-xs">
                    <i className="fas fa-user-circle text-xl mb-2 opacity-30"></i>
                    <p>角色分析即将可用</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 flex gap-3">
              <Link
                href={`/upload/strategy?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}&from=result`}
                className="flex-1 py-3.5 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-all hover:text-white"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              >
                <i className="fas fa-arrow-left"></i>
                <span>返回调整策略</span>
              </Link>
              <Link
                href={`/upload/extract?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}`}
                className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                style={{
                  background: "linear-gradient(to right, #10b981, #06b6d4)",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
                }}
              >
                <span>确认分集，继续提取资产</span>
                <i className="fas fa-arrow-right"></i>
              </Link>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <i className="fas fa-inbox text-4xl text-slate-600 mb-3"></i>
              <p className="text-slate-400">暂无分集结果</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SplitResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-darker flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }
    >
      <SplitResultPageContent />
    </Suspense>
  );
}
