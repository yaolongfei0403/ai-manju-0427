"use client";

import { useRouter } from "next/navigation";
import { Project } from "@/lib/api/projects";

interface ProjectCardGridProps {
  project: Project;
  onDuplicate?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onRestore?: (project: Project) => void;
  onFavorite?: (project: Project) => void;
}

// Status config mapping
const STATUS_CONFIG = {
  draft: { label: "草稿", color: "text-slate-400", bg: "bg-slate-400", bgLight: "bg-slate-400/10" },
  active: { label: "进行中", color: "text-amber-400", bg: "bg-amber-400", bgLight: "bg-amber-400/10" },
  completed: { label: "已完成", color: "text-emerald-400", bg: "bg-emerald-400", bgLight: "bg-emerald-400/10" },
  trashed: { label: "已删除", color: "text-rose-400", bg: "bg-rose-400", bgLight: "bg-rose-400/10" },
};

// Style image mapping - used when no custom cover is uploaded
const STYLE_IMAGES: Record<string, string> = {
  "scifi-real": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=60",
  "anime": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=60",
  "ink": "https://images.unsplash.com/photo-1515405295579-ba7b45403062?w=400&auto=format&fit=crop&q=60",
  "comic": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=60",
  "pixel": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=60",
  "3d": "https://images.unsplash.com/photo-1633218388467-539651dcf81a?w=400&auto=format&fit=crop&q=60",
  "sketch": "https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=400&auto=format&fit=crop&q=60",
};

// Genre color mapping
const GENRE_COLORS: Record<string, string> = {
  scifi: "bg-primary/10 text-primary border-primary/30",
  fantasy: "bg-secondary/10 text-secondary border-secondary/30",
  urban: "bg-emerald/10 text-emerald border-emerald/30",
  ancient: "bg-amber/10 text-amber border-amber/30",
  mystery: "bg-rose/10 text-rose border-rose/30",
  romance: "bg-pink/10 text-pink border-pink/30",
  xianxia: "bg-cyan/10 text-cyan border-cyan/30",
  horror: "bg-red/10 text-red border-red/30",
};

const GENRE_NAMES: Record<string, string> = {
  scifi: "科幻",
  fantasy: "玄幻",
  urban: "都市",
  ancient: "古言",
  mystery: "悬疑",
  romance: "言情",
  xianxia: "仙侠",
  horror: "恐怖",
};

export default function ProjectCardGrid({ project, onDuplicate, onDelete, onFavorite, onRestore }: ProjectCardGridProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  const genreClass = GENRE_COLORS[project.genre] || "bg-white/5 text-slate-400 border-white/10";

  const handleClick = () => {
    router.push(`/upload?projectId=${project.id}`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(project);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.(project);
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRestore?.(project);
  };

  // Mock progress for demo
  const progress = project.status === "active" ? 45 : project.status === "completed" ? 100 : 0;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      onClick={handleClick}
      className="project-card glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all group"
      style={{
        animation: "fadeIn 0.5s ease forwards",
      }}
    >
      {/* 封面 */}
      <div className="aspect-[16/10] relative overflow-hidden">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : project.style && project.style !== "custom" && STYLE_IMAGES[project.style] ? (
          <img
            src={STYLE_IMAGES[project.style]}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-light flex items-center justify-center">
            <i className="fas fa-image text-slate-600 text-3xl" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* 顶部标签 */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-0.5 rounded-md ${genreClass} text-[10px] font-medium border`}>
            {GENRE_NAMES[project.genre] || project.genre}
          </span>
          <span className={`px-2 py-0.5 rounded-md ${status.bgLight} ${status.color} text-[10px] font-medium border`}>
            {status.label}
          </span>
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-xs transition-all hover:bg-black/60 ${
            project.isStarred ? "text-amber-400" : "text-white/50"
          }`}
        >
          <i className={`${project.isStarred ? "fas" : "far"} fa-star`} />
        </button>

        {/* 进度环 */}
        {project.status === "active" && (
          <div className="absolute bottom-3 right-3">
            <svg className="progress-ring w-10 h-10" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
                className="progress-ring-circle"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {progress}%
            </span>
          </div>
        )}

        {/* 悬浮操作 */}
        <div className="project-overlay absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="project-actions flex gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            {project.status === "trashed" ? (
              // 回收站中的项目显示恢复按钮
              <button
                onClick={handleRestore}
                className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all"
                title="恢复"
              >
                <i className="fas fa-trash-arrow-up text-xs" />
              </button>
            ) : (
              // 正常项目显示编辑、复制、删除按钮
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/projects/${project.id}?edit=true`);
                  }}
                  className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  title="编辑"
                >
                  <i className="fas fa-pen text-xs" />
                </button>
                <button
                  onClick={handleDuplicate}
                  className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  title="复制"
                >
                  <i className="fas fa-copy text-xs" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-rose-500/80 transition-all"
                  title="删除"
                >
                  <i className="fas fa-trash text-xs" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 信息 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-white truncate">{project.name}</h3>
          <span className="text-[10px] text-slate-500">刚刚</span>
        </div>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8">
          {project.description || "暂无描述"}
        </p>

        {/* 统计 */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <i className="fas fa-film text-slate-600 text-[10px]" />
            <span className="text-xs text-slate-400">0 集</span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-image text-slate-600 text-[10px]" />
            <span className="text-xs text-slate-400">0 分镜</span>
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-cube text-slate-600 text-[10px]" />
            <span className="text-xs text-slate-400">0 资产</span>
          </div>
        </div>

        {/* 模型配置 */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface/50 border border-white/5">
          <div className="flex -space-x-1.5">
            <div
              className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center"
              title={`LLM: ${project.llmModel}`}
            >
              <i className="fas fa-brain text-primary text-[7px]" />
            </div>
            <div
              className="w-5 h-5 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center"
              title={`文生图: ${project.t2iModel}`}
            >
              <i className="fas fa-image text-cyan text-[7px]" />
            </div>
            <div
              className="w-5 h-5 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center"
              title={`图生视频: ${project.i2vModel}`}
            >
              <i className="fas fa-video text-amber text-[7px]" />
            </div>
          </div>
          <span className="text-[10px] text-slate-500">
            {project.llmModel} · {project.t2iModel} · {project.i2vModel}
          </span>
        </div>
      </div>
    </div>
  );
}
