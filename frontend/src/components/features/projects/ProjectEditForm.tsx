"use client";

import { useState } from "react";
import { Project, updateProject } from "@/lib/api/projects";
import { useProjectStore } from "@/stores/project";
import StyleSelector from "./StyleSelector";
import AspectRatioSelector from "./AspectRatioSelector";
import ModelConfig from "./ModelConfig";
import ProjectPreview from "./ProjectPreview";

interface ProjectEditFormProps {
  project: Project;
  onCancel: () => void;
  onSuccess: () => void;
}

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

const TARGET_AUDIENCES = [
  { value: "all_age", label: "全年龄" },
  { value: "teen", label: "青少年" },
  { value: "adult", label: "成人" },
];

export default function ProjectEditForm({ project, onCancel, onSuccess }: ProjectEditFormProps) {
  const { fetchProject } = useProjectStore();
  const [formData, setFormData] = useState({
    description: project.description || "",
    genre: project.genre,
    targetAudience: project.targetAudience,
    style: project.style,
    styleTags: project.styleTags || [],
    aspectRatio: project.aspectRatio,
    width: project.width,
    height: project.height,
    llmModel: project.llmModel,
    t2iModel: project.t2iModel,
    i2vModel: project.i2vModel,
    samplingSteps: project.samplingSteps,
    cfgScale: project.cfgScale,
    shareAssets: project.shareAssets,
    coverUrl: project.coverUrl || "",
    coverWidth: project.coverWidth ?? undefined,
    coverHeight: project.coverHeight ?? undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProject(project.id, {
        description: formData.description ?? undefined,
        genre: formData.genre,
        targetAudience: formData.targetAudience,
        style: formData.style,
        styleTags: formData.styleTags,
        aspectRatio: formData.aspectRatio,
        width: formData.width,
        height: formData.height,
        llmModel: formData.llmModel,
        t2iModel: formData.t2iModel,
        i2vModel: formData.i2vModel,
        samplingSteps: formData.samplingSteps,
        cfgScale: formData.cfgScale,
        shareAssets: formData.shareAssets,
        coverUrl: formData.coverUrl || undefined,
        coverWidth: formData.coverWidth,
        coverHeight: formData.coverHeight,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
      {/* Left: Form Area */}
      <div className="col-span-8 space-y-6">
        {/* Project Name (Read-only) */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-primary" />
            项目信息
          </h3>

          {/* Read-only Project Name */}
          <div className="mb-5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              项目名称
            </label>
            <div className="relative">
              <input
                type="text"
                value={project.name}
                disabled
                className="w-full px-4 py-3 bg-surface/50 border border-white/10 rounded-xl text-sm text-slate-400 cursor-not-allowed"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-slate-500">
                <i className="fas fa-lock" />
                项目名称创建后不可修改
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              项目简介
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="简要描述项目内容，帮助AI理解故事背景与风格方向..."
              className="w-full h-24 px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 resize-none custom-scroll leading-relaxed"
              maxLength={200}
            />
          </div>

          {/* Genre & Audience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                题材类型
              </label>
              <select
                value={formData.genre}
                onChange={(e) => updateField("genre", e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  backgroundSize: "16px",
                }}
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                目标受众
              </label>
              <select
                value={formData.targetAudience}
                onChange={(e) => updateField("targetAudience", e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  backgroundSize: "16px",
                }}
              >
                {TARGET_AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Style Selection */}
        <StyleSelector
          selectedStyle={formData.style}
          styleTags={formData.styleTags}
          coverUrl={formData.coverUrl}
          coverWidth={formData.coverWidth}
          coverHeight={formData.coverHeight}
          onStyleChange={(style) => updateField("style", style)}
          onTagsChange={(tags) => updateField("styleTags", tags)}
          onCoverChange={(url, width, height) => {
            updateField("coverUrl", url);
            updateField("coverWidth", width);
            updateField("coverHeight", height);
          }}
        />

        {/* Aspect Ratio */}
        <AspectRatioSelector
          selectedRatio={formData.aspectRatio}
          width={formData.width}
          height={formData.height}
          onRatioChange={(ratio, w, h) => {
            updateField("aspectRatio", ratio);
            updateField("width", w);
            updateField("height", h);
          }}
          onDimensionChange={(w, h) => {
            updateField("width", w);
            updateField("height", h);
          }}
        />

        {/* AI Model Config */}
        <ModelConfig
          llmModel={formData.llmModel}
          t2iModel={formData.t2iModel}
          i2vModel={formData.i2vModel}
          onLLMChange={(model) => updateField("llmModel", model)}
          onT2IChange={(model) => updateField("t2iModel", model)}
          onI2VChange={(model) => updateField("i2vModel", model)}
        />

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 rounded-xl p-4 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-4 text-emerald-400 text-sm">
            <i className="fas fa-check-circle mr-2" />
            保存成功！
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-surface border border-white/10 text-slate-300 font-medium hover:text-white hover:border-white/20 transition-all"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSaving || success}
            className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg generate-btn disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: !isSaving && !success
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : undefined,
            }}
          >
            {isSaving ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-2" />
                保存中...
              </>
            ) : (
              <>
                <i className="fas fa-save" />
                保存修改
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Preview Panel */}
      <div className="col-span-4">
        <ProjectPreview data={{ name: project.name, ...formData }} />
      </div>
    </form>
  );
}
