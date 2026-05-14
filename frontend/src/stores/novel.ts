// Novel Store - Zustand for novel upload state management

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uploadNovelFile, agreeDisclaimer as agreeDisclaimerApi, configureSplitStrategy as configureSplitStrategyApi, updateNovelMetadata, getNovelByProjectId, deleteNovelFile, NovelFileMeta, DisclaimerAgreement, SplitStrategyConfig, NovelFileWithMetadata, SplitResult, EpisodeResult, triggerSplitResult as triggerSplitResultApi, getSplitResult as getSplitResultApi } from "@/lib/api/upload";

interface NovelState {
  file: File | null;
  uploadStatus: "idle" | "uploading" | "uploaded" | "error";
  fileMeta: NovelFileMeta | null;
  disclaimerAgreed: boolean;
  disclaimerAgreedAt: string | null;
  splitStrategy: SplitStrategyConfig | null;
  splitResult: SplitResult | null;
  error: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  uploadNovel: (file: File, projectId?: string) => Promise<NovelFileMeta>;
  agreeDisclaimer: (fileId: string) => Promise<DisclaimerAgreement>;
  configureStrategy: (fileId: string, strategy: SplitStrategyConfig, projectId?: string) => Promise<{ taskId: string }>;
  triggerSplit: (fileId: string, strategy: SplitStrategyConfig | undefined, projectId?: string) => Promise<{ taskId: string }>;
  loadSplitResult: (taskId: string, projectId?: string) => Promise<SplitResult>;
  saveMetadata: (fileId: string, metadata: { title?: string; author?: string; genre?: string; style?: string }) => Promise<NovelFileWithMetadata>;
  loadNovelByProject: (projectId: string) => Promise<NovelFileWithMetadata>;
  removeNovelFile: (fileId: string) => Promise<void>;
  clearFile: () => void;
  clearError: () => void;
  // Episode editing actions
  mergeEpisodes: (episodeIndexes: number[]) => void;
  splitEpisode: (episodeIndex: number, splitPoint?: number) => void;
  deleteEpisode: (episodeIndex: number) => void;
  updateEpisode: (episodeIndex: number, updates: Partial<EpisodeResult>) => void;
}

