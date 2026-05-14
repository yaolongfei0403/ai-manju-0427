"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNovelStore } from "@/stores/novel";
import FileDropzone from "@/components/features/upload/FileDropzone";
import FileInfoCard from "@/components/features/upload/FileInfoCard";
import { useProjectStore } from "@/stores/project";

const STEPS = [
  { num: 1, icon: "fa-upload", label: "上传小说", sub: "TXT/DOCX" },
  { num: 2, icon: "fa-file-shield", label: "免责确认", sub: "版权授权" },
  { num: 3, icon: "fa-scissors", label: "拆解分集", sub: "智能拆分" },
  { num: 4, icon: "fa-robot", label: "提取资产", sub: "角色场景道具" },
  { num: 5, icon: "fa-list-check", label: "确认资产", sub: "编辑筛选" },
  { num: 6, icon: "fa-wand-magic-sparkles", label: "批量生产", sub: "生成参考图" },
  { num: 7, icon: "fa-check-double", label: "入资产库", sub: "完成入库" },
];

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { projects } = useProjectStore();
  const { fileMeta, uploadStatus, error, uploadNovel, removeNovelFile, clearError, saveMetadata, loadNovelByProject, _hasHydrated } = useNovelStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const [novelTitle, setNovelTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [style, setStyle] = useState("");

  // 每次进入页面时将滚动条重置到顶部
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  // Load existing novel data when projectId changes
  useEffect(() => {
    if (!_hasHydrated) return;
    let cancelled = false;

    const loadExisting = async () => {
      if (projectId) {
        setIsLoadingExisting(true);
        try {
          const novel = await loadNovelByProject(projectId);
          if (!cancelled) {
            if (novel) {
              setNovelTitle(novel.title || "");
              setAuthor(novel.author || "");
              setGenre(novel.genre || "");
              setStyle(novel.style || "");
            } else {
              setNovelTitle("");
              setAuthor("");
              setGenre("");
              setStyle("");
            }
          }
        } catch {
          if (!cancelled) {
            setNovelTitle("");
            setAuthor("");
            setGenre("");
            setStyle("");
            clearError();
          }
        } finally {
          if (!cancelled) {
            setIsLoadingExisting(false);
          }
        }
      } else {
        // No projectId - use stored fileMeta if available
        if (fileMeta) {
          setNovelTitle(fileMeta.title || "");
          setAuthor(fileMeta.author || "");
          setGenre(fileMeta.genre || "");
          setStyle(fileMeta.style || "");
        }
      }
    };

    loadExisting();
    return () => { cancelled = true; };
  }, [projectId, _hasHydrated, loadNovelByProject]);

  const project = projectId ? projects.find(p => p.id === projectId) : null;

  // Validate project ownership (IDOR check)
  if (projectId && !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <p className="text-rose-400">项目不存在或您没有权限访问</p>
      </div>
    );
  }

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    clearError();
    try {
      const meta = await uploadNovel(file, projectId || undefined);
      // Extract title from filename if no existing title
      if (!novelTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setNovelTitle(nameWithoutExt);
      }
    } catch (err) {
      // Error is set in store via clearError before upload, and uploadNovel sets error on failure
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!fileMeta) return;
    try {
      await removeNovelFile(fileMeta.id);
      setNovelTitle("");
      setAuthor("");
      setGenre("");
      setStyle("");
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleContinue = async () => {
    if (!fileMeta) return;

    // Save metadata to backend if any field is filled
    if (novelTitle || author || genre || style) {
      try {
        await saveMetadata(fileMeta.id, {
          title: novelTitle || undefined,
          author: author || undefined,
          genre: genre || undefined,
          style: style || undefined,
        });
      } catch (err) {
        // Non-blocking: continue even if metadata save fails
        console.error("Failed to save metadata:", err);
      }
    }

    const params = new URLSearchParams();
    params.set("fileId", fileMeta.id);
    if (projectId) params.set("projectId", projectId);
    router.push(`/upload/disclaimer?${params.toString()}`);
  };

  const canContinue = fileMeta && novelTitle.trim().length >= 2 && /\S/.test(novelTitle);

  const GENRES = [
    { value: "scifi", label: "科幻" },
    { value: "fantasy", label: "玄幻" },
    { value: "urban", label: "都市" },
    { value: "ancient", label: "古言" },
    { value: "mystery", label: "悬疑" },
    { value: "romance", label: "言情" },
    { value: "xianxia", label: "仙侠" },
    { value: "horror", label: "恐怖" },
  ];

  const STYLES = [
    { value: "scifi-real", label: "写实科幻" },
    { value: "anime", label: "二次元动漫" },
    { value: "ink", label: "国风水墨" },
    { value: "comic", label: "欧美漫画" },
    { value: "pixel", label: "像素风格" },
    { value: "3d", label: "3D渲染" },
    { value: "sketch", label: "手绘素描" },
  ];

  if (!_hasHydrated || isLoadingExisting) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-primary text-2xl mb-2" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-8 fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/5">
              <i className="fas fa-cloud-upload-alt text-primary text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">上传小说文件</h2>
            <p className="text-sm text-slate-400">支持 TXT、DOCX、PDF 格式，AI 将自动分析并提取资产</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 md:p-8 mb-6 shadow-2xl shadow-black/20">
            {/* 拖拽区域 */}
            {uploadStatus === "uploaded" && fileMeta ? (
              <FileInfoCard
                file={{
                  ...fileMeta,
                  title: novelTitle || fileMeta.title,
                  author,
                  genre,
                  style,
                }}
                onRemove={handleRemove}
                onReUpload={handleFileSelect}
              />
            ) : (
              <div className="mb-6">
                <FileDropzone
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                  uploadStatus={uploadStatus}
                  error={error}
                />
              </div>
            )}

            {/* 表单字段 */}
            <div className="space-y-4 mt-6 pt-6 border-t border-white/5">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">作品名称</label>
                <input
                  type="text"
                  value={novelTitle}
                  onChange={(e) => setNovelTitle(e.target.value)}
                  placeholder="输入作品名称..."
                  className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">作者</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="输入作者名称..."
                  className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">题材类型</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="">选择题材</option>
                    {GENRES.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">风格偏好</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="">选择风格</option>
                    {STYLES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="generate-btn w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>下一步：确认免责书</span>
            <i className="fas fa-arrow-right"></i>
          </button>

          <p className="text-center text-slate-500 text-xs mt-4">
            支持 TXT、Markdown 格式，最大 50MB
          </p>
        </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}