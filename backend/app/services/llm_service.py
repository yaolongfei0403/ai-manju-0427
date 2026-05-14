# DeepSeek LLM Service for novel splitting

import json
import httpx
from typing import Optional, Dict, Any, Literal
from ..core.config import settings


class BaseLLMService:
    """LLM 服务基类"""

    def __init__(self, api_key: str, endpoint: str, model_name: str):
        self.api_key = api_key
        self.endpoint = endpoint
        self.model_name = model_name

    async def split_novel(self, novel_text: str, strategy: str, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError

    async def extract_assets(self, novel_text: str, **kwargs) -> Dict[str, Any]:
        """从小说文本中提取资产（角色、场景、道具）"""
        raise NotImplementedError

    async def _call_llm(self, messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
        raise NotImplementedError


class DeepSeekLLMService(BaseLLMService):
    """DeepSeek LLM 服务"""

    async def split_novel(
        self,
        novel_text: str,
        strategy: str = "balanced",
        target_episodes: int = 0,
        shot_range_min: int = 8,
        shot_range_max: int = 14,
        keep_chapter_integrity: bool = True,
        special_first_last: bool = True,
        preserve_narrative: bool = False,
        custom_prompt: str = ""
    ) -> Dict[str, Any]:
        """调用 DeepSeek LLM 分析小说并生成分集"""
        system_prompt = self._build_system_prompt(
            strategy, target_episodes, shot_range_min, shot_range_max,
            keep_chapter_integrity, special_first_last, preserve_narrative, custom_prompt
        )
        user_prompt = self._build_user_prompt(novel_text, strategy)
        content = await self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        return json.loads(content)

    async def extract_assets(self, novel_text: str, **kwargs) -> Dict[str, Any]:
        """从小说文本中提取资产（角色、场景、道具）"""
        system_prompt = self._build_asset_extraction_system_prompt()
        user_prompt = self._build_asset_extraction_user_prompt(novel_text)
        content = await self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        return json.loads(content)

    def _build_asset_extraction_system_prompt(self) -> str:
        return """你是一个专业的漫剧资产分析助手，负责从小说文本中提取有价值的视觉资产。

## 你的任务
分析用户提供的小说文本，提取以下三类资产：
1. **角色 (character)**: 故事中的主要人物，包括外貌特征、服饰风格、性格特点
2. **场景 (scene)**: 故事发生的主要场景，包括环境描述、氛围特点
3. **道具 (prop)**: 故事中的重要物品，包括外观描述、功能作用

## 提取原则
1. 角色：提取具有独特外貌或性格特征的角色（主要角色必须提取，配角可选）
2. 场景：提取具有视觉特色或推动剧情发展的场景
3. 道具：提取对剧情有重要作用或具有象征意义的物品

## 输出格式
请以 JSON 格式返回，包含以下结构：
{
  "characters": [
    {
      "name": "角色名称",
      "prompt": "用于图像生成的详细描述，包含外貌、服饰、姿态等",
      "description": "角色在故事中的定位和特点"
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "prompt": "用于图像生成的场景描述，包含环境、光线、氛围等",
      "description": "场景在故事中的作用"
    }
  ],
  "props": [
    {
      "name": "道具名称",
      "prompt": "用于图像生成的道具描述，包含外观、特色等",
      "description": "道具在故事中的意义"
    }
  ]
}

请直接返回 JSON，不要包含其他解释。"""

    def _build_asset_extraction_user_prompt(self, novel_text: str) -> str:
        text_preview = novel_text[:15000] if len(novel_text) > 15000 else novel_text
        return f"""请分析以下小说文本，提取其中的角色、场景和道具：

【小说文本开始】
{text_preview}
【小说文本结束】

请根据以上内容提取资产。确保每个资产都有详细的描述，便于后续图像生成。"""

    async def _call_llm(self, messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
        import httpx
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    self.endpoint,
                    headers=headers,
                    json=payload
                )
        except httpx.ReadTimeout:
            raise Exception(f"DeepSeek API ReadTimeout: 请求超时（300s），请检查网络或增加超时时间")
        except httpx.ConnectError as e:
            raise Exception(f"DeepSeek API ConnectError: 无法连接到 {self.endpoint}，请检查 API 地址是否正确")
        except httpx.HTTPError as e:
            raise Exception(f"DeepSeek API HTTPError: {type(e).__name__} - {e}")
        if response.status_code != 200:
            raise Exception(f"DeepSeek API 调用失败: {response.status_code} - {response.text}")
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        if content is None:
            raise ValueError("DeepSeek returned null content")
        content = content.strip()
        if not content:
            raise ValueError("DeepSeek returned empty content")
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def _build_system_prompt(self, strategy, target_episodes, shot_range_min, shot_range_max,
                           keep_chapter_integrity, special_first_last, preserve_narrative, custom_prompt) -> str:
        strategy_descriptions = {
            "balanced": "智能均衡策略：自动平衡章节完整性与情节节奏，适合大多数小说",
            "plot": "情节驱动策略：以高潮、转折点和悬念为边界拆分，增强追剧吸引力",
            "character": "角色驱动策略：以角色出场、成长和关系变化为边界，适合群像剧",
            "custom": "自定义策略：根据用户提供的提示词定制分集"
        }
        strategy_desc = strategy_descriptions.get(strategy, strategy_descriptions["balanced"])

        system_prompt = f"""你是一个专业的小说结构分析助手，负责将长篇小说拆分为适合漫剧改编的分集大纲。

## 你的任务
分析用户提供的小说文本，按照指定的策略将其拆分为结构化的分集方案。

## 分集策略
{strategy_desc}

## 分集要求
1. 目标集数: {'自动（根据小说长度和情节密度智能计算）' if target_episodes == 0 else f'{target_episodes}集'}
2. 分镜数范围: 每集 {shot_range_min}-{shot_range_max} 个分镜
3. 保持章节完整性: {'是' if keep_chapter_integrity else '否'} - 避免同一章节被拆分到两集
4. 首尾集特殊处理: {'是' if special_first_last else '否'} - 首集铺垫、尾集收尾或留悬念
5. 保留插叙/倒叙结构: {'是' if preserve_narrative else '否'}

"""
        if custom_prompt:
            system_prompt += f"## 自定义要求\n{custom_prompt}\n"

        system_prompt += """## 输出格式
请以 JSON 格式返回分集结果，包含以下字段：
- episodes: 分集列表，每集包含:
  - orderIndex: 集序号 (从1开始)
  - title: 集标题（如：第1集：缘起）
  - summary: 集摘要（50-100字）
  - estimatedShots: 预估分镜数
  - chapters: 章节列表（如：["第一章 觉醒", "第二章 传承"]）
  - sceneDensity: 情节密度 (0-1)，0.9以上为高潮集
- totalEpisodes: 总集数
- strategy: 使用的策略名称

## 分集原则
1. 每集应该有独立的主题和情节点
2. 集与集之间应该有逻辑衔接
3. 高潮点应该分布在不同集，避免集中在某几集
4. 开篇（前1-2集）应该设置钩子吸引观众
5. 中段应该有转折和高潮
6. 结尾应该留有悬念或完成主要情节收尾

## 情节密度说明
- 1.0: 最高潮（重大战斗、情感爆发、重大揭露）
- 0.8-0.9: 高能（紧张对峙、惊险逃生、重大决定）
- 0.6-0.7: 平稳（日常发展、情感铺垫、背景交代）
- 0.3-0.5: 低密度（过渡、铺垫、伏笔）

请直接返回 JSON，不要包含其他解释。"""
        return system_prompt

    def _build_user_prompt(self, novel_text: str, strategy: str) -> str:
        text_preview = novel_text[:10000] if len(novel_text) > 10000 else novel_text
        return f"""请分析以下小说文本，按照{strategy}策略拆分为分集：

【小说文本开始】
{text_preview}
【小说文本结束】

请根据以上内容生成分集方案。确保每集有明确的标题和摘要。"""


class OpenAILLMService(BaseLLMService):
    """OpenAI LLM 服务 (GPT-4o)"""

    async def split_novel(self, novel_text: str, strategy: str = "balanced", **kwargs) -> Dict[str, Any]:
        system_prompt = self._build_system_prompt(strategy)
        user_prompt = self._build_user_prompt(novel_text, strategy)
        content = await self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        return json.loads(content)

    async def extract_assets(self, novel_text: str, **kwargs) -> Dict[str, Any]:
        """从小说文本中提取资产（角色、场景、道具）"""
        system_prompt = self._build_asset_extraction_system_prompt()
        user_prompt = self._build_asset_extraction_user_prompt(novel_text)
        content = await self._call_llm([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])
        return json.loads(content)

    def _build_asset_extraction_system_prompt(self) -> str:
        return """你是一个专业的漫剧资产分析助手，负责从小说文本中提取有价值的视觉资产。

## 你的任务
分析用户提供的小说文本，提取以下三类资产：
1. **角色 (character)**: 故事中的主要人物，包括外貌特征、服饰风格、性格特点
2. **场景 (scene)**: 故事发生的主要场景，包括环境描述、氛围特点
3. **道具 (prop)**: 故事中的重要物品，包括外观描述、功能作用

## 提取原则
1. 角色：提取具有独特外貌或性格特征的角色（主要角色必须提取，配角可选）
2. 场景：提取具有视觉特色或推动剧情发展的场景
3. 道具：提取对剧情有重要作用或具有象征意义的物品

## 输出格式
请以 JSON 格式返回，包含以下结构：
{
  "characters": [
    {
      "name": "角色名称",
      "prompt": "用于图像生成的详细描述，包含外貌、服饰、姿态等",
      "description": "角色在故事中的定位和特点"
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "prompt": "用于图像生成的场景描述，包含环境、光线、氛围等",
      "description": "场景在故事中的作用"
    }
  ],
  "props": [
    {
      "name": "道具名称",
      "prompt": "用于图像生成的道具描述，包含外观、特色等",
      "description": "道具在故事中的意义"
    }
  ]
}

请直接返回 JSON，不要包含其他解释。"""

    def _build_asset_extraction_user_prompt(self, novel_text: str) -> str:
        text_preview = novel_text[:15000] if len(novel_text) > 15000 else novel_text
        return f"""请分析以下小说文本，提取其中的角色、场景和道具：

【小说文本开始】
{text_preview}
【小说文本结束】

请根据以上内容提取资产。确保每个资产都有详细的描述，便于后续图像生成。"""

    async def _call_llm(self, messages: list, temperature: float = 0.7, max_tokens: int = 4000) -> str:
        import httpx
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    self.endpoint,
                    headers=headers,
                    json=payload
                )
        except httpx.ReadTimeout:
            raise Exception(f"OpenAI API ReadTimeout: 请求超时（300s），请检查网络或增加超时时间")
        except httpx.ConnectError as e:
            raise Exception(f"OpenAI API ConnectError: 无法连接到 {self.endpoint}，请检查 API 地址是否正确")
        except httpx.HTTPError as e:
            raise Exception(f"OpenAI API HTTPError: {type(e).__name__} - {e}")
        if response.status_code != 200:
            raise Exception(f"OpenAI API 调用失败: {response.status_code} - {response.text}")
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def _build_system_prompt(self, strategy: str) -> str:
        return f"""你是一个专业的小说结构分析助手，负责将长篇小说拆分为适合漫剧改编的分集大纲。

分析用户提供的小说文本，按照指定的策略将其拆分为结构化的分集方案。

策略: {strategy}

请以 JSON 格式返回分集结果：
{{
  "episodes": [
    {{
      "orderIndex": 1,
      "title": "第1集：标题",
      "summary": "集摘要（50-100字）",
      "estimatedShots": 预估分镜数,
      "chapters": ["章节1", "章节2"],
      "sceneDensity": 0.0-1.0之间的情节密度值
    }}
  ],
  "totalEpisodes": 总集数,
  "strategy": "使用的策略名称"
}}"""

    def _build_user_prompt(self, novel_text: str, strategy: str) -> str:
        text_preview = novel_text[:10000] if len(novel_text) > 10000 else novel_text
        return f"""分析以下小说文本，按照{strategy}策略拆分为分集：

【小说文本开始】
{text_preview}
【小说文本结束】"""


class AnthropicLLMService(BaseLLMService):
    """Anthropic LLM 服务 (Claude)"""

    async def split_novel(self, novel_text: str, strategy: str = "balanced", **kwargs) -> Dict[str, Any]:
        system_prompt = self._build_system_prompt(strategy)
        user_prompt = self._build_user_prompt(novel_text, strategy)
        content = await self._call_llm(system_prompt, user_prompt)
        return json.loads(content)

    async def extract_assets(self, novel_text: str, **kwargs) -> Dict[str, Any]:
        """从小说文本中提取资产（角色、场景、道具）"""
        system_prompt = self._build_asset_extraction_system_prompt()
        user_prompt = self._build_asset_extraction_user_prompt(novel_text)
        content = await self._call_llm(system_prompt, user_prompt)
        return json.loads(content)

    def _build_asset_extraction_system_prompt(self) -> str:
        return """你是一个专业的漫剧资产分析助手，负责从小说文本中提取有价值的视觉资产。

## 你的任务
分析用户提供的小说文本，提取以下三类资产：
1. **角色 (character)**: 故事中的主要人物，包括外貌特征、服饰风格、性格特点
2. **场景 (scene)**: 故事发生的主要场景，包括环境描述、氛围特点
3. **道具 (prop)**: 故事中的重要物品，包括外观描述、功能作用

## 提取原则
1. 角色：提取具有独特外貌或性格特征的角色（主要角色必须提取，配角可选）
2. 场景：提取具有视觉特色或推动剧情发展的场景
3. 道具：提取对剧情有重要作用或具有象征意义的物品

## 输出格式
请以 JSON 格式返回，包含以下结构：
{
  "characters": [
    {
      "name": "角色名称",
      "prompt": "用于图像生成的详细描述，包含外貌、服饰、姿态等",
      "description": "角色在故事中的定位和特点"
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "prompt": "用于图像生成的场景描述，包含环境、光线、氛围等",
      "description": "场景在故事中的作用"
    }
  ],
  "props": [
    {
      "name": "道具名称",
      "prompt": "用于图像生成的道具描述，包含外观、特色等",
      "description": "道具在故事中的意义"
    }
  ]
}

请直接返回 JSON，不要包含其他解释。"""

    def _build_asset_extraction_user_prompt(self, novel_text: str) -> str:
        text_preview = novel_text[:15000] if len(novel_text) > 15000 else novel_text
        return f"""请分析以下小说文本，提取其中的角色、场景和道具：

【小说文本开始】
{text_preview}
【小说文本结束】

请根据以上内容提取资产。确保每个资产都有详细的描述，便于后续图像生成。"""

    async def _call_llm(self, system: str, user: str, max_tokens: int = 4000) -> str:
        import httpx
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [
                {"role": "user", "content": user}
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    self.endpoint,
                    headers=headers,
                    json=payload
                )
        except httpx.ReadTimeout:
            raise Exception(f"Anthropic API ReadTimeout: 请求超时（300s），请检查网络或增加超时时间")
        except httpx.ConnectError as e:
            raise Exception(f"Anthropic API ConnectError: 无法连接到 {self.endpoint}，请检查 API 地址是否正确")
        except httpx.HTTPError as e:
            raise Exception(f"Anthropic API HTTPError: {type(e).__name__} - {e}")
        if response.status_code != 200:
            raise Exception(f"Anthropic API 调用失败: {response.status_code} - {response.text}")
        result = response.json()
        content = result["content"][0]["text"]
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        return content.strip()

    def _build_system_prompt(self, strategy: str) -> str:
        return f"""你是一个专业的小说结构分析助手，负责将长篇小说拆分为适合漫剧改编的分集大纲。

分析用户提供的小说文本，按照{strategy}策略拆分为结构化的分集方案。

请以JSON格式返回结果。"""

    def _build_user_prompt(self, novel_text: str, strategy: str) -> str:
        text_preview = novel_text[:10000] if len(novel_text) > 10000 else novel_text
        return f"""分析以下小说文本，按照{strategy}策略拆分为分集：

【小说文本开始】
{text_preview}
【小说文本结束】

直接返回JSON，不要其他内容。"""


def create_llm_service(provider: str, api_key: str, endpoint: str, model_name: str) -> BaseLLMService:
    """工厂函数：根据 provider 创建对应的 LLM 服务"""
    # Map provider names to service classes
    # OpenAI-compatible providers (siliconflow, etc.) use OpenAI format
    openai_compatible = ["openai", "siliconflow", "deepseek"]
    anthropic_compatible = ["anthropic"]
    # 日志
    print(f"[create_llm_service] Creating LLM service for provider: {provider}")
    provider_lower = provider.lower()

    if provider_lower in anthropic_compatible:
        service_class = AnthropicLLMService
    elif provider_lower in openai_compatible:
        service_class = OpenAILLMService
    else:
        # Default to OpenAI-compatible for unknown providers (common for Chinese LLM APIs)
        service_class = OpenAILLMService

    return service_class(api_key, endpoint, model_name)