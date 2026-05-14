// 认证API客户端

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface RegisterData {
  username: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await axios.post<{ data: AuthResponse } | { error: ApiError }>(
    `/api/v1/auth/register`,
    data
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await axios.post<{ data: AuthResponse } | { error: ApiError }>(
    `/api/v1/auth/login`,
    data
  );

  if ("error" in response.data) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}