export const useNovelStore = create<NovelState>()(
  persist(
    (set) => ({
      file: null,
      uploadStatus: "idle",
      fileMeta: null,
      disclaimerAgreed: false,
      disclaimerAgreedAt: null,
      splitStrategy: null,
      splitResult: null,
      error: null,
      isLoading: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      uploadNovel: async (file: File, projectId?: string) => {
        set({ file, uploadStatus: "uploading", error: null });

        try {
          const fileMeta = await uploadNovelFile(file, projectId);
          set({
            fileMeta,
            uploadStatus: "uploaded",
            error: null,
          });
          return fileMeta;
        } catch (err) {
          const message = err instanceof Error ? err.message : "上传失败";
          set({
            error: message,
            uploadStatus: "error",
            fileMeta: null,
          });
          throw err;
        }
      },

      agreeDisclaimer: async (fileId: string) => {
        set({ error: null });
        try {
          const agreement = await agreeDisclaimerApi(fileId);
          set({
            disclaimerAgreed: agreement.agreed,
            disclaimerAgreedAt: agreement.agreedAt,
          });
          return agreement;
        } catch (err) {
          const message = err instanceof Error ? err.message : "确认失败";
          set({ error: message });
          throw err;
        }
      },

      configureStrategy: async (fileId: string, strategy: SplitStrategyConfig, projectId?: string) => {
        set({ error: null });
        try {
          const result = await configureSplitStrategyApi(fileId, strategy, projectId);
          set({ splitStrategy: strategy });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : "配置失败";
          set({ error: message });
          throw err;
        }
      },

      triggerSplit: async (fileId: string, strategy: SplitStrategyConfig | undefined, projectId?: string) => {
        set({ error: null });
        try {
          const result = await triggerSplitResultApi(fileId, strategy, projectId);
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : "触发拆分失败";
          set({ error: message });
          throw err;
        }
      },

      loadSplitResult: async (taskId: string, projectId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await getSplitResultApi(taskId, projectId);
          set({ splitResult: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : "加载分集结果失败";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      saveMetadata: async (fileId: string, metadata: { title?: string; author?: string; genre?: string; style?: string }) => {
        set({ error: null });
        try {
          const updated = await updateNovelMetadata(fileId, metadata);
          set((state) => ({
            fileMeta: state.fileMeta ? { ...state.fileMeta, ...metadata } : null,
          }));
          return updated;
        } catch (err) {
          const message = err instanceof Error ? err.message : "保存元数据失败";
          set({ error: message });
          throw err;
        }
      },

      loadNovelByProject: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          const novel = await getNovelByProjectId(projectId);
          set({
            fileMeta: novel,
            uploadStatus: "uploaded",
            isLoading: false,
          });
          return novel;
        } catch (err: unknown) {
          // Treat 404 as normal "no data" case, not an error
          const is404 = (err as { response?: { status?: number } })?.response?.status === 404
            || (err instanceof Error && err.message.includes("暂无上传的小说"));
          set({
            error: null,
            uploadStatus: "idle",
            fileMeta: null,
            isLoading: false,
          });
          if (is404) return null;
          const message = err instanceof Error ? err.message : "加载小说信息失败";
          set({ error: message });
          throw err;
        }
      },

      removeNovelFile: async (fileId: string) => {
        set({ error: null });
        try {
          await deleteNovelFile(fileId);
          set({
            file: null,
            uploadStatus: "idle",
            fileMeta: null,
            disclaimerAgreed: false,
            disclaimerAgreedAt: null,
            splitStrategy: null,
            error: null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "删除失败";
          set({ error: message });
          throw err;
        }
      },

      clearFile: () => {
        set({
          file: null,
          uploadStatus: "idle",
          fileMeta: null,
          disclaimerAgreed: false,
          disclaimerAgreedAt: null,
          splitStrategy: null,
          splitResult: null,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      mergeEpisodes: (episodeIndexes: number[]) => {
        set((state) => {
          if (!state.splitResult) return state;

          const episodes = [...state.splitResult.episodes];
          const selectedEpisodes = episodeIndexes
            .sort((a, b) => a - b)
            .map((idx) => episodes[idx])
            .filter(Boolean);

          if (selectedEpisodes.length < 2) return state;

          // Merge into first episode
          const mergedEpisode: EpisodeResult = {
            orderIndex: selectedEpisodes[0].orderIndex,
            title: selectedEpisodes[0].title,
            summary: selectedEpisodes.map((ep) => ep.summary).join(" "),
            estimatedShots: selectedEpisodes.reduce((sum, ep) => sum + ep.estimatedShots, 0),
            chapters: selectedEpisodes.flatMap((ep) => ep.chapters),
            sceneDensity: selectedEpisodes.reduce((sum, ep) => sum + ep.sceneDensity, 0) / selectedEpisodes.length,
          };

          // Replace first with merged, remove others
          const firstIdx = episodeIndexes.sort((a, b) => a - b)[0];
          const remainingIndexes = episodeIndexes.sort((a, b) => b - a).slice(1);
          episodes[firstIdx] = mergedEpisode;
          remainingIndexes.forEach((idx) => episodes.splice(idx, 1));

          // Re-index
          episodes.forEach((ep, idx) => {
            ep.orderIndex = idx + 1;
          });

          return {
            splitResult: {
              ...state.splitResult,
              episodes,
              totalEpisodes: episodes.length,
            },
          };
        });
      },

      splitEpisode: (episodeIndex: number, splitPoint?: number) => {
        set((state) => {
          if (!state.splitResult) return state;

          const episodes = [...state.splitResult.episodes];
          const episode = episodes[episodeIndex];
          if (!episode) return state;

          // Default split at middle
          const point = splitPoint || Math.ceil(episode.summary.length / 2);

          const firstPart = episode.summary.substring(0, point);
          const secondPart = episode.summary.substring(point);

          const newEpisode1: EpisodeResult = {
            ...episode,
            summary: firstPart,
            estimatedShots: Math.floor(episode.estimatedShots / 2),
          };

          const newEpisode2: EpisodeResult = {
            ...episode,
            orderIndex: episodeIndex + 2,
            title: `${episode.title.replace(/第(\d+)集：/, "")}（续）`,
            summary: secondPart,
            estimatedShots: Math.ceil(episode.estimatedShots / 2),
          };

          episodes.splice(episodeIndex, 1, newEpisode1, newEpisode2);

          // Re-index
          episodes.forEach((ep, idx) => {
            ep.orderIndex = idx + 1;
          });

          return {
            splitResult: {
              ...state.splitResult,
              episodes,
              totalEpisodes: episodes.length,
            },
          };
        });
      },

      deleteEpisode: (episodeIndex: number) => {
        set((state) => {
          if (!state.splitResult) return state;

          const episodes = [...state.splitResult.episodes];
          episodes.splice(episodeIndex, 1);

          // Re-index
          episodes.forEach((ep, idx) => {
            ep.orderIndex = idx + 1;
          });

          return {
            splitResult: {
              ...state.splitResult,
              episodes,
              totalEpisodes: episodes.length,
            },
          };
        });
      },

      updateEpisode: (episodeIndex: number, updates: Partial<EpisodeResult>) => {
        set((state) => {
          if (!state.splitResult) return state;

          const episodes = [...state.splitResult.episodes];
          if (!episodes[episodeIndex]) return state;

          episodes[episodeIndex] = {
            ...episodes[episodeIndex],
            ...updates,
          };

          return {
            splitResult: {
              ...state.splitResult,
              episodes,
            },
          };
        });
      },
    }),
    {
      name: "novel-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fileMeta: state.fileMeta,
        uploadStatus: state.uploadStatus,
        disclaimerAgreed: state.disclaimerAgreed,
        disclaimerAgreedAt: state.disclaimerAgreedAt,
        splitStrategy: state.splitStrategy,
        splitResult: state.splitResult,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);