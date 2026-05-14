# AI漫剧工厂 - FastAPI 后端配置

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "AI漫剧工厂 API"
    VERSION: str = "0.1.0"
    DEBUG: bool = True

    # 数据库配置
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_manhua"

    # Redis 配置 (用于 BullMQ)
    REDIS_URL: str = "redis://localhost:6379"

    # LLM 提供商配置 (支持 deepseek, openai, anthropic)
    LLM_PROVIDER: str = "deepseek"  # 默认使用 deepseek
    LLM_API_KEY: Optional[str] = None
    LLM_API_URL: str = "https://api.deepseek.com/v1"
    LLM_MODEL_NAME: str = "deepseek-chat"

    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # JWT 配置
    JWT_SECRET: str = "ai-manhua-dev-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()