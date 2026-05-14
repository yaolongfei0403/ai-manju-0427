"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import StepNav from "@/components/layout/StepNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (_hasHydrated && !checkAuth()) {
      router.push("/login");
    }
  }, [_hasHydrated, checkAuth, router]);

  const showStepNav = pathname?.startsWith("/upload");

  // Wait for hydration before checking auth
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darker">
        <div className="text-white">验证中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-darker flex flex-col">

      {/* 顶部导航 - 固定在顶部 */}
      <header className="h-16 glass-panel-strong border-b border-white/5 flex items-center justify-between px-5 md:px-6 z-50 fixed top-0 left-0 right-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
            <i className="fas fa-film text-white text-lg" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white tracking-tight">AI漫剧生成工作台</h1>
            <p className="text-xs text-slate-400 hidden sm:block">小说上传与资产提取 · 七步流程</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="w-9 h-9 rounded-lg bg-surface border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/15 transition-all flex-shrink-0">
            <i className="fas fa-cog" />
          </button>
          <UserAvatar />
        </div>
      </header>

      {/* 导航链接 - 固定在顶部 */}
      <nav className="hidden md:flex items-center gap-1 px-5 md:px-6 py-2 border-b border-white/5 bg-surface/60 fixed top-16 z-40 left-0 right-0 backdrop-blur-md">
        <a href="/projects" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
          <i className="fas fa-folder mr-1.5"></i>项目
        </a>
        <a href="/projects/new" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
          <i className="fas fa-plus mr-1.5"></i>创建
        </a>
        <a href="/upload" className="px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25 text-sm font-medium">
          <i className="fas fa-upload mr-1.5"></i>小说上传
        </a>
        <a href="#" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
          <i className="fas fa-list mr-1.5"></i>分集
        </a>
        <a href="#" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
          <i className="fas fa-video mr-1.5"></i>视频
        </a>
        {user?.role === "admin" && (
          <a href="/models/config" className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
            <i className="fas fa-robot mr-1.5"></i>模型
          </a>
        )}
      </nav>

      {/* 步骤导航 - 7步（仅上传流程显示） */}
      {showStepNav && <StepNav />}

      {/* Main Content - 滚动区域，StepNav固定但内容从这里开始 */}
      <main className={`flex-1 overflow-y-auto ${showStepNav ? "pt-[184px] md:pt-[192px]" : "pt-[112px]"}`}>
        {children}
      </main>
    </div>
  );
}

function UserAvatar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="relative group">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-primary/25 cursor-pointer">
        {user?.username?.charAt(0).toUpperCase() || "Y"}
      </div>

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-white/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-3 border-b border-white/10">
          <div className="text-sm font-medium text-white">{user?.username || "用户"}</div>
          <div className="text-xs text-slate-400">{user?.role || "user"}</div>
        </div>
        <div className="p-2">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <i className="fas fa-sign-out-alt mr-2" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
