"use client";

import { useState, useCallback } from "react";
import StyleSelector from "./StyleSelector";
import AspectRatioSelector from "./AspectRatioSelector";
import ModelConfig from "./ModelConfig";
import AdvancedSettings from "./AdvancedSettings";
import ProjectPreview from "./ProjectPreview";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project";

// Genre options
export const GENRES = [
  { value: "scifi", label: "科幻" },
  { value: "fantasy", label: "玄幻" },
  { value: "urban", label: "都市" },
  { value: "ancient", label: "古言" },
  { value: "mystery", label: "悬疑" },
  { value: "romance", label: "言情" },
  { value: "xianxia", label: "仙侠" },
  { value: "horror", label: "恐怖" },
];

// Target audience options
export const TARGET_AUDIENCES = [
  { value: "all_age", label: "全年龄" },
  { value: "teen", label: "青少年" },
  { value: "adult", label: "成人" },
];

export interface ProjectFormData {
  name: string;
  description: string;
  genre: string;
  targetAudience: string;
  style: string;
  styleTags: string[];
  aspectRatio: string;
  width: number;
  height: number;
  llmModel: string;
  t2iModel: string;
  i2vModel: string;
  samplingSteps: number;
  cfgScale: number;
  shareAssets: boolean;
  coverUrl?: string;
  coverWidth?: number;
  coverHeight?: number;
}

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit?: (data: ProjectFormData) => void;
}

const defaultFormData: ProjectFormData = {
  name: "",
  description: "",
  genre: "",
  targetAudience: "",
  style: "scifi-real",
  styleTags: ["赛博朋克"],
  aspectRatio: "16:9",
  width: 1024,
  height: 576,
  llmModel: "gpt4o",
  t2iModel: "sdxl",
  i2vModel: "runway",
  samplingSteps: 30,
  cfgScale: 7.0,
  shareAssets: true,
  coverUrl: "",
  coverWidth: undefined,
  coverHeight: undefined,
};

export default function ProjectForm({ initialData, onSubmit }: ProjectFormProps) {
  const router = useRouter();
  const { createProject, isCreating, error, clearError } = useProjectStore();
  const [formData, setFormData] = useState<ProjectFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = useCallback(<K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [validationErrors]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "请输入项目名称";
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 50) {
      errors.name = "项目名称需2-50字符";
    }

    if (!formData.genre) {
      errors.genre = "请选择题材类型";
    }

    if (!formData.targetAudience) {
      errors.targetAudience = "请选择目标受众";
    }

    if (!formData.style) {
      errors.style = "请选择视觉风格";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    try {
      const project = await createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
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

      // Navigate to projects list
      router.push("/projects");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "创建项目失败");
    }
  };

  const isValid = formData.name.trim().length >= 2 && formData.name.trim().length <= 50;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
      {/* Left: Form Area */}
      <div className="col-span-8 space-y-6">
        {/* Basic Info Section */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="section-badge bg-primary/10 text-primary border border-primary/20">
              <i className="fas fa-circle-info text-[10px]" />
              <span>项目基本信息</span>
            </div>
          </div>

          <div className="space-y-5">
            {/* Project Name */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                项目名称 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="输入项目名称，如：星辰大海"
                className={`w-full px-4 py-3 bg-surface border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none input-field ${
                  validationErrors.name ? "border-rose-500" : "border-white/10 focus:border-indigo-500/60"
                }`}
                maxLength={50}
              />
              {validationErrors.name && (
                <p className="text-rose-400 text-sm mt-1">{validationErrors.name}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">{formData.name.length} / 50</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                项目简介
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="简要描述项目内容，帮助AI理解故事背景与风格方向..."
                className="w-full h-24 px-4 py-3 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none resize-none custom-scroll leading-relaxed"
                maxLength={200}
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-600">建议 50-200 字</span>
                <span className="text-[10px] text-slate-600">{formData.description.length} / 200</span>
              </div>
            </div>

            {/* Genre & Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  题材类型 <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.genre}
                  onChange={(e) => updateField("genre", e.target.value)}
                  className={`w-full px-4 py-3 bg-surface border rounded-xl text-sm text-white focus:outline-none cursor-pointer appearance-none ${
                    validationErrors.genre ? "border-rose-500" : "border-white/10"
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "16px",
                  }}
                >
                  <option value="">选择题材</option>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                {validationErrors.genre && (
                  <p className="text-rose-400 text-sm mt-1">{validationErrors.genre}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                  目标受众 <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => updateField("targetAudience", e.target.value)}
                  className={`w-full px-4 py-3 bg-surface border rounded-xl text-sm text-white focus:outline-none cursor-pointer appearance-none ${
                    validationErrors.targetAudience ? "border-rose-500" : "border-white/10"
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "16px",
                  }}
                >
                  <option value="">选择受众</option>
                  {TARGET_AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                {validationErrors.targetAudience && (
                  <p className="text-rose-400 text-sm mt-1">{validationErrors.targetAudience}</p>
                )}
              </div>
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

        {/* Error Display */}
        {(submitError || error) && (
          <div className="bg-rose-500/10 border border-rose-500/50 rounded-xl p-4 text-rose-400 text-sm">
            {submitError || error}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-2 pb-8">
          <button
            type="button"
            onClick={() => router.push("/projects")}
            className="flex-1 py-3.5 rounded-xl bg-surface border border-white/10 text-slate-300 font-medium hover:text-white hover:border-white/20 transition-all"
          >
            <i className="fas fa-arrow-left mr-2" />
            返回项目列表
          </button>
          <button
            type="submit"
            disabled={!isValid || isCreating}
            className="flex-[2] py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg generate-btn disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isValid && !isCreating
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : undefined,
            }}
          >
            {isCreating ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-2" />
                创建中...
              </>
            ) : (
              <>
                <i className="fas fa-rocket" />
                创建项目
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Preview Panel */}
      <div className="col-span-4">
        <ProjectPreview data={formData} />
      </div>
    </form>
  );
}
