// Asset Store - Zustand for asset management

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Asset, ExtractedAssets, ExtractTaskResult } from "@/types/asset";
import { triggerAssetExtraction, getAssetExtractionResult, getAssetsByProject, getGroupedAssetsByProject, updateAssetPrompt as updateAssetPromptApi, deleteAsset as deleteAssetApi } from "@/lib/api/assets";

interface AssetState {
  // Extraction state
  extractTaskId: string | null;
  extractStatus: "idle" | "processing" | "completed" | "failed";
  extractProgress: number;
  extractedAssets: ExtractedAssets | null;
  extractError: string | null;
  extractFileId: string | null;
  extractProjectId: string | null;

  // Asset list
  assets: Asset[];
  assetsLoading: boolean;

  // Actions
  startExtraction: (projectId: string, fileId: string, episodes: any[]) => Promise<string>;
  pollExtractionResult: (taskId: string, projectId?: string) => Promise<void>;
  loadAssetsByProject: (projectId: string) => Promise<void>;
  /** Load assets grouped by type from DB for a specific project; returns true if assets found */
  loadGroupedAssets: (projectId: string) => Promise<{ found: boolean; assets: ExtractedAssets | null }>;
  updateAssetPrompt: (assetId: string, prompt: string, description?: string) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  clearExtractState: () => void;
  clearError: () => void;
  setExtractFailed: (message: string) => void;
  /** Returns true if the stored extraction state is for a different fileId or projectId */
  isStaleForFile: (fileId: string, projectId: string) => boolean;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      extractTaskId: null,
      extractStatus: "idle",
      extractProgress: 0,
      extractedAssets: null,
      extractError: null,
      extractFileId: null,
      extractProjectId: null,
      assets: [],
      assetsLoading: false,

      startExtraction: async (projectId, fileId, episodes) => {
        set({
          extractStatus: "processing",
          extractProgress: 0,
          extractError: null,
          extractedAssets: null,
          extractFileId: fileId,
          extractProjectId: projectId,
        });

        try {
          // ── 关键修复：把 EpisodeResult 对象数组转成 orderIndex 数字数组 ──
          const episodeNumbers = episodes
            .map((ep: any) =>
              typeof ep === "number" ? ep : (ep.orderIndex ?? ep.episodeNumber ?? parseInt(ep))
            )
            .filter((n: number) => typeof n === "number" && !isNaN(n));

          console.log(`[startExtraction] projectId=${projectId}, fileId=${fileId}, episodes=`, episodeNumbers);

          const result = await triggerAssetExtraction(projectId, fileId, { episodes: episodeNumbers } as any);
          console.log(`[startExtraction] result=`, result);

          if (result.status === "completed") {
            // 后端直接返回了已有资产（skip），直接写入 store，无需再查
            if (result.assets) {
              set({
                extractTaskId: null,
                extractStatus: "completed",
                extractProgress: 100,
                extractedAssets: result.assets,
              });
            } else {
              // 兼容旧逻辑：fallback 查一次 task 结果
              try {
                const res = await getAssetExtractionResult(result.taskId, projectId);
                set({
                  extractTaskId: null,
                  extractStatus: "completed",
                  extractProgress: 100,
                  extractedAssets: res.assets,
                });
              } catch (e) {
                set({ extractStatus: "failed", extractError: "加载已有资产失败" });
                throw e;
              }
            }
            return result.taskId;
          }

          set({ extractTaskId: result.taskId, extractStatus: "processing" });
          return result.taskId;
        } catch (err) {
          const message = err instanceof Error ? err.message : "提取失败";
          console.error(`[startExtraction] ERROR:`, message);
          set({ extractStatus: "failed", extractError: message });
          throw err;
        }
      },

