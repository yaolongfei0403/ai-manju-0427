"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useNovelStore } from "@/stores/novel";
import { getSplitResult } from "@/lib/api/upload";

const SPLIT_TASKS = [
  { id: "structure", label: "分析小说结构", icon: "fa-magnifying-glass-chart", color: "#10b981" },
  { id: "chapters", label: "识别章节边界", icon: "fa-book-open", color: "#06b6d4" },
  { id: "strategy", label: "应用分集策略", icon: "fa-sliders", color: "#f59e0b" },
  { id: "split", label: "智能拆解分集", icon: "fa-scissors", color: "#f59e0b" },
  { id: "summary", label: "生成分集摘要", icon: "fa-pen-to-square", color: "#8b5cf6" },
];

function ExecutingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { triggerSplit, splitResult, splitStrategy } = useNovelStore();

  const fileId = searchParams.get("fileId");
  const projectId = searchParams.get("projectId");
  const taskIdParam = searchParams.get("taskId");
  const strategyConfigParam = searchParams.get("strategyConfig");

  // 解析 URL 中的策略配置
  const parsedStrategyConfig = (() => {
    if (!strategyConfigParam) return undefined;
    try {
      const params = new URLSearchParams(strategyConfigParam);
      return {
        strategy: params.get("strategy") as "balanced" | "plot" | "character" | "custom",
        targetEpisodes: parseInt(params.get("targetEpisodes") || "0"),
        shotRangeMin: parseInt(params.get("shotRangeMin") || "8"),
        shotRangeMax: parseInt(params.get("shotRangeMax") || "14"),
        keepChapterIntegrity: params.get("keepChapterIntegrity") === "true",
        specialFirstLast: params.get("specialFirstLast") === "true",
        preserveNarrative: params.get("preserveNarrative") === "true",
        customPrompt: params.get("customPrompt") || "",
      };
    } catch {
      return undefined;
    }
  })();

  const [progress, setProgress] = useState(0);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [taskBars, setTaskBars] = useState<Record<string, number>>({});
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskIdParam);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAddedFinalLogRef = useRef(false);
  const pollingStartedRef = useRef(false); // 防止重复启动轮询
  const redirectDoneRef = useRef(false); // 防止重复跳转
  const splitTriggeredRef = useRef(false); // 防止重复触发拆分
  const isCompletedRef = useRef(false); // 用于动画读取，避免闭包问题
  const redirectScheduledRef = useRef(false); // 防止重复安排跳转

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll for real split result
  const pollSplitResult = useCallback(async (taskId: string) => {
    if (pollingStartedRef.current) return; // 防止重复启动
    pollingStartedRef.current = true;

    addLog("[系统] 正在查询分集结果...");

    const poll = async () => {
      try {
        const result = await getSplitResult(taskId);
        addLog(`[系统] 状态: ${result.status}`);

        if (result.status === "completed") {
          // LLM 完成：清除轮询，让进度追上 100% 后跳转
          addLog("[系统] 分集完成！正在跳转...");
          setIsCompleted(true);
          isCompletedRef.current = true; // 同步到 ref，动画可读取
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        } else if (result.status === "failed") {
          // Failed - show error
          addLog(`[错误] 分集失败: ${result.error?.message || "未知错误"}`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }
        // If still processing, continue polling (handled by interval)
      } catch (error) {
        // Network errors are expected during polling, just log and continue
        console.log("Polling error (expected):", error);
      }
    };

    // Start polling immediately
    await poll();

    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(poll, 3000);
  }, [fileId, projectId, router]);

  // Trigger split when entering page without taskId
  useEffect(() => {
    if (!taskIdParam && fileId && !splitTriggeredRef.current) {
      splitTriggeredRef.current = true; // 防止 React Strict Mode 重复执行
      addLog("[系统] 正在启动分集任务...");
      triggerSplit(fileId, parsedStrategyConfig, projectId || undefined)
        .then((result) => {
          setCurrentTaskId(result.taskId);
          addLog(`[系统] 任务已创建: ${result.taskId}`);
          // Update URL with taskId
          const params = new URLSearchParams();
          params.set("fileId", fileId);
          params.set("taskId", result.taskId);
          if (projectId) params.set("projectId", projectId);
          router.replace(`/upload/strategy/executing?${params.toString()}`);
          // Start polling for results
          pollSplitResult(result.taskId);
        })
        .catch((err) => {
          addLog(`[错误] 触发拆分失败: ${err instanceof Error ? err.message : "未知错误"}`);
        });
    } else if (taskIdParam) {
      // If we have taskId from URL, start polling immediately
      setCurrentTaskId(taskIdParam);
      pollSplitResult(taskIdParam);
    }
  }, [taskIdParam, fileId, projectId, triggerSplit, router, pollSplitResult]);

  // 统一进度动画：梯度降速 + LLM 完成后快速追到 100%
  useEffect(() => {
    if (!fileId) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // 到达 100%：安排跳转
          if (!redirectScheduledRef.current) {
            redirectScheduledRef.current = true;
            setTimeout(() => {
              router.push(`/upload/split-result?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}&taskId=${currentTaskId || ""}`);
            }, 300);
          }
          return 100;
        }

        if (isCompletedRef.current) {
          // LLM 已完成：快速追到 100%
          return Math.min(100, prev + 8);
        } else if (prev > 90) {
          // 90-100%：极慢等待，每500ms增加0.1-0.2%
          return Math.min(100, prev + Math.random() * 0.1 + 0.1);
        } else if (prev > 80) {
          // 80-90%：降速，每500ms增加0.5-0.8%
          return Math.min(100, prev + Math.random() * 0.3 + 0.5);
        } else {
          // 0-80%：正常速度，每500ms增加2.5-4%，10-15秒到达80%
          return Math.min(100, prev + Math.random() * 1.5 + 2.5);
        }
      });
    }, 500); // 基础间隔 500ms

    return () => clearInterval(interval);
  }, [fileId, projectId, currentTaskId, router]);

  // Update task statuses based on progress
  useEffect(() => {
    const statuses: Record<string, string> = {};
    const bars: Record<string, number> = {};

    SPLIT_TASKS.forEach((task, index) => {
      const taskStart = index * 20;
      const taskEnd = (index + 1) * 20;

      if (progress < taskStart) {
        statuses[task.id] = "等待中...";
        bars[task.id] = 0;
      } else if (progress >= taskEnd) {
        statuses[task.id] = "已完成";
        bars[task.id] = 100;
      } else {
        const taskProgress = ((progress - taskStart) / (taskEnd - taskStart)) * 100;
        if (taskProgress < 50) {
          statuses[task.id] = "处理中...";
        } else {
          statuses[task.id] = "已完成";
        }
        bars[task.id] = Math.min(100, taskProgress);
      }
    });

    setTaskStatuses(statuses);
    setTaskBars(bars);
  }, [progress]);

  // Add logs based on progress
  useEffect(() => {
    if (progress >= 20 && progress < 40 && !logs.some(l => l.includes("小说结构"))) {
      addLog("[系统] 正在分析小说结构...");
    }
    if (progress >= 40 && progress < 60 && !logs.some(l => l.includes("章节边界"))) {
      addLog("[系统] 识别章节边界...");
    }
    if (progress >= 60 && progress < 80 && !logs.some(l => l.includes("分集策略"))) {
      addLog("[系统] 应用分集策略...");
    }
    if (progress >= 80 && progress < 95 && !logs.some(l => l.includes("拆解"))) {
      addLog("[系统] 智能拆解分集...");
    }
    if (progress >= 95 && !hasAddedFinalLogRef.current) {
      hasAddedFinalLogRef.current = true;
      addLog("[系统] 正在生成最终结果...");
    }
  }, [progress, logs]);

  const strategyName = splitStrategy?.strategy === "balanced" ? "智能均衡"
    : splitStrategy?.strategy === "plot" ? "情节驱动"
    : splitStrategy?.strategy === "character" ? "角色驱动"
    : splitStrategy?.strategy === "custom" ? "自定义策略" : "智能均衡";

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
    <div className="flex-1 overflow-y-auto custom-scroll flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald/20 to-cyan/20 border border-emerald/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald/5 relative">
              <i className="fas fa-scissors text-emerald text-xl" style={{ color: "#10b981" }}></i>
              {progress < 100 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: "#10b981" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mb-1">正在拆解分集</h2>
            <p className="text-sm text-slate-400">
              基于「<span style={{ color: "#10b981", fontWeight: 500 }}>{strategyName}</span>」策略分析中...
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5 md:p-6 mb-5 shadow-2xl shadow-black/20">
            {/* 进度条 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">拆分进度</span>
                <span className="text-sm font-mono font-bold" style={{ color: "#10b981" }}>{Math.min(Math.round(progress), 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#334155" }}>
                <div
                  className="h-full rounded-full progress-bar"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(to right, #10b981, #06b6d4)",
                  }}
                ></div>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="space-y-2.5 mb-5">
              {SPLIT_TASKS.map((task) => {
                const status = taskStatuses[task.id] || "等待中...";
                const barWidth = taskBars[task.id] || 0;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
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
                        <span className="text-xs text-slate-400 stask-status">{status}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#334155" }}>
                        <div
                          className="h-full rounded-full progress-bar stask-bar"
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

            {/* 日志区域 */}
            <div
              className="p-3 rounded-xl font-mono text-xs h-24 overflow-y-auto custom-scroll"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: "#94a3b8",
              }}
            >
              {logs.map((log, idx) => (
                <div key={idx} style={{ color: log.includes("[错误]") ? "#ef4444" : log.includes("[系统]") ? "#10b981" : "#94a3b8" }}>
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ color: "#10b981" }}>[系统] 开始分析小说结构...</div>
              )}
            </div>
          </div>

          {/* 完成状态 - 进度100%时显示 */}
          {progress >= 100 && (
            <div className="flex gap-3">
              <Link
                href={`/upload/split-result?fileId=${fileId}${projectId ? `&projectId=${projectId}` : ""}&taskId=${currentTaskId || ""}`}
                className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                style={{
                  background: "linear-gradient(to right, #10b981, #06b6d4)",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
                }}
              >
                <i className="fas fa-check"></i>
                <span>查看分集结果</span>
              </Link>
            </div>
          )}

          {/* 提示 */}
          {progress < 100 && (
            <div className="p-3 rounded-xl mt-3" style={{ backgroundColor: "rgba(30, 41, 59, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div className="flex items-center gap-2">
                <i className="fas fa-info-circle text-primary text-xs" style={{ color: "#6366f1" }}></i>
                <span className="text-xs text-slate-400">
                  AI 正在分析小说结构，请稍候。离开此页面不会中断任务执行。
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

export default function ExecutingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-darker flex items-center justify-center">
          <div className="text-slate-400">加载中...</div>
        </div>
      }
    >
      <ExecutingPageContent />
    </Suspense>
  );
}
