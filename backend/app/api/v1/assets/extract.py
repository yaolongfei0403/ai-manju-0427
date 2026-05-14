# Asset Extract API Router
# POST /api/v1/assets/extract - Trigger asset extraction
# GET /api/v1/assets/extract/{task_id} - Poll extraction progress

import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.llm_service import create_llm_service
from app.core.db import get_db_cursor

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

# In-memory task storage (in production, use Redis or database)
# Structure: {task_id: {"status": "processing"|"completed"|"failed", "progress": 0-100, "result": {...}, "error": None}}
tasks: Dict[str, Dict[str, Any]] = {}

# ─── Database table initialization ────────────────────────────────────────────

def init_asset_tables():
    """Create asset-related tables if they don't exist."""
    with get_db_cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "Asset" (
                id          VARCHAR(64) PRIMARY KEY,
                "projectId" VARCHAR(64) NOT NULL,
                name        VARCHAR(256) NOT NULL,
                type        VARCHAR(32) NOT NULL,
                prompt      TEXT,
                description TEXT,
                "imageUrl"  VARCHAR(512),
                status      VARCHAR(32) DEFAULT 'pending',
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "AssetEpisode" (
                id          VARCHAR(64) PRIMARY KEY,
                "assetId"   VARCHAR(64) NOT NULL,
                "episodeId" VARCHAR(64) NOT NULL,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS "idx_Asset_projectId" ON "Asset"("projectId")
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS "idx_AssetEpisode_assetId" ON "AssetEpisode"("assetId")
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS "idx_AssetEpisode_episodeId" ON "AssetEpisode"("episodeId")
        """)
    print("[init_asset_tables] Asset tables ready")

# ─── List / Query Assets ───────────────────────────────────────────────────────

class AssetItem(BaseModel):
    id: str
    name: str
    type: str
    prompt: Optional[str] = ""
    description: Optional[str] = ""
    imageUrl: Optional[str] = None
    projectId: str
    episodeIds: List[str] = []
    createdAt: str


class ListAssetResponse(BaseModel):
    projectId: str
    characters: List[AssetItem]
    scenes: List[AssetItem]
    props: List[AssetItem]
    totalCharacters: int
    totalScenes: int
    totalProps: int


@router.get("", response_model=ListAssetResponse)
async def list_project_assets(projectId: str):
    """
    查询项目下所有资产，按类型分组返回。
    用于进入提取页时检查是否已有历史资产，避免重复提取。
    """
    init_asset_tables()  # ensure table exists

    assets: Dict[str, List[AssetItem]] = {
        "characters": [],
        "scenes": [],
        "props": [],
    }

    type_map_db_to_key = {
        "character": "characters",
        "scene": "scenes",
        "prop": "props",
    }

    with get_db_cursor() as cursor:
        # Query all assets for project
        cursor.execute(
            """
            SELECT id, name, type, prompt, description, "imageUrl", "projectId", "createdAt"
            FROM "Asset"
            WHERE "projectId" = %s
            ORDER BY "createdAt" ASC
            """,
            (projectId,)
        )
        rows = cursor.fetchall()

        for row in rows:
            asset_type = row.get("type", "")
            key = type_map_db_to_key.get(asset_type)
            if not key:
                continue

            # Load episode IDs for this asset
            cursor.execute(
                """
                SELECT "episodeId" FROM "AssetEpisode"
                WHERE "assetId" = %s
                """,
                (row["id"],)
            )
            episode_rows = cursor.fetchall()
            episode_ids = [ep["episodeId"] for ep in episode_rows]

            assets[key].append(AssetItem(
                id=row["id"],
                name=row.get("name", ""),
                type=asset_type,
                prompt=row.get("prompt") or "",
                description=row.get("description") or "",
                imageUrl=row.get("imageUrl"),
                projectId=row.get("projectId", projectId),
                episodeIds=episode_ids,
                createdAt=row.get("createdAt", "").isoformat() if hasattr(row.get("createdAt"), "isoformat") else str(row.get("createdAt", "")),
            ))

    return ListAssetResponse(
        projectId=projectId,
        characters=assets["characters"],
        scenes=assets["scenes"],
        props=assets["props"],
        totalCharacters=len(assets["characters"]),
        totalScenes=len(assets["scenes"]),
        totalProps=len(assets["props"]),
    )


# Default LLM config (fallback when no config provided)
DEFAULT_LLM_CONFIG = {
    "provider": "deepseek",
    "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
    "endpoint": "https://api.deepseek.com/v1",
    "model_name": "deepseek-chat",
}

# File storage base path
FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")


def _check_existing_assets(project_id: str) -> Optional[Dict[str, Any]]:
    """
    检查项目是否已有提取过的资产。
    有则返回 {taskId, status, progress, result} 结构（用于直接跳过提取）；
    无则返回 None。
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, type, prompt, description, "imageUrl", "createdAt"
                FROM "Asset"
                WHERE "projectId" = %s
                ORDER BY "createdAt" ASC
                """,
                (project_id,)
            )
            rows = cursor.fetchall()
            print(f"[_check_existing_assets] Queried {len(rows)} assets for project {project_id}")
    except Exception as e:
        print(f"[_check_existing_assets] DB query failed: {e}")
        return None

    if not rows:
        return None

    # 按类型分组
    characters, scenes, props = [], [], []
    type_map = {"character": characters, "scene": scenes, "prop": props}
    for row in rows:
        key = type_map.get(row.get("type"))
        if key is not None:
            key.append({
                "id": row["id"],
                "name": row.get("name", ""),
                "type": row.get("type", ""),
                "prompt": row.get("prompt") or "",
                "description": row.get("description") or "",
                "imageUrl": row.get("imageUrl"),
            })

    return {
        "assets": {"characters": characters, "scenes": scenes, "props": props},
        "stats": {
            "totalCharacters": len(characters),
            "totalScenes": len(scenes),
            "totalProps": len(props),
        },
    }


# Request/Response Models
class ExtractRequest(BaseModel):
    projectId: str = Field(..., description="项目ID")
    fileId: str = Field(..., description="文件ID")
    episodes: List[int] = Field(..., description="要提取的集数列表")
    llmProvider: Optional[str] = Field(None, description="LLM提供商")
    llmApiKey: Optional[str] = Field(None, description="LLM API密钥")
    llmEndpoint: Optional[str] = Field(None, description="LLM端点")
    llmModelName: Optional[str] = Field(None, description="LLM模型名称")


class ExtractResponse(BaseModel):
    taskId: str = Field(..., description="任务ID，用于查询进度")
    status: str = Field(default="processing", description="任务状态")
    assets: Optional[Dict[str, List[Dict[str, Any]]]] = Field(None, description="已有资产数据（skip时返回）")
    stats: Optional[Dict[str, int]] = Field(None, description="资产统计（skip时返回）")


class TaskStatusResponse(BaseModel):
    taskId: str
    status: str = Field(..., description="processing|completed|failed")
    progress: int = Field(default=0, ge=0, le=100, description="进度百分比")
    result: Optional[Dict[str, Any]] = Field(None, description="提取结果")
    error: Optional[Dict[str, str]] = Field(None, description="错误信息")


async def get_novel_text(file_id: str) -> str:
    """
    从数据库 NovelFile 表获取文件路径，然后读取小说文本内容
    """
    from app.core.db import get_db_cursor

    file_path = None
    try:
        with get_db_cursor() as cursor:
            cursor.execute('SELECT path FROM "NovelFile" WHERE id = %s', (file_id,))
            row = cursor.fetchone()
            if row and row.get('path'):
                file_path = row['path']
    except Exception as e:
        print(f"[get_novel_text] DB query failed: {e}")
        raise FileNotFoundError(f"Database query failed for file_id: {file_id}")

    if not file_path:
        raise FileNotFoundError(f"NovelFile not found in DB: {file_id}")

    # Try the path from DB
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    # Fallback: try file_id directly in uploads dir (legacy support)
    for suffix in ["", ".txt", ".md", ".docx"]:
        alt_path = os.path.join(FILE_STORAGE_PATH, f"{file_id}{suffix}")
        if os.path.exists(alt_path):
            with open(alt_path, "r", encoding="utf-8") as f:
                return f.read()

    raise FileNotFoundError(f"Novel file not found: {file_path}")


def format_extracted_assets(raw_assets: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    格式化 LLM 提取结果，添加类型和 ID
    """
    formatted = {
        "characters": [],
        "scenes": [],
        "props": [],
    }

    # Process characters
    for char in raw_assets.get("characters", []):
        formatted["characters"].append({
            "id": str(uuid.uuid4()),
            "name": char.get("name", "未命名角色"),
            "type": "character",
            "prompt": char.get("prompt", ""),
            "description": char.get("description", ""),
        })

    # Process scenes
    for scene in raw_assets.get("scenes", []):
        formatted["scenes"].append({
            "id": str(uuid.uuid4()),
            "name": scene.get("name", "未命名场景"),
            "type": "scene",
            "prompt": scene.get("prompt", ""),
            "description": scene.get("description", ""),
        })

    # Process props
    for prop in raw_assets.get("props", []):
        formatted["props"].append({
            "id": str(uuid.uuid4()),
            "name": prop.get("name", "未命名道具"),
            "type": "prop",
            "prompt": prop.get("prompt", ""),
            "description": prop.get("description", ""),
        })

    return formatted


def persist_assets_to_db(
    project_id: str,
    file_id: str,
    episodes: List[int],
    extracted_assets: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, List[str]]:
    """
    Persist extracted assets to PostgreSQL Asset table.
    Returns a mapping of asset type -> list of database IDs.
    """
    now = datetime.now().isoformat()
    db_ids: Dict[str, List[str]] = {
        "characters": [],
        "scenes": [],
        "props": [],
    }

    type_map = {
        "characters": "character",
        "scenes": "scene",
        "props": "prop",
    }

    with get_db_cursor() as cursor:
        for asset_list_key, asset_type in type_map.items():
            for asset in extracted_assets.get(asset_list_key, []):
                db_id = str(uuid.uuid4())
                db_ids[asset_list_key].append(db_id)
                cursor.execute(
                    """
                    INSERT INTO "Asset"
                        (id, "projectId", name, type, prompt, description, status, "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        db_id,
                        project_id,
                        asset.get("name", "未命名"),
                        asset_type,
                        asset.get("prompt", ""),
                        asset.get("description", ""),
                        "pending",
                        now,
                        now,
                    )
                )

                # Link to episodes via AssetEpisode junction table
                for ep_order in episodes:
                    # Look up episode ID by projectId and orderIndex
                    cursor.execute(
                        """
                        SELECT id FROM "Episode"
                        WHERE "projectId" = %s AND "orderIndex" = %s
                        LIMIT 1
                        """,
                        (project_id, ep_order)
                    )
                    ep_row = cursor.fetchone()
                    if ep_row:
                        ae_id = str(uuid.uuid4())
                        cursor.execute(
                            """
                            INSERT INTO "AssetEpisode" (id, "assetId", "episodeId", "createdAt")
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT DO NOTHING
                            """,
                            (ae_id, db_id, ep_row["id"], now)
                        )

    print(f"[persist_assets_to_db] Saved {len(db_ids['characters'])} characters, "
          f"{len(db_ids['scenes'])} scenes, {len(db_ids['props'])} props "
          f"for project {project_id}")
    return db_ids


# Asset extraction logic
async def extract_assets_from_episodes(
    task_id: str,
    project_id: str,
    file_id: str,
    episodes: List[int],
    llm_provider: Optional[str],
    llm_api_key: Optional[str],
    llm_endpoint: Optional[str],
    llm_model_name: Optional[str],
):
    """
    后台任务：从指定集数中提取资产（角色、场景、道具）
    """
    try:
        # Update status to processing
        tasks[task_id] = {
            "status": "processing",
            "progress": 0,
            "result": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
        }

        # Determine LLM config
        provider = llm_provider or DEFAULT_LLM_CONFIG["provider"]
        api_key = llm_api_key or DEFAULT_LLM_CONFIG["api_key"]
        endpoint = llm_endpoint or DEFAULT_LLM_CONFIG["endpoint"]
        model_name = llm_model_name or DEFAULT_LLM_CONFIG["model_name"]
        print(f"[extract_assets_from_episodes] Using LLM config: provider={provider}, endpoint={endpoint}, model_name={model_name}")
        print(f"[extract_assets_from_episodes] LLM API key is {'present' if api_key else 'missing'}")   
        if not api_key:
            raise ValueError("LLM API key is required")

        # Create LLM service
        llm_service = create_llm_service(provider, api_key, endpoint, model_name)

        # Update progress: 读取文件
        tasks[task_id]["progress"] = 5
        tasks[task_id]["current_step"] = "reading_file"

        # Get novel text from file
        novel_text = await get_novel_text(file_id)

        if not novel_text or len(novel_text.strip()) < 100:
            raise ValueError("小说文本内容不足或为空")

        # Update progress: 开始提取
        tasks[task_id]["progress"] = 10
        tasks[task_id]["current_step"] = "extracting"

        # Call LLM to extract assets
        # 使用前 15000 字符（LLM 处理能力限制）
        text_to_process = novel_text[:15000] if len(novel_text) > 15000 else novel_text

        raw_assets = await llm_service.extract_assets(text_to_process)

        # Validate LLM response
        if not isinstance(raw_assets, dict):
            raise ValueError(f"Invalid LLM response format: {type(raw_assets)}")

        if not any([raw_assets.get("characters"), raw_assets.get("scenes"), raw_assets.get("props")]):
            raise ValueError("LLM didn't extract any assets")

        # Update progress: 格式化结果
        tasks[task_id]["progress"] = 90
        tasks[task_id]["current_step"] = "formatting"

        # Format the extracted assets
        extracted_assets = format_extracted_assets(raw_assets)

        # Update progress: 写入数据库
        tasks[task_id]["progress"] = 95
        tasks[task_id]["current_step"] = "saving_to_db"

        # Persist assets to PostgreSQL
        init_asset_tables()  # ensure tables exist (idempotent)
        db_asset_ids = persist_assets_to_db(project_id, file_id, episodes, extracted_assets)

        # Replace asset IDs with database IDs in extracted_assets for frontend use
        for asset_list_key, db_id_list in db_asset_ids.items():
            for i, asset in enumerate(extracted_assets.get(asset_list_key, [])):
                if i < len(db_id_list):
                    asset["id"] = db_id_list[i]

        # Update final result
        tasks[task_id]["status"] = "completed"
        tasks[task_id]["progress"] = 100
        tasks[task_id]["result"] = {
            "projectId": project_id,
            "fileId": file_id,
            "episodes": episodes,
            "assets": extracted_assets,
            "dbAssetIds": db_asset_ids,
            "extractedAt": datetime.now().isoformat(),
            "stats": {
                "totalCharacters": len(extracted_assets["characters"]),
                "totalScenes": len(extracted_assets["scenes"]),
                "totalProps": len(extracted_assets["props"]),
            },
        }

    except Exception as e:
        import traceback
        tasks[task_id]["status"] = "failed"
        tasks[task_id]["error"] = {
            "code": "EXTRACTION_ERROR",
            "message": str(e) or repr(e),
            "trace": traceback.format_exc(),
        }
        print(f"[extract_assets] FAILED: {repr(e)}\n{traceback.format_exc()}")


@router.post("/extract", response_model=ExtractResponse, status_code=202)
async def trigger_asset_extraction(request: ExtractRequest, background_tasks: BackgroundTasks):
    """
    触发资产提取任务

    - **projectId**: 项目ID
    - **fileId**: 小说文件ID
    - **episodes**: 要提取的集数列表
    - **llmProvider**: LLM提供商 (openai, deepseek, anthropic)
    - **llmApiKey**: LLM API密钥
    - **llmEndpoint**: LLM端点URL
    - **llmModelName**: LLM模型名称

    如果项目已有提取资产，直接返回已完成状态，前端跳过提取进入 Phase 5。
    """
    task_id = f"asset-{uuid.uuid4().hex[:12]}"

    # ── 已有资产检查：跳过重复提取，直接返回缓存结果 ──
    existing = _check_existing_assets(request.projectId)
    print(f"[_check_existing_assets] Found existing assets for project {request.projectId}: {existing is not None}")
    if existing and any([
        existing["assets"]["characters"],
        existing["assets"]["scenes"],
        existing["assets"]["props"],
    ]):
        tasks[task_id] = {
            "status": "completed",
            "progress": 100,
            "result": {
                "projectId": request.projectId,
                "fileId": request.fileId,
                "episodes": request.episodes,
                "assets": existing["assets"],
                "dbAssetIds": {
                    "characters": [a["id"] for a in existing["assets"]["characters"]],
                    "scenes":    [a["id"] for a in existing["assets"]["scenes"]],
                    "props":     [a["id"] for a in existing["assets"]["props"]],
                },
                "extractedAt": datetime.now().isoformat(),
                "stats": existing["stats"],
                "skipped": True,
            },
            "error": None,
            "created_at": datetime.now().isoformat(),
        }
        return ExtractResponse(
            taskId=task_id,
            status="completed",
            assets=existing["assets"],
            stats=existing["stats"]
        )

    # ── 无已有资产，正常触发提取流程 ──
    tasks[task_id] = {
        "status": "processing",
        "progress": 0,
        "result": None,
        "error": None,
        "created_at": datetime.now().isoformat(),
    }

    background_tasks.add_task(
        extract_assets_from_episodes,
        task_id,
        request.projectId,
        request.fileId,
        request.episodes,
        request.llmProvider,
        request.llmApiKey,
        request.llmEndpoint,
        request.llmModelName,
    )

    return ExtractResponse(taskId=task_id, status="processing")


@router.get("/extract/{task_id}", response_model=TaskStatusResponse)
async def get_extraction_status(task_id: str):
    """
    查询资产提取任务状态

    - **task_id**: 任务ID
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found or expired")

    task = tasks[task_id]
    return TaskStatusResponse(
        taskId=task_id,
        status=task["status"],
        progress=task["progress"],
        result=task["result"],
        error=task["error"],
    )


# ─── LLM Config from project ────────────────────────────────────────────────────

def _get_llm_config_by_project(project_id: str) -> Optional[Dict[str, str]]:
    """从项目设置中获取 LLM 配置"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute('SELECT "llmModel" FROM "Project" WHERE id = %s', (project_id,))
            row = cursor.fetchone()
            if not row or not row.get("llmModel"):
                return None

            llm_model_code = row["llmModel"]
            cursor.execute(
                """SELECT provider, "apiKey", endpoint, "modelId", "modelName"
                   FROM "AIModel" WHERE code = %s AND type = 'llm' LIMIT 1""",
                (llm_model_code,)
            )
            model_row = cursor.fetchone()
            if not model_row:
                return None

            provider_endpoints = {
                "openai": "https://api.openai.com/v1",
                "deepseek": "https://api.deepseek.com/v1",
                "anthropic": "https://api.anthropic.com/v1",
            }

            provider = model_row.get("provider") or "deepseek"
            api_model = model_row.get("modelId") or model_row.get("modelName") or llm_model_code
            endpoint = model_row.get("endpoint") or provider_endpoints.get(provider, "https://api.deepseek.com/v1")

            return {
                "provider": provider,
                "api_key": model_row.get("apiKey") or "",
                "endpoint": endpoint,
                "model_name": api_model,
            }
    except Exception as e:
        print(f"[_get_llm_config_by_project] error: {e}")
        return None


# ─── Prompt Polish Endpoint ────────────────────────────────────────────────────

class PolishRequest(BaseModel):
    projectId: str
    assetType: str = Field(..., description="资产类型: character, scene, prop")
    currentPrompt: str


class PolishResponse(BaseModel):
    polishedPrompt: str


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


_POLISH_USER_TEMPLATE = """请润色以下{asset_type}的图像生成提示词：

【原始提示词】
{current_prompt}

请输出润色后的提示词，直接返回纯文本，不要其他内容。"""


@router.post("/polish", response_model=PolishResponse)
async def polish_asset_prompt(request: PolishRequest):
    """
    使用 LLM 润色资产提示词

    - **projectId**: 项目ID（用于获取 LLM 配置）
    - **assetType**: 资产类型 (character / scene / prop)
    - **currentPrompt**: 当前提示词
    """
    llm_config = _get_llm_config_by_project(request.projectId)
    if not llm_config or not llm_config.get("api_key"):
        raise HTTPException(status_code=400, detail="项目未配置 LLM 或 API Key 为空")

    if not request.currentPrompt.strip():
        raise HTTPException(status_code=400, detail="提示词不能为空")

    llm_service = create_llm_service(
        provider=llm_config["provider"],
        api_key=llm_config["api_key"],
        endpoint=llm_config["endpoint"],
        model_name=llm_config["model_name"],
    )

    asset_type_map = {"character": "角色", "scene": "场景", "prop": "道具"}
    asset_type_label = asset_type_map.get(request.assetType, "资产")

    user_prompt = _POLISH_USER_TEMPLATE.format(
        asset_type=asset_type_label,
        current_prompt=request.currentPrompt,
    )

    content = await llm_service._call_llm([
        {"role": "system", "content": _POLISH_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ])

    return PolishResponse(polishedPrompt=content.strip())