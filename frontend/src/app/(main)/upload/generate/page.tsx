"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAssetStore } from "@/stores/asset";
import { Asset, AssetType } from "@/types/asset";
import { generateAssetImage, getAssetGenerationResult } from "@/lib/api/assets";

interface GenerationItem {
  asset: Asset;
  status: "pending" | "generating" | "completed" | "failed";
  taskId?: string;
  generatedImageUrl?: string;
  error?: string;
}

const POLL_INTERVAL = 1000;

async function pollUntilDone(
  taskId: string,
  onProgress: (p: number) => void
): Promise<string> {
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const result = await getAssetGenerationResult(taskId);
    onProgress(result.progress);
    if (result.status === "completed") {
      return result.imageUrl || "";
    }
    if (result.status === "failed") {
      throw new Error(result.error?.message || "生成失败");
    }
  }
}

const typeConfig: Record<
  AssetType,
  { label: string; color: string; icon: string }
> = {
  character: { label: "角色", color: "primary", icon: "user" },
  scene: { label: "场景", color: "cyan", icon: "image" },
  prop: { label: "道具", color: "amber", icon: "cube" },
};

function GenerationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { extractedAssets } = useAssetStore();

  const projectId = searchParams.get("projectId") || "";
  const [generationQueue, setGenerationQueue] = useState<GenerationItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [regeneratingAsset, setRegeneratingAsset] = useState<Asset | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const isRunningRef = useRef(false);

  // Build queue from extracted assets
  useEffect(() => {
    if (!extractedAssets) return;
    const queue: GenerationItem[] = [];
    extractedAssets.characters.forEach((a) =>
      queue.push({ asset: { ...a, type: "character" as AssetType }, status: "pending" })
    );
    extractedAssets.scenes.forEach((a) =>
      queue.push({ asset: { ...a, type: "scene" as AssetType }, status: "pending" })
    );
    extractedAssets.props.forEach((a) =>
      queue.push({ asset: { ...a, type: "prop" as AssetType }, status: "pending" })
    );
    setGenerationQueue(queue);
  }, [extractedAssets]);

  // Start generation process
  const startGeneration = async () => {
    if (isRunningRef.current || generationQueue.length === 0) return;
    isRunningRef.current = true;

    for (let idx = 0; idx < generationQueue.length; idx++) {
      const item = generationQueue[idx];
      if (item.status !== "pending") continue;

      setGenerationQueue((prev) =>
        prev.map((q, i) =>
          i === idx ? { ...q, status: "generating" as const, taskId: undefined } : q
        )
      );

      try {
        const { taskId } = await generateAssetImage(item.asset.id, projectId);
        setGenerationQueue((prev) =>
          prev.map((q, i) => (i === idx ? { ...q, taskId } : q))
        );
        const imageUrl = await pollUntilDone(taskId, () => {});
        setGenerationQueue((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, status: "completed" as const, generatedImageUrl: imageUrl } : q
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "生成失败";
        setGenerationQueue((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, status: "failed" as const, error: msg } : q
          )
        );
      }
    }

    setIsComplete(true);
    setIsReviewMode(true);
    isRunningRef.current = false;
  };

  // Auto-start when queue is built
  useEffect(() => {
    if (generationQueue.length > 0 && !isComplete && !isRunningRef.current) {
      const timer = setTimeout(() => {
        startGeneration();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [generationQueue, isComplete]);

  const handleRegenerateClick = (asset: Asset) => {
    setRegeneratingAsset(asset);
    setRegeneratePrompt(asset.prompt || "");
  };

  const handleConfirmRegenerate = async () => {
    if (!regeneratingAsset) return;
    const assetId = regeneratingAsset.id;

    setGenerationQueue((prev) =>
      prev.map((q) =>
        q.asset.id === assetId
          ? { ...q, status: "generating" as const, taskId: undefined, generatedImageUrl: undefined, error: undefined }
          : q
      )
    );
    setRegeneratingAsset(null);

    try {
      const { taskId } = await generateAssetImage(assetId, projectId);
      const imageUrl = await pollUntilDone(taskId, () => {});
      setGenerationQueue((prev) =>
        prev.map((q) =>
          q.asset.id === assetId ? { ...q, status: "completed" as const, generatedImageUrl: imageUrl } : q
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      setGenerationQueue((prev) =>
        prev.map((q) =>
          q.asset.id === assetId ? { ...q, status: "failed" as const, error: msg } : q
        )
      );
    }
  };

  const handleConfirmAll = () => {
    router.push(`/upload/confirm?projectId=${projectId}`);
  };

  const handleBack = () => {
    router.push(`/upload/extract?projectId=${projectId}`);
  };

  const total = generationQueue.length;
  const completed = generationQueue.filter((q) => q.status === "completed").length;
  const failed = generationQueue.filter((q) => q.status === "failed").length;
  const generatingItem = generationQueue.find((q) => q.status === "generating");
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const eta =
    total > 0 ? `预计剩余 ${Math.max(1, Math.ceil((total - completed - failed) * 0.5))} 分钟` : "--";

  if (!projectId) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">缺少项目信息</p>
          <Link href="/upload" className="text-primary hover:underline">
            返回上传页面
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fas fa-wand-magic-sparkles text-primary text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">批量生产资产参考图</h2>
          <p className="text-sm text-slate-400">
            {isComplete
              ? "生成完成，请审核确认"
              : "根据已编辑的提示词，正在逐个生成资产参考图。生成完成后可审核并重新生成不满意的部分。"}
          </p>
        </div>

        {/* Main Panel */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-6"
          style={{
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">生成进度</span>
              <span className="text-sm font-mono font-bold" style={{ color: "#6366f1" }}>
                {completed} / {total}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(to right, #6366f1, #06b6d4)",
                }}
              />
            </div>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {generationQueue.map((item, idx) => {
              const cfg = typeConfig[item.asset.type] || typeConfig.character;
              return (
                <div
                  key={item.asset.id}
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                  }}
                >
                  {/* Image Area */}
                  <div
                    className="aspect-square relative flex items-center justify-center"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                  >
                    {/* Pending */}
                    {item.status === "pending" && (
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, 0.1)`,
                            border: "1px solid rgba(99, 102, 241, 0.2)",
                          }}
                        >
                          <i
                            className={`fas fa-${cfg.icon} text-primary text-sm opacity-50`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">等待生成</span>
                      </div>
                    )}

                    {/* Generating */}
                    {item.status === "generating" && (
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                          style={{
                            backgroundColor: "rgba(99, 102, 241, 0.2)",
                            border: "1px solid rgba(99, 102, 241, 0.3)",
                          }}
                        >
                          <i className="fas fa-circle-notch fa-spin text-primary text-sm" />
                        </div>
                        <span className="text-[10px] text-white">生成中...</span>
                      </div>
                    )}

                    {/* Completed */}
                    {item.status === "completed" && item.generatedImageUrl && (
                      <img
                        src={item.generatedImageUrl}
                        alt={item.asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Failed */}
                    {item.status === "failed" && (
                      <div className="flex flex-col items-center justify-center text-red-400">
                        <i className="fas fa-exclamation-circle text-xl mb-1" />
                        <span className="text-[10px]">生成失败</span>
                      </div>
                    )}
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] border"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, 0.1)`,
                        color: "#a5b4fc",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Regenerate Button */}
                  {item.status === "completed" && (
                    <button
                      onClick={() => handleRegenerateClick(item.asset)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-all"
                      style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}
                    >
                      <i className="fas fa-redo text-[10px]" />
                    </button>
                  )}

                  {/* Asset Info */}
                  <div className="p-2">
                    <div className="text-[11px] text-white font-medium truncate">
                      {item.asset.name}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">
                      {item.asset.prompt?.substring(0, 30) || "—"}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Generation Info */}
          {generatingItem && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#6366f1" }} />
                <span className="text-sm font-medium text-white">当前正在生成</span>
                <span className="text-xs text-slate-500 ml-auto">{eta}</span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {generatingItem.generatedImageUrl ? (
                    <img
                      src={generatingItem.generatedImageUrl}
                      alt={generatingItem.asset.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <i className="fas fa-image text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white mb-1 truncate">
                    {generatingItem.asset.name} - {typeConfig[generatingItem.asset.type]?.label || "资产"}参考图
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2">
                    {generatingItem.asset.prompt || "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review Mode Notice */}
          {isReviewMode && (
            <div
              className="mt-4 p-3 rounded-xl flex items-center justify-between flex-wrap gap-3"
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }}
                >
                  <i className="fas fa-check text-emerald-400 text-[10px]" />
                </div>
                <span className="text-xs text-emerald-300">
                  批量生产完成！可点击卡片重新生成或修改提示词
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  已生成：<span className="text-emerald-400 font-bold">{completed}</span> 个
                </span>
                <button
                  onClick={handleConfirmAll}
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90"
                  style={{ backgroundColor: "#10b981" }}
                >
                  <i className="fas fa-check mr-1" />
                  确认入库
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="flex-1 py-3.5 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-all hover:text-white"
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <i className="fas fa-arrow-left" />
            <span>返回编辑</span>
          </button>
          <button
            onClick={handleConfirmAll}
            disabled={!isComplete}
            className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              background: isComplete
                ? "linear-gradient(to right, #10b981, #06b6d4)"
                : "#334155",
              boxShadow: isComplete ? "0 10px 25px rgba(16, 185, 129, 0.25)" : "none",
            }}
          >
            <i className="fas fa-check" />
            <span>{isComplete ? "确认入库" : "生成中..."}</span>
          </button>
        </div>

        {/* Regenerate Modal */}
        {regeneratingAsset && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setRegeneratingAsset(null);
            }}
          >
            <div
              className="rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  <i className="fas fa-redo text-primary mr-2" />
                  重新生成参考图
                </h3>
                <button
                  onClick={() => setRegeneratingAsset(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                  style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">资产名称</label>
                  <div className="text-white font-medium">{regeneratingAsset.name}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">修改生成提示词</label>
                  <textarea
                    rows={4}
                    value={regeneratePrompt}
                    onChange={(e) => setRegeneratePrompt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none resize-none"
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRegeneratingAsset(null)}
                  className="flex-1 py-3 rounded-xl text-slate-300 font-medium hover:text-white transition-all"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmRegenerate}
                  className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ backgroundColor: "#6366f1" }}
                >
                  <i className="fas fa-redo" />
                  确认重新生成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GenerationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-darker flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }
    >
      <GenerationPageContent />
    </Suspense>
  );
}