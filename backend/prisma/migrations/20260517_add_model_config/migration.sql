-- Migration: add_model_config
-- Created: 2026-05-17
-- Description: Add ProviderMeta, ModelConfig, ModelConfigHistory tables for unified model configuration management

-- CreateTable
CREATE TABLE "ProviderMeta" (
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "protocol" TEXT NOT NULL DEFAULT 'custom',
    "authType" TEXT NOT NULL,
    "authLocation" TEXT NOT NULL,
    "authKeyName" TEXT NOT NULL,
    "serviceLine" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderMeta_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" SERIAL NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'custom',
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "env" TEXT NOT NULL DEFAULT 'prod',
    "status" TEXT NOT NULL DEFAULT 'offline',
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "retryTimes" INTEGER NOT NULL DEFAULT 3,
    "proxy" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "paramsSchema" JSONB NOT NULL,
    "customHeaders" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "grayRatio" INTEGER NOT NULL DEFAULT 0,
    "grayVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelConfigHistory" (
    "id" SERIAL NOT NULL,
    "modelId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "releasedBy" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelConfigHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModelConfig_modelId_key" ON "ModelConfig"("modelId");

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_provider_fkey" FOREIGN KEY ("provider") REFERENCES "ProviderMeta"("provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfigHistory" ADD CONSTRAINT "ModelConfigHistory_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelConfig"("modelId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default providers
INSERT INTO "ProviderMeta" ("provider", "name", "icon", "protocol", "authType", "authLocation", "authKeyName", "serviceLine", "description") VALUES
('aliyun', '阿里百炼', 'fa-cloud', 'dashscope', 'bearer', 'header', 'Authorization', 't2v|i2v|r2v|video_edit|video_extend|a2v|tts', '阿里云百炼平台'),
('volcengine_ark', '火山引擎方舟', 'fa-bolt', 'volcengine_ark', 'bearer', 'header', 'Authorization', 't2v|i2v|r2v|video_edit|video_extend|a2v|t2i', '火山引擎方舟平台'),
('comfyui', 'ComfyUI', 'fa-robot', 'comfyui', 'bearer', 'header', 'X-API-Key', 'comfyui', 'ComfyUI 工作流引擎'),
('siliconflow', '硅基流动', 'fa-microchip', 'openai', 'bearer', 'header', 'Authorization', 'llm', 'SiliconFlow OpenAI 兼容 API'),
('openai', 'OpenAI', 'fa-circle', 'openai', 'bearer', 'header', 'Authorization', 'llm', 'OpenAI API');