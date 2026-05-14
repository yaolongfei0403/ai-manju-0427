"use client";

import { useRouter } from "next/navigation";
import { Project } from "@/lib/api/projects";

interface ProjectCardProps {
  project: Project;
  viewMode?: "grid" | "list";
}

// Status names mapping
const STATUS_NAMES: Record<string, string> = {
  draft: "草稿",
  active: "进行中",
  completed: "已完成",
  trashed: "已删除",
};

// Genre names mapping
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

export default function ProjectCard({ project, viewMode = "grid" }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  if (viewMode === "list") {
    return (
      <div
        onClick={handleClick}
        className="glass-panel rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all group"
      >
        {/* Cover thumbnail */}
        <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-surface to-surface-light flex items-center justify-center flex-shrink-0 overflow-hidden">
          {project.coverUrl ? (
            <img
              src={project.coverUrl}
              alt={project.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <i className="fas fa-image text-slate-500 text-lg" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {GENRE_NAMES[project.genre] || project.genre} · {project.style}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-md text-[10px] font-medium ${
              project.status === "active"
                ? "bg-emerald-500/15 text-emerald-400"
                : project.status === "completed"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-slate-500/15 text-slate-400"
            }`}
          >
            {STATUS_NAMES[project.status] || project.status}
          </span>
        </div>

        {/* Arrow */}
        <div className="text-slate-500 group-hover:text-primary transition-colors">
          <i className="fas fa-chevron-right text-xs" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all group"
    >
      {/* Cover */}
      <div className="aspect-video bg-gradient-to-br from-surface to-surface-light relative overflow-hidden">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-surface/80 flex items-center justify-center">
              <i className="fas fa-image text-slate-500 text-lg" />
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-sm ${
              project.status === "active"
                ? "bg-emerald-500/80 text-emerald-100"
                : project.status === "completed"
                ? "bg-blue-500/80 text-blue-100"
                : "bg-slate-500/80 text-slate-100"
            }`}
          >
            {STATUS_NAMES[project.status] || project.status}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">
          {project.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {GENRE_NAMES[project.genre] || project.genre} · {project.style}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
          <span>
            <i className="fas fa-layer-group mr-1" />
            0 集
          </span>
          <span>
            <i className="fas fa-clone mr-1" />
            0 镜
          </span>
        </div>
      </div>
    </div>
  );
}
