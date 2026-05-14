// Next.js Middleware - 认证保护

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const secret = new TextEncoder().encode(JWT_SECRET);

// 需要登录才能访问的路由
const protectedRoutes = ["/projects", "/upload", "/assets", "/user"];

// 认证相关的路由（已登录用户访问会跳转到首页）
const authRoutes = ["/login", "/register"];

async function isValidToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只从专门的 auth_token cookie 读取 token
  const authCookie = request.cookies.get("auth_token")?.value;
  const token = authCookie;

  // 验证 token 有效性（检查是否存在且未过期）
  const hasValidToken = token ? await isValidToken(token) : false;

  // 检查是否是受保护路由
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 检查是否是认证路由
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // 如果访问受保护路由但没有有效 token，跳转登录页
  if (isProtectedRoute && !hasValidToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 如果已登录用户访问登录/注册页，跳转首页
  if (isAuthRoute && hasValidToken) {
    const redirectUrl = new URL("/projects", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
