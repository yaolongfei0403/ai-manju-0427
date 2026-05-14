// 用户注册 API Route - Real PostgreSQL database

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, execute } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "ai-manhua-dev-secret-key-2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证用户名格式：3-20位字母数字
    if (!username || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: { code: "INVALID_USERNAME", message: "用户名需为3-20位字母数字" } },
        { status: 400 }
      );
    }

    // 验证密码：至少6位
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: { code: "PASSWORD_TOO_SHORT", message: "密码至少6位" } },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await query<{ id: string }>(
      "SELECT id FROM \"User\" WHERE username = $1",
      [username]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: { code: "USERNAME_EXISTS", message: "用户名已被占用" } },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const result = await execute(
      `INSERT INTO "User" (id, username, password, role, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        hashedPassword,
        "user",
        "active",
      ]
    );

    // 重新查询获取创建的用户
    const users = await query<{
      id: string;
      username: string;
      role: string;
      status: string;
    }>(
      "SELECT id, username, role, status FROM \"User\" WHERE username = $1",
      [username]
    );

    const user = users[0];

    // 生成JWT token
    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return NextResponse.json(
      {
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status,
          },
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "服务器内部错误" } },
      { status: 500 }
    );
  }
}
