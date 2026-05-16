# AI 漫剧项目 - 完整部署指南

## 项目概述

AI 驱动的漫画视频生成平台，支持：
- 小说解析
- AI 分镜生成
- 图片生成（Stable Diffusion）
- 视频合成

## 技术架构

| 组件 | 技术 | 端口 |
|------|------|------|
| 前端 | Next.js + React + TypeScript | 3000 |
| 后端 | FastAPI + Python | 8000 |
| 数据库 | PostgreSQL 16 | 5432 |
| 对象存储 | MinIO (S3兼容) | 9000/9001 |
| 缓存 | Redis | 6379 |

---

## 第一步：准备环境

### 1.1 安装必要软件

```bash
# Windows
# 安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
# 安装 Node.js 18+: https://nodejs.org/
# 安装 Python 3.10+: https://www.python.org/

# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3.10 python3-pip
```

### 1.2 验证安装

```bash
docker --version
node --version  # 需要 >= 18
python --version  # 需要 >= 3.10
pip --version
```

---

## 第二步：获取项目代码

```bash
git clone https://github.com/yaolongfei0403/ai-manju-0427.git
cd ai-manju-0427
```

如果尚未克隆，使用当前目录内容。

---

## 第三步：启动基础服务（Docker）

### 3.1 创建 docker-compose.yml（如不存在）

在项目根目录创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ai-manhua-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: ai_manhua
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: ai-manhua-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### 3.2 启动服务

```bash
# 在项目根目录执行
docker-compose up -d

# 验证服务状态
docker ps
```

应该看到 `postgres` 和 `minio` 两个容器正在运行。

### 3.3 配置 MinIO（Web UI）

1. 打开 http://localhost:9001
2. 用户名: `minioadmin`
3. 密码: `minioadmin123`
4. 创建 bucket: `ai-manhua-assets`

---

## 第四步：配置后端

### 4.1 进入后端目录

```bash
cd backend
```

### 4.2 配置环境变量

创建 `.env` 文件：

```env
# 数据库
DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/ai_manhua

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# MinIO (对象存储)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=ai-manhua-assets

# LLM 配置 (Story 3-4 使用)
LLM_PROVIDER=deepseek
LLM_API_KEY=your_deepseek_api_key_here
LLM_API_URL=https://api.deepseek.com/v1
LLM_MODEL_NAME=deepseek-chat

# 阿里云百炼 API（可选，用于图片生成）
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

### 4.3 安装 Python 依赖

```bash
# 建议使用虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 4.4 初始化数据库

```bash
# 安装 Prisma 客户端（如需要）
pip install prisma

# 运行数据库迁移
npx prisma migrate dev --name init
# 或
prisma migrate dev --name init
```

### 4.5 启动后端服务

```bash
# 开发模式（自动重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

后端启动后访问：http://localhost:8000/docs 查看 API 文档

---

## 第五步：配置前端

### 5.1 进入前端目录

```bash
cd ../frontend  # 或新的终端窗口
```

### 5.2 配置环境变量

创建或编辑 `.env` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5.3 安装依赖

```bash
npm install
```

### 5.4 启动前端服务

```bash
# 开发模式
npm run dev

# 或生产构建
npm run build
npm start
```

前端启动后访问：http://localhost:3000

---

## 第六步：验证部署

### 6.1 检查服务状态

```bash
# 检查 Docker 容器
docker ps

# 检查后端 API
curl http://localhost:8000/docs

# 检查前端
curl http://localhost:3000
```

### 6.2 访问应用

1. 打开浏览器访问 http://localhost:3000
2. 应该能看到 AI 漫剧工厂界面
3. 登录后可以访问模型配置等功能

---

## 常见问题排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker logs ai-manhua-postgres

# 测试连接
psql -h localhost -U postgres -d ai_manhua
```

### MinIO 连接失败

```bash
# 检查 MinIO 日志
docker logs ai-manhua-minio

# 访问控制台 http://localhost:9001 检查 bucket
```

### 前端无法连接后端

1. 检查后端是否在 8000 端口运行
2. 检查 `.env` 中的 `NEXT_PUBLIC_API_URL`
3. 检查防火墙设置

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# 杀死占用进程
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

---

## 一键启动脚本

创建 `start-all.sh`（Linux/Mac）或 `start-all.bat`（Windows）：

### start-all.sh (Linux/Mac)

```bash
#!/bin/bash

# 启动 Docker 服务
docker-compose up -d

# 等待服务就绪
echo "等待服务启动..."
sleep 5

# 启动后端
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
cd ../frontend
npm run dev &

echo "所有服务已启动!"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:8000"
echo "MinIO: http://localhost:9001"

# 等待退出
wait
```

### start-all.bat (Windows)

```batch
@echo off
echo 启动 AI 漫剧项目服务...

echo 启动 Docker 服务...
docker-compose up -d

echo 等待服务启动...
timeout /t 10

echo 启动后端服务...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000"

echo 启动前端服务...
start cmd /k "cd frontend && npm run dev"

echo 服务已启动!
echo 前端: http://localhost:3000
echo 后端: http://localhost:8000
echo MinIO: http://localhost:9001
```

---

## 生产环境部署建议

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 使用 PM2 管理进程（后端）

```bash
pip install pm2
pm2 start uvicorn --name "ai-manhua-backend" -- app.main:app --host 0.0.0.0 --port 8000
pm2 save
pm2 startup
```

### 使用 Docker Compose 完整部署

更新 `docker-compose.yml` 加入后端和前端：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ai-manhua-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: ai_manhua
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: ai-manhua-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  backend:
    build: ./backend
    container_name: ai-manhua-backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/ai_manhua
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin123
      MINIO_BUCKET: ai-manhua-assets
    depends_on:
      - postgres
      - minio

volumes:
  postgres_data:
  minio_data:
```

---

## 环境变量速查表

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接串 | postgresql://postgres:postgres123@127.0.0.1:5432/ai_manhua |
| REDIS_URL | Redis 连接串 | redis://localhost:6379 |
| JWT_SECRET | JWT 密钥 | 自定义（生产环境必须修改）|
| MINIO_ENDPOINT | MinIO 地址 | localhost:9000 |
| MINIO_ACCESS_KEY | MinIO 用户名 | minioadmin |
| MINIO_SECRET_KEY | MinIO 密码 | minioadmin123 |
| MINIO_BUCKET | 存储桶名 | ai-manhua-assets |
| LLM_API_KEY | DeepSeek API Key | - |

---

## 联系方式

如遇问题，请检查：
1. Docker 日志: `docker logs <container-name>`
2. 后端日志: 检查启动终端输出
3. 前端日志: 浏览器开发者工具 Console