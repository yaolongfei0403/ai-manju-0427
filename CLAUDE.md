# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI漫剧工厂 (AI Comic Factory) - An AI-driven comic video generation platform that supports novel parsing, AI storyboarding, image generation, and video synthesis.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + TypeScript + TailwindCSS v4 + shadcn/ui |
| Backend | FastAPI (Python) + Prisma ORM |
| Database | PostgreSQL 16 (port 5432) |
| Object Storage | MinIO S3-compatible (port 9000/9001) |
| AI Services | Alibaba DashScope (Qwen, Stable Diffusion) + DeepSeek LLM |

## Commands

### Frontend (port 3000)
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run vitest unit tests
npm run test:run # Run tests once
```

### Backend (port 8000)
```bash
cd backend
uvicorn app.main:app --reload --port 8000  # Development with auto-reload
pip install -r requirements.txt            # Install dependencies
prisma migrate dev --name init             # Run database migrations
```

### Docker Services
```bash
docker-compose up -d    # Start postgres and minio
docker ps               # Check running containers
```

## Architecture

### Backend Structure (`backend/app/`)
```
app/
├── main.py           # FastAPI entry point, registers all routers
├── api/v1/           # API version 1 routes
│   ├── novel/split.py      # Novel parsing/splitting endpoints
│   ├── assets/             # Asset extraction and generation
│   └── models.py           # Model configuration endpoints
├── services/         # Business logic
│   ├── llm_service.py       # LLM integration (DeepSeek, OpenAI)
│   └── t2i_service.py       # Text-to-image service (DashScope)
└── core/
    ├── config.py    # Settings via pydantic-settings
    └── db.py        # Database initialization
```

### Frontend Structure (`frontend/src/`)
- Route groups: `(auth)` for authentication pages, `(main)` for dashboard
- `src/lib/api/` - API client utilities
- `src/lib/db.ts` - Prisma client singleton
- `src/app/(main)/models/` - Model configuration pages

### Database Schema
- Prisma schema at `backend/prisma/schema.prisma`
- Frontend also has Prisma client at `frontend/src/lib/db.ts`

## Key API Endpoints

- `POST /api/v1/novel/split` - Parse and split novel into scenes
- `POST /api/v1/assets/extract` - Extract assets from novel
- `POST /api/v1/assets/generate` - Generate images via AI
- `GET/POST /api/v1/models` - Model configuration CRUD

## Environment Variables

Backend `.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `DASHSCOPE_API_KEY` - Alibaba DashScope API key for image generation
- `LLM_API_KEY` - DeepSeek API key for LLM
- `LLM_PROVIDER` - "deepseek" or "openai"
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` - Object storage

Frontend `.env`:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)