      pollExtractionResult: async (taskId: string, projectId?: string) => {
        try {
          const result = await getAssetExtractionResult(taskId, projectId);
          set({
            extractProgress: result.progress,
            extractStatus: result.status as any,
            extractedAssets: result.assets,
            extractError: result.error?.message || null,
          });

          if (result.status === "completed" || result.status === "failed") {
            set({ extractTaskId: null });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "获取进度失败";
          const is404 = err instanceof Error && err.message.includes("不存在");
          set({
            extractStatus: "failed",
            extractError: is404 ? "任务已过期，请重新提取资产" : message,
            extractTaskId: null,
            extractedAssets: null,
          });
        }
      },

      loadAssetsByProject: async (projectId: string) => {
        set({ assetsLoading: true });
        try {
          const assets = await getAssetsByProject(projectId);
          set({ assets, assetsLoading: false });
        } catch (err) {
          set({ assetsLoading: false });
        }
      },

      loadGroupedAssets: async (projectId: string) => {
        try {
          const grouped = await getGroupedAssetsByProject(projectId);
          const hasAssets =
            grouped.characters.length > 0 ||
            grouped.scenes.length > 0 ||
            grouped.props.length > 0;

          if (hasAssets) {
            set({
              extractedAssets: grouped,
              extractStatus: "completed",
              extractProjectId: projectId,
              extractFileId: null,
            });
            return { found: true, assets: grouped };
          }
          return { found: false, assets: null };
        } catch (err) {
          console.error("[loadGroupedAssets] error:", err);
          return { found: false, assets: null };
        }
      },

      updateAssetPrompt: async (assetId: string, prompt: string, description?: string) => {
        try {
          const updated = await updateAssetPromptApi(assetId, prompt, description);
          set((state) => ({
            assets: state.assets.map((a) => (a.id === assetId ? updated : a)),
            extractedAssets: state.extractedAssets
              ? {
                  characters: state.extractedAssets.characters.map((a) =>
                    a.id === assetId ? { ...a, prompt, description: description || a.description } : a
                  ),
                  scenes: state.extractedAssets.scenes.map((a) =>
                    a.id === assetId ? { ...a, prompt, description: description || a.description } : a
                  ),
                  props: state.extractedAssets.props.map((a) =>
                    a.id === assetId ? { ...a, prompt, description: description || a.description } : a
                  ),
                }
              : null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "更新失败";
          throw new Error(message);
        }
      },

      deleteAsset: async (assetId: string) => {
        try {
          await deleteAssetApi(assetId);
          set((state) => ({
            assets: state.assets.filter((a) => a.id !== assetId),
            extractedAssets: state.extractedAssets
              ? {
                  characters: state.extractedAssets.characters.filter((a) => a.id !== assetId),
                  scenes: state.extractedAssets.scenes.filter((a) => a.id !== assetId),
                  props: state.extractedAssets.props.filter((a) => a.id !== assetId),
                }
              : null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "删除失败";
          throw new Error(message);
        }
      },

      clearExtractState: () => {
        set({
          extractTaskId: null,
          extractStatus: "idle",
          extractProgress: 0,
          extractedAssets: null,
          extractError: null,
          extractFileId: null,
          extractProjectId: null,
        });
      },

      clearError: () => {
        set({ extractError: null });
      },

      setExtractFailed: (message: string) => {
        set({
          extractStatus: "failed",
          extractError: message,
          extractProgress: 0,
          extractedAssets: null,
          extractTaskId: null,
          extractProjectId: null,
        });
      },

      isStaleForFile: (fileId: string, projectId: string) => {
        const { extractStatus, extractFileId, extractProjectId } = get();
        if (!fileId || !projectId) return false;
        if (extractStatus === "idle") return false;
        if (extractFileId && extractFileId !== fileId) return true;
        if (extractProjectId && extractProjectId !== projectId) return true;
        return false;
      },
    }),
    {
      name: "asset-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        extractTaskId: state.extractTaskId,
        extractStatus: state.extractStatus,
        extractProgress: state.extractProgress,
        extractedAssets: state.extractedAssets,
        extractFileId: state.extractFileId,
        extractProjectId: state.extractProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.extractStatus === "failed") {
          state.extractTaskId = null;
        }
      },
    }
  )
);