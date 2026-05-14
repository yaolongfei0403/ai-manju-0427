"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login, register } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth";

// 星空背景组件
function Starfield() {
  const [stars, setStars] = useState<Array<{ id: number; left: number; top: number; duration: number; delay: number; size: number }>>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 5,
      size: 1 + Math.random() * 2,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// 左侧品牌面板
function BrandPanel() {
  const features = [
    { icon: "fa-bolt", title: "AI 智能分镜", desc: "自动拆分小说为专业分镜脚本", color: "text-indigo-400" },
    { icon: "fa-wand-magic-sparkles", title: "一键生成画面", desc: "文生图 + 参考图注入，风格统一", color: "text-purple-400" },
    { icon: "fa-clapperboard", title: "图生视频", desc: "静态分镜一键转为动态漫剧", color: "text-pink-400" },
    { icon: "fa-users", title: "资产共享", desc: "角色场景道具，全项目复用", color: "text-cyan-400" },
  ];

  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)" }}>
      <Starfield />

      {/* 装饰粒子 */}
      <div className="absolute w-64 h-64 top-20 left-20 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
      <div className="absolute w-48 h-48 bottom-32 right-20 rounded-full blur-3xl opacity-15 animate-pulse" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)", animationDelay: "-3s" }} />
      <div className="absolute w-32 h-32 top-1/2 left-1/3 rounded-full blur-2xl opacity-10 animate-pulse" style={{ background: "radial-gradient(circle, #ec4899, transparent)", animationDelay: "-2s" }} />

      {/* 内容 */}
      <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 w-full">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 40px rgba(99, 102, 241, 0.4)" }}
          >
            <i className="fas fa-film text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AI漫剧工厂</h1>
            <p className="text-xs text-slate-400 mt-0.5 tracking-widest uppercase">AI Comic Drama Factory</p>
          </div>
        </div>

        {/* 主标语 */}
        <div className="mb-10">
          <p className="text-xl text-slate-300 leading-relaxed font-light">
            制作一部漫剧<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-semibold">只需要一杯咖啡的时间</span>
          </p>
        </div>

        {/* 特性列表 */}
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-4 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-all">
                <i className={`fas ${feature.icon} ${feature.color} text-sm`} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{feature.title}</div>
                <div className="text-xs text-slate-500">{feature.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部数据 */}
        <div className="mt-12 flex gap-8">
          <div>
            <div className="text-2xl font-bold text-white">10万+</div>
            <div className="text-xs text-slate-500">已生成漫剧</div>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <div className="text-2xl font-bold text-white">50万+</div>
            <div className="text-xs text-slate-500">分镜画面</div>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <div className="text-2xl font-bold text-white">98%</div>
            <div className="text-xs text-slate-500">用户满意度</div>
          </div>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)" }} />
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginStore = useAuthStore();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // 读取 URL 参数设置初始标签
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "register") {
      setActiveTab("register");
    }
  }, [searchParams]);

  // 登录状态
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // 注册状态
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgreed, setRegAgreed] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // 验证
  const validateUsername = (value: string): string | null => {
    if (value.length < 3) return "用户名至少3位";
    if (value.length > 20) return "用户名最多20位";
    if (!/^[a-zA-Z0-9]+$/.test(value)) return "用户名需为字母数字";
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (value.length < 6) return "密码至少6位";
    return null;
  };

  const loginUsernameError = validateUsername(loginUsername);
  const loginPasswordError = validatePassword(loginPassword);
  const regUsernameError = validateUsername(regUsername);
  const regPasswordError = validatePassword(regPassword);

  const canLogin = loginUsername.length > 0 && loginPassword.length > 0 && !loginUsernameError && !loginPasswordError;
  const canRegister = regUsername.length > 0 && regPassword.length > 0 && regAgreed && !regUsernameError && !regPasswordError && regPassword === regConfirmPassword;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const usernameValidationError = validateUsername(loginUsername);
    const passwordValidationError = validatePassword(loginPassword);

    if (usernameValidationError || passwordValidationError) {
      setLoginError(usernameValidationError || passwordValidationError || "输入验证失败");
      return;
    }

    setLoginLoading(true);

    try {
      const response = await login({ username: loginUsername, password: loginPassword });
      loginStore.login(response.user, response.token);
      // 使用 window.location 强制跳转以确保 cookie 被发送
      window.location.href = "/projects";
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "登录失败，请稍后重试");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    const usernameValidationError = validateUsername(regUsername);
    const passwordValidationError = validatePassword(regPassword);

    if (usernameValidationError || passwordValidationError) {
      setRegError(usernameValidationError || passwordValidationError || "输入验证失败");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("两次输入的密码不一致");
      return;
    }

    if (!regAgreed) {
      setRegError("请先阅读并同意用户协议");
      return;
    }

    setRegLoading(true);

    try {
      const response = await register({ username: regUsername, password: regPassword });
      loginStore.login(response.user, response.token);
      // 使用 window.location 强制跳转以确保 cookie 被发送
      window.location.href = "/projects";
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "注册失败，请稍后重试");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center relative" style={{ background: "#020617" }}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(99, 102, 241, 0.05)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl" style={{ background: "rgba(139, 92, 246, 0.05)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-8">
        {/* 移动端 Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)" }}
          >
            <i className="fas fa-film text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI漫剧工厂</h1>
            <p className="text-[10px] text-slate-500">制作一部漫剧只需要一杯咖啡的时间</p>
          </div>
        </div>

        {/* 登录/注册 Tab */}
        <div className="flex mb-8 border-b border-white/10 relative">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 pb-3 text-sm font-medium transition-all relative ${activeTab === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            登录
            {activeTab === "login" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 pb-3 text-sm font-medium transition-all relative ${activeTab === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
          >
            注册账号
            {activeTab === "register" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
            )}
          </button>
        </div>

        {/* 登录表单 */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                用户名
              </Label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  id="login-username"
                  type="text"
                  placeholder="请输入用户名"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${loginUsernameError && loginUsername.length > 0 ? "border-red-500" : "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"}`}
                  style={{ background: "rgba(30,41,59,0.5)" }}
                />
              </div>
              {loginUsernameError && loginUsername.length > 0 && (
                <p className="text-red-400 text-sm">{loginUsernameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                密码
              </Label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full pl-11 pr-11 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${loginPasswordError && loginPassword.length > 0 ? "border-red-500" : "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"}`}
                  style={{ background: "rgba(30,41,59,0.5)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <i className={`fas ${showLoginPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              {loginPasswordError && loginPassword.length > 0 && (
                <p className="text-red-400 text-sm">{loginPasswordError}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border border-white/20 bg-transparent cursor-pointer transition-all appearance-none checked:bg-indigo-500 checked:border-indigo-500 relative"
                  style={{}}
                />
                <span className="text-xs text-slate-400">记住我</span>
              </label>
              <a href="#" className="text-xs text-indigo-400 hover:text-white transition-colors">忘记密码？</a>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={!canLogin || loginLoading}
              className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <span className="btn-shine" />
              {loginLoading ? "登录中..." : "登录"}
            </button>
          </form>
        )}

        {/* 注册表单 */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reg-username" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                用户名
              </Label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  id="reg-username"
                  type="text"
                  placeholder="3-20位字母数字"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${regUsernameError && regUsername.length > 0 ? "border-red-500" : "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"}`}
                  style={{ background: "rgba(30,41,59,0.5)" }}
                  maxLength={20}
                />
              </div>
              {regUsernameError && regUsername.length > 0 && (
                <p className="text-red-400 text-sm">{regUsernameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                设置密码
              </Label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  placeholder="至少6位"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={`w-full pl-11 pr-11 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${regPasswordError && regPassword.length > 0 ? "border-red-500" : "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"}`}
                  style={{ background: "rgba(30,41,59,0.5)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <i className={`fas ${showRegPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              {regPasswordError && regPassword.length > 0 && (
                <p className="text-red-400 text-sm">{regPasswordError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-confirm-password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                确认密码
              </Label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  id="reg-confirm-password"
                  type={showRegPassword ? "text" : "password"}
                  placeholder="再次输入密码"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none ${regConfirmPassword && regPassword !== regConfirmPassword ? "border-red-500" : "focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"}`}
                  style={{ background: "rgba(30,41,59,0.5)" }}
                />
              </div>
              {regConfirmPassword && regPassword !== regConfirmPassword && (
                <p className="text-red-400 text-sm">两次输入的密码不一致</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                id="agreement"
                type="checkbox"
                checked={regAgreed}
                onChange={(e) => setRegAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border border-white/20 bg-transparent cursor-pointer transition-all appearance-none checked:bg-indigo-500 checked:border-indigo-500 relative"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                我已阅读并同意 <a href="#" className="text-indigo-400 hover:text-white transition-colors">用户协议</a> 和 <a href="#" className="text-indigo-400 hover:text-white transition-colors">隐私政策</a>
              </span>
            </div>

            {regError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={!canRegister || regLoading}
              className="btn-primary w-full text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <span className="btn-shine" />
              {regLoading ? "注册中..." : "注册账号"}
            </button>
          </form>
        )}

        {/* 分隔线 */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }} />
          <span className="text-xs text-slate-500">或使用以下方式</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }} />
        </div>

        {/* 第三方登录 */}
        <div className="grid grid-cols-3 gap-3">
          <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm">
            <i className="fab fa-weixin text-lg" />
            <span className="hidden sm:inline">微信</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm">
            <i className="fab fa-qq text-lg" />
            <span className="hidden sm:inline">QQ</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm">
            <i className="fab fa-github text-lg" />
            <span className="hidden sm:inline">GitHub</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#020617" }}><div className="text-white">加载中...</div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
