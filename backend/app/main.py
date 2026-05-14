# AI漫剧工厂 - FastAPI后端入口

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.novel.split import router as novel_split_router
from app.api.v1.assets.extract import router as assets_extract_router
from app.api.v1.assets.generate import router as assets_generate_router
from app.api.v1.models import router as models_router
from app.core.config import settings
from app.core.db import init_db

app = FastAPI(
    title=settings.APP_NAME,
    description="AI漫剧自动化生成平台后端服务",
    version=settings.VERSION,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(novel_split_router)
app.include_router(assets_extract_router)
app.include_router(assets_generate_router)
app.include_router(models_router)


@app.get("/")
async def root():
    return {"message": "AI漫剧工厂 API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """初始化数据库表"""
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")


# 运行命令: uvicorn app.main:app --reload --port 8000