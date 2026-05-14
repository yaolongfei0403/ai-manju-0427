// Auth Store - Zustand with Cookie sync

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

export interface User {
  id: string;
  username: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });

        // 同时设置 cookie 供 middleware 使用
        if (typeof document !== "undefined") {
          document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        // 清除 cookie
        if (typeof document !== "undefined") {
          document.cookie = "auth_token=; path=/; max-age=0";
        }
      },

      checkAuth: () => {
        const { token, user } = get();
        if (!token || !user) {
          return false;
        }

        // 检查 token 是否过期
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const now = Math.floor(Date.now() / 1000);

          // 如果 token 已过期，清除状态
          if (payload.exp && payload.exp < now) {
            get().logout();
            return false;
          }

          return true;
        } catch {
          return false;
        }
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ─── Axios 401 Interceptor ─────────────────────────────────────────────────
// 全局 axios 拦截器：所有 API 返回 401 时跳转登录页
// 只在客户端生效，服务端 (SSR) 不需要
// 在 store 创建之后注册，这样 getState() 可以正常调用
if (typeof window !== "undefined") {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 清除本地 auth 状态
        const { logout } = useAuthStore.getState();
        logout();
        // 跳转登录页，保留当前路径
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
      return Promise.reject(error);
    }
  );
}
