// 用户登录 API Route - Real PostgreSQL database

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证必填字段
    if (!username || !password) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "用户名或密码错误" } },
        { status: 400 }
      );
    }

    // 查询用户
    const users = await query<{
      id: string;
      username: string;
      password: string;
      role: string;
      status: string;
    }>("SELECT id, username, password, role, status FROM \"User\" WHERE username = $1", [
      username,
    ]);

    const user = users[0];

    // 用户不存在或密码不匹配，统一返回相同错误（安全考虑）
    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "用户名或密码错误" } },
        { status: 400 }
      );
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "用户名或密码错误" } },
        { status: 400 }
      );
    }

    // 检查用户状态
    if (user.status !== "active") {
      return NextResponse.json(
        { error: { code: "ACCOUNT_DISABLED", message: "账户已被禁用" } },
        { status: 403 }
      );
    }

    // 生成JWT token
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
