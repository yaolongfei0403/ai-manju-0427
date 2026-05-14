"use client";

import { useRouter } from "next/navigation";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title = "还没有项目",
  description = "创建你的第一个漫剧吧",
  actionLabel = "创建项目",
  actionHref = "/projects/new",
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-surface/50 border border-white/5 flex items-center justify-center mb-6">
        <i className="fas fa-folder-open text-slate-500 text-3xl" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>

      {/* Action */}
      <button
        onClick={() => router.push(actionHref)}
        className="mt-6 px-6 py-3 rounded-xl text-white font-medium generate-btn flex items-center gap-2"
      >
        <i className="fas fa-plus" />
        {actionLabel}
      </button>
    </div>
  );
}
