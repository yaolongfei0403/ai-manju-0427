# Novel Splitting API Route

from fastapi import APIRouter, HTTPException
from typing import Optional
import uuid
import json
from datetime import datetime

from app.models.split import (
    SplitRequest,
    SplitResponse,
    SplitResultQuery,
    EpisodeResult
)
from app.services.llm_service import create_llm_service
from app.core.config import settings
from app.core.db import get_db_cursor

router = APIRouter(prefix="/api/v1/novel", tags=["novel"])


def _get_llm_service(request: SplitRequest):
    """根据请求中的 LLM 配置创建 LLM 服务"""
    # 优先使用请求中的 LLM 配置（从项目设置中获取）
    if request.llmProvider and request.llmApiKey and request.llmEndpoint and request.llmModelName:
        return create_llm_service(
            provider=request.llmProvider,
            api_key=request.llmApiKey,
            endpoint=request.llmEndpoint,
            model_name=request.llmModelName
        )

    # 回退到配置文件中的默认设置
    if not settings.LLM_API_KEY:
        raise ValueError("LLM_API_KEY 未配置，请在 .env 文件中设置或确保请求中包含完整的 LLM 配置")

    return create_llm_service(
        provider=settings.LLM_PROVIDER,
        api_key=settings.LLM_API_KEY,
        endpoint=settings.LLM_API_URL,
        model_name=settings.LLM_MODEL_NAME
    )


