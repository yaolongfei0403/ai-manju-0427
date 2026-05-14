"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNovelStore } from "@/stores/novel";
import { useAssetStore } from "@/stores/asset";
import { Asset } from "@/types/asset";
import { WorkflowGuide } from "@/components/features/upload/WorkflowGuide";
import { AssetPromptEditor } from "@/components/features/upload/AssetPromptEditor";
import { getAssetExtractionResult } from "@/lib/api/assets";
import axios from "axios";

const ASSET_TASKS = [
  { id: "character", label: "角色识别与提取", icon: "fa-user", color: "#6366f1" },
  { id: "scene", label: "场景识别与提取", icon: "fa-image", color: "#06b6d4" },
  { id: "prop", label: "道具识别与提取", icon: "fa-cube", color: "#f59e0b" },
];

// 提取可复用的错误消息解析逻辑
const getPollingErrorMessage = (error: unknown): { message: string; isRecoverable: boolean } => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return { message: "登录已过期，请重新登录", isRecoverable: false };
    }
    if (status === 404) {
      return { message: "任务不存在或已过期", isRecoverable: false };
    }
    if (status === 503) {
      return { message: "后端服务未启动，请稍后重试", isRecoverable: true };
    }
    if (status === 502 || status === 504) {
      return { message: "LLM 服务调用失败，请检查配置后重试", isRecoverable: true };
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return { message: "无法连接后端服务，请确保服务已启动", isRecoverable: true };
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return { message: "请求超时，请检查网络后重试", isRecoverable: true };
    }
    return { message: `网络错误 (${status || error.code})，请稍后重试`, isRecoverable: true };
  }
  if (error instanceof Error) {
    return { message: error.message, isRecoverable: false };
  }
  return { message: "未知错误，请稍后重试", isRecoverable: true };
};

function AssetExtractPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { _hasHydrated, splitResult, fileMeta } = useNovelStore();
  const {
    extractStatus,
    extractTaskId,
    extractedAssets,
    extractError,
    startExtraction,
    clearExtractState,
    pollExtractionResult,
    loadGroupedAssets,
  } = useAssetStore();

  const fileId = searchParams.get("fileId");
  const projectId = searchParams.get("projectId");
  const taskIdParam = searchParams.get("taskId");

  // Animated progress state
  const [progress, setProgress] = useState(0);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [taskBars, setTaskBars] = useState<Record<string, number>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [phase, setPhase] = useState<4 | 5>(4);
  const [currentTab, setCurrentTab] = useState<"character" | "scene" | "prop">("character");
  const [logs, setLogs] = useState<string[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initCheckedForProject, setInitCheckedForProject] = useState<string | null>(null);

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const isExtractionCompleteRef = useRef(false);
  const isExtractingRef = useRef(false);
  const redirectScheduledRef = useRef(false);
  const hasAddedFinalLogRef = useRef(false);
  const pollingRetryCountRef = useRef(0);
  const saveSuccessTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, `[系统] ${message}`]);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (saveSuccessTimerRef.current) {
        clearTimeout(saveSuccessTimerRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // effect: 页面初始化 — 先检查数据库/缓存，再决定是否触发 LLM 提取
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!_hasHydrated || !projectId) return;
    if (initCheckedForProject === projectId) return; // 已检查过该项目，不再重复检查
    setInitCheckedForProject(projectId);

    const initialize = async () => {
      // 1. 优先查数据库：项目是否已有提取过的资产
      addLog("正在检查数据库中的已有资产...");
      const { found, assets } = await loadGroupedAssets(projectId);
      if (found && assets) {
        addLog("✅ 检测到已有提取资产，直接进入编辑阶段");
        setShowResults(true);
        setPhase(5);
        isExtractionCompleteRef.current = true;
        setIsExtracting(false);
        return;
      }

      // 2. 再查本地 store 缓存（同一项目且已完成）
      const state = useAssetStore.getState();
      if (
        state.extractStatus === "completed" &&
        state.extractedAssets &&
        state.extractProjectId === projectId
      ) {
        addLog("✅ 使用本地缓存的资产数据");
        setShowResults(true);
        setPhase(5);
        isExtractionCompleteRef.current = true;
        setIsExtracting(false);
        return;
      }

      // 3. 确认没有已有资产，且具备提取条件，才触发 LLM
      if (splitResult && fileId) {
        addLog("未检测到已有资产，开始 LLM 提取流程...");
        isExtractingRef.current = true;
        setIsExtracting(true);
        await handleStartExtraction();
      } else {
        addLog("⚠️ 缺少分集数据，无法开始提取");
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, projectId, initCheckedForProject]);

  // ─────────────────────────────────────────────────────────────────────────────
  // effect: polling — 轮询 taskId 状态直到 completed/failed
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const activeTaskId = taskIdParam || useAssetStore.getState().extractTaskId;
    if (!activeTaskId) return;
    if (pollingIntervalRef.current) return;
    if (isExtractionCompleteRef.current) return;

    addLog("正在查询提取结果...");
    setIsExtracting(true);
    pollingRetryCountRef.current = 0;
    const MAX_POLL_RETRIES = 120;

    pollingIntervalRef.current = setInterval(async () => {
      const currentTaskId = useAssetStore.getState().extractTaskId || taskIdParam;
      if (!currentTaskId) {
        addLog("⚠️ 任务ID丢失，停止轮询");
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setIsExtracting(false);
        return;
      }

      if (pollingRetryCountRef.current >= MAX_POLL_RETRIES) {
        addLog("⚠️ 轮询超时，请稍后重试");
        useAssetStore.getState().setExtractFailed("轮询超时，任务可能仍在处理中，请稍后刷新页面查看");
        setIsExtracting(false);
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        return;
      }

      try {
        const result = await getAssetExtractionResult(currentTaskId, projectId || undefined);
        pollingRetryCountRef.current = 0;

        if (result.status === "completed") {
          const totalAssets =
            (result.assets?.characters?.length || 0) +
            (result.assets?.scenes?.length || 0) +
            (result.assets?.props?.length || 0);
          if (totalAssets === 0) {
            addLog("⚠️ 提取完成但未识别到任何资产");
          } else {
            addLog(
              `✅ 资产提取完成！角色 ${result.assets?.characters?.length || 0} / 场景 ${result.assets?.scenes?.length || 0} / 道具 ${result.assets?.props?.length || 0}`
            );
          }
          await pollExtractionResult(currentTaskId, projectId || undefined);
          isExtractionCompleteRef.current = true;
          setIsExtracting(false);
          setShowResults(true);
          setPhase(5);
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
        } else if (result.status === "failed") {
          const errorMsg = result.error?.message || "LLM 处理失败";
          addLog(`❌ 提取失败: ${errorMsg}`);
          useAssetStore.getState().setExtractFailed(errorMsg);
          setIsExtracting(false);
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
        } else {
          addLog(`进度: ${result.progress}%`);
        }
      } catch (error) {
        pollingRetryCountRef.current += 1;

        if (axios.isAxiosError(error)) {
          const code = error.code;
          const status = error.response?.status;
          console.error("[polling] axios error:", { code, status, URL: error.config?.url });
          if (status === 404) {
            addLog(`⚠️ 任务不存在或已过期`);
          } else if (code === "ECONNREFUSED" || code === "ECONNRESET") {
            addLog(`⚠️ 后端连接失败`);
          } else if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
            addLog(`⚠️ 轮询请求超时`);
          }
          const { message, isRecoverable } = getPollingErrorMessage(error);
          if (!isRecoverable) {
            useAssetStore.getState().setExtractFailed(message);
            setIsExtracting(false);
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
          }
        } else if (error instanceof Error) {
          console.error("[polling] error:", error.message);
          addLog(`⚠️ ${error.message}`);
          useAssetStore.getState().setExtractFailed(error.message);
          setIsExtracting(false);
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
        } else {
          console.error("[polling] unknown error:", error);
        }
      }
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdParam, projectId, extractTaskId]);

  // Trigger extraction（仅在确认无已有资产后调用）
  const handleStartExtraction = async () => {
    console.log("[handleStartExtraction] called!", { fileId, projectId, splitResultExists: !!splitResult });
    if (!fileId || !projectId || !splitResult) return;
    if (isExtractionCompleteRef.current) return;

    setIsExtracting(true);
    setShowResults(false);
    setLogs([]);
    setProgress(0);
    isExtractionCompleteRef.current = false;
    redirectScheduledRef.current = false;
    hasAddedFinalLogRef.current = false;
    addLog("分集已就绪，开始提取资产...");

    try {
      // 提取 episode orderIndex 列表传给后端
      const episodeNumbers = splitResult.episodes
        .map((ep: any) => ep.orderIndex)
        .filter((n: number) => typeof n === "number" && !isNaN(n));

      console.log("[handleStartExtraction] calling startExtraction with:", projectId, fileId, episodeNumbers);
      const taskId = await startExtraction(projectId, fileId, episodeNumbers);
      console.log("[handleStartExtraction] got taskId:", taskId);

      // 如果后端直接返回了 completed（skip），立即进入 Phase 5
      const currentState = useAssetStore.getState();
      if (currentState.extractStatus === "completed") {
        addLog("✅ 资产已存在，直接使用已有数据");
        setIsExtracting(false);
        setShowResults(true);
        setPhase(5);
        isExtractionCompleteRef.current = true;
        return;
      }

      addLog(`已提交任务: ${taskId.substring(0, 8)}...`);

      // Update URL so polling effect picks it up
      const url = new URL(window.location.href);
      url.searchParams.set("taskId", taskId);
      window.history.pushState({}, "", url.toString());

      // 手动触发一次轮询（pushState 不会触发 useSearchParams 更新）
      // 注意：轮询由下方的 useEffect 统一处理，这里不需要再单独调用
      // 否则会导致重复调用 GET /api/v1/assets/extract/{taskId}
    } catch (err) {
      isExtractingRef.current = false;
      setIsExtracting(false);
      addLog(`启动失败: ${err instanceof Error ? err.message : "未知错误"}`);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const code = err.code;
        const backendMsg = err.response?.data?.error?.message;
        console.error("[handleStartExtraction] axios error:", {
          code,
          status,
          backendMsg,
          URL: err.config?.url,
          method: err.config?.method,
        });
        if (backendMsg) {
          addLog(`[后端错误] ${backendMsg}`);
        } else if (code === "ECONNREFUSED" || code === "ECONNRESET") {
          addLog(`[网络错误] 无法连接到后端服务`);
        } else if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
          addLog(`[网络错误] 请求超时`);
        } else if (status === 401 || status === 403) {
          addLog(`[认证错误] 请重新登录`);
        } else if (status === 400) {
          addLog(`[参数错误] ${err.response?.data?.error?.message || "参数校验失败"}`);
        } else if (status === 503) {
          addLog(`[服务不可用] 后端服务未启动`);
        } else {
          addLog(`[网络错误] ${status || code || "未知网络错误"}`);
        }
      } else if (err instanceof Error) {
        console.error("[handleStartExtraction] application error:", err.message);
        addLog(`[业务错误] ${err.message}`);
      } else {
        console.error("[handleStartExtraction] unknown error:", err);
        addLog(`[未知错误] 请查看控制台`);
      }
    }
  };

  // Animated progress: 只在真正提取时运行（isExtracting && !completed）
  useEffect(() => {
    if (!fileId || !isExtracting || isExtractionCompleteRef.current) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (!redirectScheduledRef.current) {
            redirectScheduledRef.current = true;
            setTimeout(() => {
              if (!isExtractionCompleteRef.current) {
                setIsExtracting(false);
                setShowResults(true);
                setPhase(5);
                addLog("进入提示词编辑阶段...");
              }
            }, 300);
          }
          return 100;
        }

        if (isExtractionCompleteRef.current) {
          return Math.min(100, prev + 8);
        } else if (prev > 90) {
          return Math.min(100, prev + Math.random() * 0.1 + 0.1);
        } else if (prev > 66) {
          return Math.min(100, prev + Math.random() * 0.3 + 0.5);
        } else {
          return Math.min(100, prev + Math.random() * 1.5 + 2.5);
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, [fileId, isExtracting, addLog]);

  // Update task statuses based on progress
  useEffect(() => {
    const statuses: Record<string, string> = {};
    const bars: Record<string, number> = {};

    ASSET_TASKS.forEach((task, index) => {
      const taskStart = index * 33;
      const taskEnd = (index + 1) * 33;

      if (progress < taskStart) {
        statuses[task.id] = "等待中...";
        bars[task.id] = 0;
      } else if (progress >= taskEnd) {
        statuses[task.id] = "已完成";
        bars[task.id] = 100;
      } else {
        const taskProgress = ((progress - taskStart) / (taskEnd - taskStart)) * 100;
        statuses[task.id] = taskProgress < 50 ? "处理中..." : "已完成";
        bars[task.id] = Math.min(100, taskProgress);
      }
    });

    setTaskStatuses(statuses);
    setTaskBars(bars);
  }, [progress]);

  // Add logs based on progress
  useEffect(() => {
    if (progress >= 10 && progress < 33 && !logs.some((l) => l.includes("角色"))) {
      addLog("正在识别角色...");
    }
    if (progress >= 40 && progress < 66 && !logs.some((l) => l.includes("场景"))) {
      addLog("正在识别场景...");
    }
    if (progress >= 75 && progress < 95 && !logs.some((l) => l.includes("道具"))) {
      addLog("正在识别道具...");
    }
    if (progress >= 95 && !hasAddedFinalLogRef.current) {
      hasAddedFinalLogRef.current = true;
      addLog("正在生成最终结果...");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const handleRetry = () => {
    setLogs([]);
    setProgress(0);
    isExtractionCompleteRef.current = false;
    isExtractingRef.current = false;
    hasAddedFinalLogRef.current = false;
    redirectScheduledRef.current = false;
    clearExtractState();
    handleStartExtraction();
  };

  const handleSaveAssetPrompt = async (assetId: string, prompt: string, description?: string) => {
    try {
      await useAssetStore.getState().updateAssetPrompt(assetId, prompt, description);
    } catch (err) {
      console.error("保存失败:", err);
      return;
    }
    setEditingAsset(null);
    setSaveSuccess(true);
    if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    saveSuccessTimerRef.current = setTimeout(() => setSaveSuccess(false), 2000);
  };

  const novelsTitle = fileMeta?.title || "小说";

  const assetCounts = {
    character: extractedAssets?.characters?.length || 0,
    scene: extractedAssets?.scenes?.length || 0,
    prop: extractedAssets?.props?.length || 0,
  };
  const totalAssets = assetCounts.character + assetCounts.scene + assetCounts.prop;

  if (!fileId || !projectId) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">缺少必要参数</p>
          <Link href="/upload" className="text-primary hover:underline">
            返回上传页面
          </Link>
        </div>
      </div>
    );
  }

  // Phase 4: 提取资产
  if (phase === 4) {
    return (
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg relative"
              style={{
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                boxShadow: "0 10px 25px rgba(99, 102, 241, 0.05)",
              }}
            >
              <i className="fas fa-robot text-primary text-2xl" style={{ color: "#6366f1" }}></i>
              {progress < 100 && isExtracting && (
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#6366f1" }}
                >
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">AI 正在提取资产</h2>
            <p className="text-sm text-slate-400">
              分集已就绪，正在分析《{novelsTitle}》全文，提取角色、场景、道具等关键元素
            </p>
          </div>

          {/* Main Panel */}
          <div
            className="rounded-2xl p-6 md:p-8 mb-6"
            style={{
              background: "rgba(30, 41, 59, 0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Overall Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">总体进度</span>
                <span className="text-sm font-mono font-bold" style={{ color: "#6366f1" }}>
                  {Math.min(Math.round(progress), 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#334155" }}>
                <div
                  className="h-full rounded-full progress-bar transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                  }}
                ></div>
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-3 mb-6">
              {ASSET_TASKS.map((task) => {
                const status = taskStatuses[task.id] || "等待中...";
                const barWidth = taskBars[task.id] || 0;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${task.color}1a`,
                        border: `1px solid ${task.color}33`,
                      }}
                    >
                      <i className={`fas ${task.icon}`} style={{ color: task.color, fontSize: "12px" }}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{task.label}</span>
                        <span className="text-xs text-slate-400">{status}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#334155" }}>
                        <div
                          className="h-full rounded-full progress-bar"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: task.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Log Panel */}
            <div
              className="p-4 rounded-xl h-32 overflow-y-auto custom-scroll font-mono text-xs"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
              ref={logRef}
            >
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={log.includes("完成") || log.includes("已就绪") ? "text-emerald-400" : "text-slate-400"}
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-emerald-400">[系统] 正在初始化...</div>
              )}
            </div>
          </div>

          {/* Error State */}
          {extractStatus === "failed" && (
            <div
              className="p-4 rounded-xl mb-6"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-red-400"></i>
                <span className="text-sm text-red-400">{extractError || "提取失败"}</span>
              </div>
            </div>
          )}

          {/* Retry Button */}
          {extractStatus === "failed" && (
            <div className="text-center">
              <button
                onClick={handleRetry}
                className="px-8 py-3 rounded-xl text-white font-bold text-base transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.25)",
                }}
              >
                <i className="fas fa-redo mr-2"></i>
                重新提取
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase 5: 编辑资产提示词
  const allAssets: Asset[] = [
    ...(extractedAssets?.characters || []).map((a) => ({ ...a, type: "character" as const })),
    ...(extractedAssets?.scenes || []).map((a) => ({ ...a, type: "scene" as const })),
    ...(extractedAssets?.props || []).map((a) => ({ ...a, type: "prop" as const })),
  ];

  const currentAssets = allAssets.filter((a) => a.type === currentTab);

  return (
    <div className="flex-1 overflow-y-auto custom-scroll">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">编辑资产提示词</h2>
            <p className="text-sm text-slate-400 mt-1">
              AI 已从《{novelsTitle}》中提取出以下资产。在此阶段您可以：
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)" }}
          >
            <i className="fas fa-info-circle text-amber-400 text-sm"></i>
            <span className="text-xs text-amber-400 font-medium">提示词编辑阶段</span>
          </div>
        </div>

        {/* Workflow Guide */}
        <WorkflowGuide />

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(["character", "scene", "prop"] as const).map((tab) => {
            const labels = { character: "角色", scene: "场景", prop: "道具" };
            const colors = { character: "#6366f1", scene: "#06b6d4", prop: "#f59e0b" };
            const counts = { character: assetCounts.character, scene: assetCounts.scene, prop: assetCounts.prop };
            return (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: currentTab === tab ? colors[tab] : "rgba(30, 41, 59, 0.5)",
                  border: `1px solid ${currentTab === tab ? colors[tab] : "rgba(255, 255, 255, 0.1)"}`,
                  color: currentTab === tab ? "white" : "#94a3b8",
                }}
              >
                {labels[tab]} ({counts[tab]})
              </button>
            );
          })}
        </div>

        {/* Asset Grid */}
        {currentAssets.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <i className="fas fa-inbox text-4xl mb-3 opacity-30"></i>
            <p>暂无资产数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {currentAssets.map((asset, idx) => {
              const colors = { character: "#6366f1", scene: "#06b6d4", prop: "#f59e0b" };
              const icons = { character: "fa-user", scene: "fa-image", prop: "fa-cube" };
              const color = colors[asset.type] || "#6366f1";
              const icon = icons[asset.type] || "fa-image";
              const episodeCount = asset.episodeIds?.length || 0;

              return (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{
                    backgroundColor: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    className="aspect-[4/3] relative flex items-center justify-center"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      <i className={`fas ${icon}`} style={{ color, opacity: 0.6, fontSize: "18px" }}></i>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="text-sm font-bold text-white truncate">{asset.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">出场 {episodeCount} 集</div>
                    </div>

                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.05) 60%, transparent 100%)",
                      }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAsset(asset);
                        }}
                      >
                        <div
                          className="px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1"
                          style={{ backgroundColor: `${color}cc` }}
                        >
                          <i className="fas fa-pen mr-1"></i>编辑
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <textarea
                      className="w-full h-16 bg-slate-800/50 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-primary/50 resize-none custom-scroll leading-relaxed"
                      value={asset.prompt}
                      readOnly
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-primary focus:ring-0"
                          defaultChecked
                        />
                        <span className="text-xs text-slate-400">确认保留</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="text-xs text-slate-600 hover:text-emerald-400 transition-colors"
                          title="新增资产"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`确定要删除资产「${asset.name}」吗？`)) return;
                            try {
                              await useAssetStore.getState().deleteAsset(asset.id);
                            } catch (err) {
                              console.error("删除失败:", err);
                            }
                          }}
                          className="text-xs text-slate-600 hover:text-rose-400 transition-colors"
                          title="删除资产"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setPhase(4);
              // 重置相关状态以便可以重新触发（如果需要）
              isExtractionCompleteRef.current = false;
              isExtractingRef.current = false;
            }}
            className="flex-1 py-3.5 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-all hover:text-white"
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <i className="fas fa-arrow-left"></i>
            <span>返回提取</span>
          </button>
          <button
            onClick={() => router.push(`/upload/generate?projectId=${projectId}`)}
            className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(to right, #10b981, #06b6d4)",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
            }}
          >
            <i className="fas fa-image"></i>
            <span>进入批量生产</span>
          </button>
        </div>

        {/* Edit Modal */}
        {editingAsset && (
          <AssetPromptEditor
            asset={editingAsset}
            projectId={projectId || ""}
            onSave={handleSaveAssetPrompt}
            onClose={() => setEditingAsset(null)}
          />
        )}

        {/* Save Success Toast */}
        {saveSuccess && (
          <div
            className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.95)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
            }}
          >
            <i className="fas fa-check-circle text-white"></i>
            <span className="text-sm text-white font-medium">保存成功</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetExtractPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-darker flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }
    >
      <AssetExtractPageContent />
    </Suspense>
  );
}