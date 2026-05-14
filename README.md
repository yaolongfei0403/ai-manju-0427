# AI 漫剧项目

AI 驱动的漫画视频生成平台，支持小说解析、AI 分镜、图片生成、视频合成等功能。

## 技术栈

- **后端**: FastAPI + Prisma + PostgreSQL
- **前端**: Next.js + TypeScript + TailwindCSS
- **AI 模型**: 阿里云百炼 (通义千问、Stable Diffusion、视频合成)

## 项目结构

```
├── backend/          # FastAPI 后端服务
├── frontend/         # Next.js 前端应用
├── docs/             # 项目文档
├── model/            # 模型配置
├── scripts/          # 工具脚本
└── docker-compose.yml
```

## 快速部署

### 环境要求

- Docker & Docker Compose
- Node.js 18+
- Python 3.10+

### 1. 克隆项目

```bash
git clone https://github.com/yaolongfei0403/ai-manju-0427.git
cd ai-manju-0427
```

### 2. 配置后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入您的阿里云 API Key
```

### 3. 启动服务

```bash
# 使用 Docker 启动所有服务
docker-compose up -d

# 或手动启动
# 后端
cd backend
pip install -r requirements.txt
prisma migrate dev
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

### 4. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

## 配置说明

### 阿里云 API Key

在后端 `.env` 文件中配置：

```
DASHSCOPE_API_KEY=您的阿里云百炼API Key
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | postgres://postgres:postgres@localhost:5432/aimanju |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key | - |

## 开发

```bash
# 后端开发
cd backend
uvicorn app.main:app --reload --port 8000

# 前端开发
cd frontend
npm run dev

# 运行测试
cd backend
pytest
```

## 许可证

MIT License