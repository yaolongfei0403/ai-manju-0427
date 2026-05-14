"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/project";
import { useAuthStore } from "@/stores/auth";
import { Project, duplicateProject, restoreProject, toggleFavorite } from "@/lib/api/projects";
import ProjectCardGrid from "@/components/features/projects/ProjectCardGrid";
import ConfirmDialog from "@/components/ui/confirm-dialog";

type FilterTab = "all" | "processing" | "completed" | "draft" | "trashed" | "starred";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, isLoading, error, fetchProjects } = useProjectStore();
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dialog state
  const [duplicateDialog, setDuplicateDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [restoreDialog, setRestoreDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    // Wait for auth hydration before fetching projects
    if (_hasHydrated) {
      const token = useAuthStore.getState().token;
      console.log("[Projects] Fetching projects, token:", token ? "present" : "MISSING");
      fetchProjects();
    }
  }, [_hasHydrated, fetchProjects]);

  // Filter projects based on tab and search
  const filteredProjects = projects.filter((project) => {
    if (filterTab === "processing" && project.status !== "active") return false;
    if (filterTab === "completed" && project.status !== "completed") return false;
    if (filterTab === "draft" && project.status !== "draft") return false;
    if (filterTab === "trashed" && project.status !== "trashed") return false;
    if (filterTab === "starred" && !project.isStarred) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleCreateProject = () => {
    router.push("/projects/new");
  };

  const handleDuplicate = async () => {
    if (!duplicateDialog.project) return;

    setActionLoading(true);
    try {
      await duplicateProject(duplicateDialog.project.id);
      await fetchProjects();
      setDuplicateDialog({ open: false, project: null });
      showToast("项目复制成功", "success");
    } catch (error) {
      console.error("Duplicate failed:", error);
      showToast("复制失败", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.project) return;

    setActionLoading(true);
    try {
      await restoreProject(restoreDialog.project.id);
      await fetchProjects();
      setRestoreDialog({ open: false, project: null });
      showToast("项目已恢复", "success");
    } catch (error) {
      console.error("Restore failed:", error);
      showToast("恢复失败", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFavorite = async (project: Project) => {
    const wasStarred = project.isStarred;

    // Optimistic update - immediately update local state
    const { projects: currentProjects, fetchProjects: doFetch } = useProjectStore.getState();
    const updatedProjects = currentProjects.map(p =>
      p.id === project.id ? { ...p, isStarred: !wasStarred } : p
    );
    useProjectStore.setState({ projects: updatedProjects });

    try {
      await toggleFavorite(project.id);
      showToast(wasStarred ? "已取消收藏" : "已收藏", "success");
    } catch (error) {
      // Rollback on error
      useProjectStore.setState({ projects: currentProjects });
      console.error("Favorite failed:", error);
      showToast("收藏失败", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.project) return;

    setActionLoading(true);
    try {
      // Move to trash by updating status
      const { updateProject } = await import("@/lib/api/projects");
      await updateProject(deleteDialog.project.id, { status: "trashed" });
      await fetchProjects();
      setDeleteDialog({ open: false, project: null });
      showToast("已移到回收站", "success");
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("删除失败", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 左侧边栏 */}
      <aside
        className={`glass-panel border-r border-white/5 flex flex-col z-30 transition-all duration-300 ${
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        }`}
      >
        <div className="p-4">
          <button
            onClick={handleCreateProject}
            className="generate-btn w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
          >
            <i className="fas fa-plus" />
            创建新项目
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => setFilterTab("all")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filterTab === "all"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <i className="fas fa-folder-open w-5 text-center" />
            全部项目
            <span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-500">
              {projects.length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab("processing")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filterTab === "processing"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <i className="fas fa-clock w-5 text-center" />
            进行中
            <span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-500">
              {projects.filter((p) => p.status === "active").length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab("starred")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filterTab === "starred"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <i className="fas fa-star w-5 text-center" />
            收藏项目
            <span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-500">
              {projects.filter((p) => p.isStarred).length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab("completed")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filterTab === "completed"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <i className="fas fa-check-circle w-5 text-center" />
            已完成
            <span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-500">
              {projects.filter((p) => p.status === "completed").length}
            </span>
          </button>
          <button
            onClick={() => setFilterTab("trashed")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              filterTab === "trashed"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <i className="fas fa-trash w-5 text-center" />
            回收站
            <span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full text-slate-500">
              {projects.filter((p) => p.status === "trashed").length}
            </span>
          </button>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface/50 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Admin</div>
              <div className="text-[10px] text-slate-500">专业版会员</div>
            </div>
            <button className="text-slate-500 hover:text-white transition-colors">
              <i className="fas fa-ellipsis-vertical" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0 bg-darker/50 overflow-hidden">
        {/* 工具栏 - 简化版 */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 glass-panel">
          {/* 左侧：移动端菜单按钮 + 搜索 */}
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <i className="fas fa-bars" />
            </button>

            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                type="text"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input w-full pl-9 pr-4 py-2 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* 右侧：视图切换 */}
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-white/5">
              <button
                onClick={() => setViewMode("grid")}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all ${
                  viewMode === "grid"
                    ? "bg-white/5 text-white"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <i className="fas fa-grid-2" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all ${
                  viewMode === "list"
                    ? "bg-white/5 text-white"
                    : "text-slate-500 hover:text-white"
                }`}
              >
                <i className="fas fa-list" />
              </button>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-slate-400">
                <i className="fas fa-circle-notch fa-spin text-primary text-xl" />
                <span>加载中...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                <i className="fas fa-exclamation-triangle text-rose-400 text-2xl" />
              </div>
              <p className="text-rose-400 text-sm">{error}</p>
              <button
                onClick={() => fetchProjects()}
                className="mt-4 px-4 py-2 rounded-lg bg-surface border border-white/10 text-slate-400 text-sm hover:text-white transition-all"
              >
                重试
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="empty-state w-20 h-20 rounded-2xl bg-surface border border-white/5 flex items-center justify-center mb-4">
                <i className="fas fa-folder-open text-slate-600 text-3xl" />
              </div>
              {searchQuery || filterTab !== "all" ? (
                <>
                  <p className="text-sm text-slate-500 mb-1">没有找到项目</p>
                  <p className="text-xs text-slate-600">尝试更换筛选条件或搜索关键词</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 mb-1">还没有项目</p>
                  <p className="text-xs text-slate-600">创建你的第一个漫剧吧</p>
                  <button
                    onClick={handleCreateProject}
                    className="mt-6 px-6 py-3 rounded-xl text-white font-medium generate-btn flex items-center gap-2"
                  >
                    <i className="fas fa-plus" />
                    创建项目
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProjects.map((project, idx) => (
                <div
                  key={project.id}
                  style={{
                    animationDelay: `${(idx % 6) * 0.05}s`,
                  }}
                  className="fade-in"
                >
                  <ProjectCardGrid
                    project={project}
                    onDuplicate={(p) => setDuplicateDialog({ open: true, project: p })}
                    onDelete={(p) => setDeleteDialog({ open: true, project: p })}
                    onRestore={(p) => setRestoreDialog({ open: true, project: p })}
                    onFavorite={handleFavorite}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 复制确认弹窗 */}
      <ConfirmDialog
        isOpen={duplicateDialog.open}
        title="复制项目"
        message={`确定要复制项目「${duplicateDialog.project?.name}」吗？复制后将成为一个新项目。`}
        confirmLabel="复制"
        onConfirm={handleDuplicate}
        onCancel={() => setDuplicateDialog({ open: false, project: null })}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        title="删除项目"
        message={`确定要删除项目「${deleteDialog.project?.name}」吗？删除后可从回收站恢复。`}
        confirmLabel="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, project: null })}
      />

      {/* 恢复确认弹窗 */}
      <ConfirmDialog
        isOpen={restoreDialog.open}
        title="恢复项目"
        message={`确定要恢复项目「${restoreDialog.project?.name}」吗？恢复后将重新显示在列表中。`}
        confirmLabel="恢复"
        onConfirm={handleRestore}
        onCancel={() => setRestoreDialog({ open: false, project: null })}
      />

      {/* Toast 提示 */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <i className={`fas ${toast.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`} />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
