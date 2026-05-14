import os, json
os.environ.setdefault('PYTHONPATH', '.')
from app.core.db import get_db_cursor
from app.services.llm_service import create_llm_service

with get_db_cursor() as cursor:
    cursor.execute('SELECT id FROM "Project" LIMIT 1')
    proj = cursor.fetchone()
    pid = proj['id']

from app.api.v1.assets.extract import _get_llm_config_by_project
config = _get_llm_config_by_project(pid)
print(f"Config: {config}")

llm = create_llm_service(config['provider'], config['api_key'], config['endpoint'], config['model_name'])

_POLISH_SYSTEM_PROMPT = """你是一个专业的漫剧资产图像生成提示词优化助手。你的任务是对用户提供的原始提示词进行专业润色，使其更适合 AI 图像生成。

## 润色要求
1. 保持原始提示词的核心描述和创意
2. 增加专业图像生成修饰词（如：8K超高清，详细光影，辛烷渲染，电影级画面质量，专业摄影棚灯光，动态姿态，电影级构图，戏剧性光线等）
3. 优化提示词结构和表达方式
4. 保持语言简洁专业
5. 根据资产类型有所侧重：
   - 角色：强调面部特写、服装细节、姿态表情
   - 场景：强调环境氛围、光线效果、景深
   - 道具：强调材质质感、细节特写、产品摄影风格

## 输出要求
只返回润色后的提示词，不要其他解释，不要加引号或前缀，直接输出纯文本。"""

import asyncio
async def test():
    try:
        content = await llm._call_llm([
            {"role": "system", "content": _POLISH_SYSTEM_PROMPT},
            {"role": "user", "content": f"""请润色以下角色的图像生成提示词：

【原始提示词】
一个勇敢的战士

请输出润色后的提示词，直接返回纯文本，不要其他内容。"""}
        ])
        print(f"Polish result: {content}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback; traceback.print_exc()

asyncio.run(test())