@router.post("/split", response_model=SplitResponse)
async def split_novel(request: SplitRequest):
    """
    触发小说分集拆分任务

    请求体包含分集策略参数和 LLM 配置（从项目设置中读取），
    后端会：
    1. 获取小说文本（暂从配置读取，后续从数据库/存储获取）
    2. 调用 LLM 分析（使用请求中的 llmProvider, llmApiKey 等）
    3. 返回结构化分集结果
    """
    try:
        # 生成任务ID
        task_id = f"split_{uuid.uuid4().hex[:16]}"

        # 获取 LLM 服务
        try:
            llm = _get_llm_service(request)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=str(e))

        # 调用 LLM 服务获取分集结果
        try:
            # 优先使用真实小说文件，否则使用 demo 文本
            novel_text = _get_novel_text_for_file(request.fileId) or _get_novel_text_for_demo()
            result = await llm.split_novel(
                novel_text=novel_text,
                strategy=request.strategy,
                target_episodes=request.targetEpisodes,
                shot_range_min=request.shotRangeMin,
                shot_range_max=request.shotRangeMax,
                keep_chapter_integrity=request.keepChapterIntegrity,
                special_first_last=request.specialFirstLast,
                preserve_narrative=request.preserveNarrative,
                custom_prompt=request.customPrompt
            )

            # 构建响应
            episodes = [
                EpisodeResult(
                    orderIndex=ep["orderIndex"],
                    title=ep["title"],
                    summary=ep["summary"],
                    estimatedShots=ep["estimatedShots"],
                    chapters=ep["chapters"],
                    sceneDensity=ep["sceneDensity"]
                )
                for ep in result.get("episodes", [])
            ]

            response = SplitResponse(
                taskId=task_id,
                status="completed",
                episodes=episodes,
                totalEpisodes=result.get("totalEpisodes", len(episodes)),
                strategy=request.strategy,
                generatedAt=datetime.utcnow().isoformat() + "Z"
            )

            # 保存到数据库
            _save_split_result(task_id, request.fileId, response)

            return response

        except Exception as e:
            # LLM 调用失败
            raise HTTPException(status_code=500, detail=f"分集失败: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


@router.get("/split/{task_id}", response_model=SplitResultQuery)
async def get_split_result(task_id: str):
    """
    查询分集任务结果

    Args:
        task_id: 任务ID（由 /api/v1/novel/split 返回）
    """
    task_data = _get_split_result(task_id)
    if not task_data:
        raise HTTPException(status_code=404, detail="任务不存在或已过期")
    return SplitResultQuery(**task_data)


def _save_split_result(task_id: str, file_id: str, response: SplitResponse):
    """保存分集结果到数据库"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                INSERT INTO split_results (task_id, file_id, status, episodes, total_episodes, strategy, generated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (task_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    episodes = EXCLUDED.episodes,
                    total_episodes = EXCLUDED.total_episodes,
                    strategy = EXCLUDED.strategy,
                    generated_at = EXCLUDED.generated_at,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                task_id,
                file_id,
                response.status,
                json.dumps([ep.model_dump() for ep in response.episodes]) if response.episodes else None,
                response.totalEpisodes,
                response.strategy,
                response.generatedAt
            ))
    except Exception as e:
        # Log but don't fail if DB save fails
        print(f"Warning: Failed to save split result to DB: {e}")


def _get_split_result(task_id: str) -> Optional[dict]:
    """从数据库获取分集结果"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT task_id, file_id, status, episodes, total_episodes, strategy, generated_at
                FROM split_results
                WHERE task_id = %s
            """, (task_id,))
            row = cursor.fetchone()
            if row:
                episodes = row['episodes']
                if isinstance(episodes, str):
                    episodes = json.loads(episodes)
                return {
                    "taskId": row['task_id'],
                    "fileId": row['file_id'],
                    "status": row['status'],
                    "episodes": episodes,
                    "totalEpisodes": row['total_episodes'],
                    "strategy": row['strategy'],
                    "generatedAt": row['generated_at'].isoformat() if row['generated_at'] else None
                }
            return None
    except Exception as e:
        print(f"Warning: Failed to get split result from DB: {e}")
        return None


def _get_novel_text_for_file(file_id: str) -> Optional[str]:
    """根据file_id从数据库获取小说文件路径，并读取真实内容"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute('SELECT path FROM "NovelFile" WHERE id = %s', (file_id,))
            row = cursor.fetchone()
            if row and row.get('path'):
                file_path = row['path']
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return f.read()
                except Exception as e:
                    print(f"Warning: Failed to read novel file {file_path}: {e}")
                    return None
            return None
    except Exception as e:
        print(f"Warning: Failed to get novel file path: {e}")
        return None


def _get_novel_text_for_demo() -> str:
    """
    获取用于演示的小说文本（当真实文件读取失败时使用）

    TODO: 生产环境应从数据库或对象存储读取真实小说内容
    这里返回一个演示用的小说片段
    """
    return """第一章 觉醒

清晨的阳光透过窗帘的缝隙洒在张凡的脸上，他缓缓睁开眼睛。

"这是哪里？"张凡揉了揉眼睛，环顾四周。陌生的天花板，陌生的房间，陌生的一切。

他记得自己明明是在公司加班，怎么突然来到了这里？

张凡坐起身来，发现床边放着一本古旧的书籍，封面上写着"九天真经"四个金色大字。

他好奇地拿起那本书，刚一触碰，一道金光顿时从他手中爆发出来，直接没入了他的眉心。

"啊！"张凡痛苦地捂住脑袋，无数信息如潮水般涌入他的脑海。

良久之后，张凡终于平静下来。他的眼神变得深邃而神秘，仿佛换了一个人。

"原来如此..."张凡喃喃自语，"这是仙侠世界，而我，竟然是这方世界的天命之人！"

第二章 传承

张凡开始研读那本九天真经。每一页都蕴含着深奥的修炼法门，每一个字都仿佛在诉说着天地间的奥秘。

随着修炼的深入，张凡逐渐感受到体内有一股气流在流转。那股气流越来越强，在他的经脉中奔腾不息。

"这...这就是灵气吗？"张凡激动不已。他终于踏入了修炼的门槛，成为了一名真正的修士。

与此同时，外面的世界也在发生着变化。附近的村民们发现，每到夜晚，山上就会发出奇异的光芒。

"听说张家的那个小子得到了仙人传承！"
"真的假的？"
"当然是真的！我亲眼看见那道金光冲天而起！"

消息很快传遍了整个小镇，引起了各方的关注。

第三章 风波

一个月后。

张凡的修为已经突破了练气期，达到了筑基初期的境界。这个速度在整个修仙界都是罕见的。

然而，修为的快速提升也带来了麻烦。

这一日，村里突然来了一群不速之客。他们身穿黑衣，气势汹汹，一看就不是善茬。

"张凡在哪里？把他交出来！"为首的黑衣人高声喊道。

村长连忙上前交涉："诸位好汉，不知找张凡有何贵干？"

"哼，这小子得到了不该得到的东西。我们奉命来取回。"黑衣人冷笑道。

就在这时，张凡从屋里走了出来。他的眼神平静，气息沉稳，面对这群来势汹汹的敌人丝毫没有畏惧。

"你们想要九天真经？"张凡淡淡地问道。

"小子，你最好识相一点。把东西交出来，我们可以饶你一命。"黑衣人威胁道。

张凡摇了摇头："九天真经已经与我融为一体，你们拿不走的。"

"找死！"黑衣人怒吼一声，抬手就是一掌拍向张凡。

张凡不慌不忙，轻轻抬手，一道剑气从他指尖射出，直接将那黑衣人击飞出去。

"筑基期！"其他黑衣人大惊失色，"这小子是筑基期修士！"

他们不敢再逗留，连忙带着受伤的同伴逃走了。

张凡望着他们离去的背影，眼神中闪过一丝忧虑。

"看来，我的身份已经藏不住了..."他喃喃道。

第四章 成长

黑衣人事件之后，张凡知道自己不能再留在村子里了。

他拜别了村长和乡亲们，踏上了寻找更高深修炼之法的道路。

一路上，张凡历经艰辛。他穿越了茫茫沙漠，攀登了巍峨雪山，深入了幽暗森林。

每一次险境都让他成长，每一次磨难都让他更强。

在一次探险中，张凡误入了一处上古遗迹。在那里，他获得了一柄神剑——"斩天剑"。

这柄剑蕴含着无穷的力量，能够斩断天地间一切束缚。

有了斩天剑的帮助，张凡的修为突飞猛进，很快就突破了金丹期。

第五章 奇遇

这一日，张凡来到了一座神秘的山谷。

山谷中弥漫着淡淡的雾气，仿佛有仙气在流转。张凡感受到一股强大的吸引力。

他顺着那股感觉走去，发现山谷深处有一座古老的洞府。

洞府大门上刻着四个大字："天机阁"。

张凡轻轻推开门走了进去。里面别有洞天，空间之大超乎想象。

在洞府的最深处，他发现了一本泛着金光的书卷。

"这是..."张凡激动地走近一看，只见书卷上写着"天机诀"三个字。

天机诀，传说中是天界仙人留下的修炼法门，能够窥探天机，预知未来。

张凡毫不犹豫地开始修炼天机诀。随着修炼的深入，他的眼界越来越开阔，对天道的理解也越来越深。

与此同时，他也逐渐发现了一个惊天的秘密...

（未完待续）"""