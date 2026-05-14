# Pydantic models for novel splitting

from pydantic import BaseModel, Field
from typing import Optional, List


class EpisodeResult(BaseModel):
    """单集分集结果"""
    orderIndex: int = Field(..., description="集序号")
    title: str = Field(..., description="集标题")
    summary: str = Field(..., description="集摘要")
    estimatedShots: int = Field(..., description="预估分镜数")
    chapters: List[str] = Field(..., description="章节列表")
    sceneDensity: float = Field(..., ge=0.0, le=1.0, description="情节密度 0-1")


class SplitStrategyConfig(BaseModel):
    """分集策略配置"""
    strategy: str = Field(..., description="策略类型: balanced, plot, character, custom")
    targetEpisodes: int = Field(default=0, description="目标集数，0表示自动")
    shotRangeMin: int = Field(default=8, ge=3, le=30, description="分镜数最小值")
    shotRangeMax: int = Field(default=14, ge=3, le=30, description="分镜数最大值")
    keepChapterIntegrity: bool = Field(default=True, description="保持章节完整性")
    specialFirstLast: bool = Field(default=True, description="首尾集特殊处理")
    preserveNarrative: bool = Field(default=False, description="保留插叙/倒叙结构")
    customPrompt: str = Field(default="", description="自定义提示词")


class LLMConfig(BaseModel):
    """LLM 模型配置（从项目设置中读取）"""
    provider: str = Field(..., description="LLM 提供商: deepseek, openai, anthropic")
    apiKey: str = Field(..., description="API Key")
    endpoint: str = Field(..., description="API Endpoint URL")
    modelName: str = Field(..., description="模型名称")


class SplitRequest(BaseModel):
    """分集请求"""
    fileId: str = Field(..., description="小说文件ID")
    projectId: Optional[str] = Field(None, description="项目ID（用于获取 LLM 配置）")
    strategy: str = Field(default="balanced", description="分集策略")
    targetEpisodes: int = Field(default=0, description="目标集数")
    shotRangeMin: int = Field(default=8, description="分镜数最小值")
    shotRangeMax: int = Field(default=14, description="分镜数最大值")
    keepChapterIntegrity: bool = Field(default=True)
    specialFirstLast: bool = Field(default=True)
    preserveNarrative: bool = Field(default=False)
    customPrompt: str = Field(default="", description="自定义策略的提示词")
    # LLM 配置（从前端传入，从项目设置中获取）
    llmProvider: Optional[str] = Field(None, description="LLM 提供商")
    llmApiKey: Optional[str] = Field(None, description="LLM API Key")
    llmEndpoint: Optional[str] = Field(None, description="LLM API Endpoint")
    llmModelName: Optional[str] = Field(None, description="LLM 模型名称")


class SplitResponse(BaseModel):
    """分集响应"""
    taskId: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态: processing, completed, failed")
    episodes: Optional[List[EpisodeResult]] = Field(default=None, description="分集结果列表")
    totalEpisodes: int = Field(default=0, description="总集数")
    strategy: str = Field(default="balanced", description="使用的策略")
    generatedAt: Optional[str] = Field(default=None, description="生成时间")
    error: Optional[dict] = Field(default=None, description="错误信息")


class SplitResultQuery(BaseModel):
    """分集结果查询响应"""
    taskId: str
    fileId: Optional[str] = None
    status: str
    episodes: Optional[List[EpisodeResult]] = None
    totalEpisodes: int = 0
    strategy: str = "balanced"
    generatedAt: Optional[str] = None
    error: Optional[dict] = None