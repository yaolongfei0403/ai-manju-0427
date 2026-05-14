# Asset Image Generation API Router
# POST /api/v1/assets/generate - Trigger image generation for an asset
# GET  /api/v1/assets/generate/{task_id} - Poll generation status

import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.core.db import get_db_cursor
from app.services.t2i_service import create_t2i_service

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

# In-memory task storage (same pattern as extract.py)
# Structure: {task_id: {"status": "pending"|"processing"|"completed"|"failed", "assetId", "imageUrl", "progress", ...}}
generation_tasks: Dict[str, Dict[str, Any]] = {}

# ─── Request / Response Models ──────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    assetId: str = Field(..., description="资产ID")
    projectId: str = Field(..., description="项目ID")


class GenerateResponse(BaseModel):
    taskId: str = Field(..., description="任务ID")
    status: str = Field(default="processing", description="任务状态")
    imageUrl: Optional[str] = Field(None, description="生成的图片URL（完成后返回）")


class GenerateStatusResponse(BaseModel):
    taskId: str
    status: str = Field(..., description="pending|processing|completed|failed")
    progress: int = Field(default=0, ge=0, le=100)
    imageUrl: Optional[str] = Field(None, description="图片URL（完成后返回）")
    error: Optional[Dict[str, str]] = Field(None, description="错误信息")


# ─── Asset DB Helpers ────────────────────────────────────────────────────────────

def get_asset_by_id(asset_id: str) -> Optional[Dict[str, Any]]:
    """从数据库查询资产信息"""
    with get_db_cursor() as cursor:
        cursor.execute(
            """
            SELECT id, "projectId", name, type, prompt, description, "imageUrl", status, "createdAt"
            FROM "Asset"
            WHERE id = %s
            """,
            (asset_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "projectId": row["projectId"],
            "name": row.get("name", ""),
            "type": row.get("type", ""),
            "prompt": row.get("prompt", ""),
            "description": row.get("description", ""),
            "imageUrl": row.get("imageUrl"),
            "status": row.get("status", "pending"),
        }


def update_asset_image_url(asset_id: str, image_url: str):
    """更新资产的 imageUrl 字段"""
    with get_db_cursor() as cursor:
        cursor.execute(
            """
            UPDATE "Asset"
            SET "imageUrl" = %s, status = 'completed', "updatedAt" = %s
            WHERE id = %s
            """,
            (image_url, datetime.now().isoformat(), asset_id)
        )


# ─── T2I Config from Project ────────────────────────────────────────────────────

def _get_t2i_config_by_project(project_id: str) -> Optional[Dict[str, str]]:
    """
    从项目设置中获取 T2I 模型配置
    查询 Project.t2iModel -> AIModel 表
    """
    try:
        with get_db_cursor() as cursor:
            # 获取项目的 T2I 模型代码
            cursor.execute('SELECT "t2iModel" FROM "Project" WHERE id = %s', (project_id,))
            row = cursor.fetchone()
            if not row or not row.get("t2iModel"):
                print(f"[_get_t2i_config_by_project] Project {project_id} has no t2iModel configured")
                return None

            t2i_model_code = row["t2iModel"]

            # 查询 AIModel 表获取 T2I 模型详情
            cursor.execute(
                """
                SELECT code, name, provider, endpoint, "apiKey", "modelId", "modelName"
                FROM "AIModel"
                WHERE code = %s AND type = 't2i'
                LIMIT 1
                """,
                (t2i_model_code,)
            )
            model_row = cursor.fetchone()
            if not model_row:
                print(f"[_get_t2i_config_by_project] T2I model '{t2i_model_code}' not found in AIModel table")
                return None

            print(f"[_get_t2i_config_by_project] Found T2I config: provider={model_row.get('provider')}, model={model_row.get('modelId') or model_row.get('modelName')}")

            return {
                "provider": model_row.get("provider", "wan2.6-t2i"),
                "endpoint": model_row.get("endpoint") or "",
                "api_key": model_row.get("apiKey") or "",
                "model_name": model_row.get("modelId") or model_row.get("modelName") or t2i_model_code,
                "code": model_row.get("code", t2i_model_code),
            }
    except Exception as e:
        print(f"[_get_t2i_config_by_project] Error: {e}")
        return None


# ─── Background Generation Task ────────────────────────────────────────────────

async def run_generation(task_id: str, asset_id: str, project_id: str):
    """
    后台生成任务 - 调用真实 T2I 模型
    """
    try:
        generation_tasks[task_id] = {
            "status": "processing",
            "progress": 0,
            "assetId": asset_id,
            "imageUrl": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
        }

        # ── Step 1: 获取资产信息 ──
        asset = get_asset_by_id(asset_id)
        if not asset:
            raise ValueError(f"Asset not found: {asset_id}")

        if not asset.get("prompt"):
            raise ValueError(f"Asset {asset_id} has no prompt to generate from")

        generation_tasks[task_id]["progress"] = 10

        # ── Step 2: 获取 T2I 配置 ──
        t2i_config = _get_t2i_config_by_project(project_id)
        if not t2i_config or not t2i_config.get("api_key"):
            # 尝试使用环境变量作为 fallback
            api_key = os.getenv("DASHSCOPE_API_KEY", "")
            if api_key:
                t2i_config = {
                    "provider": "wan2.7-image",
                    "endpoint": "https://dashscope-intl.aliyuncs.com/api/v1",
                    "api_key": api_key,
                    "model_name": "wan2.7-image",
                }
                print(f"[run_generation] Using DASHSCOPE_API_KEY from environment")
            else:
                raise ValueError(f"No T2I configuration found for project {project_id} and no DASHSCOPE_API_KEY in environment")

        generation_tasks[task_id]["progress"] = 20

        # ── Step 3: 创建 T2I Service ──
        t2i_service = create_t2i_service(
            provider=t2i_config["provider"],
            api_key=t2i_config["api_key"],
            endpoint=t2i_config["endpoint"],
            model_name=t2i_config["model_name"],
        )

        generation_tasks[task_id]["progress"] = 30

        # ── Step 4: 调用 T2I 生成图片 ──
        print(f"[run_generation] Calling T2I service for asset {asset_id}, prompt length: {len(asset['prompt'])}")
        image_path = await t2i_service.generate(
            prompt=asset["prompt"],
            negative_prompt="",
            size="2K",
        )

        generation_tasks[task_id]["progress"] = 80

        # ── Step 5: 更新任务状态 ──
        generation_tasks[task_id]["status"] = "completed"
        generation_tasks[task_id]["progress"] = 100
        generation_tasks[task_id]["imageUrl"] = image_path

        # 同时更新数据库中资产的 imageUrl
        update_asset_image_url(asset_id, image_path)

        print(f"[run_generation] ✅ Done: task={task_id}, asset={asset_id}, url={image_path}")

    except Exception as e:
        import traceback
        generation_tasks[task_id]["status"] = "failed"
        generation_tasks[task_id]["error"] = {
            "code": "GENERATION_ERROR",
            "message": str(e),
            "trace": traceback.format_exc(),
        }
        print(f"[run_generation] ❌ Failed: task={task_id}, error={repr(e)}")


# ─── API Endpoints ──────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse, status_code=202)
async def trigger_generation(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    触发单个资产图片生成

    - **assetId**: 资产ID
    - **projectId**: 项目ID（用于获取 T2I 配置）
    """
    # 校验资产存在
    asset = get_asset_by_id(request.assetId)
    if not asset:
        raise HTTPException(status_code=404, detail="资产不存在")

    # 校验项目归属
    if asset["projectId"] != request.projectId:
        raise HTTPException(status_code=403, detail="无权操作此资产")

    task_id = f"gen-{uuid.uuid4().hex[:12]}"

    generation_tasks[task_id] = {
        "status": "processing",
        "progress": 0,
        "assetId": request.assetId,
        "imageUrl": None,
        "error": None,
        "created_at": datetime.now().isoformat(),
    }

    background_tasks.add_task(run_generation, task_id, request.assetId, request.projectId)

    return GenerateResponse(
        taskId=task_id,
        status="processing",
        imageUrl=None,
    )


@router.get("/generate/{task_id}", response_model=GenerateStatusResponse)
async def get_generation_status(task_id: str):
    """
    查询图片生成任务状态

    - **task_id**: 任务ID（由 trigger_generation 返回）
    """
    if task_id not in generation_tasks:
        raise HTTPException(status_code=404, detail="任务不存在或已过期")

    task = generation_tasks[task_id]
    return GenerateStatusResponse(
        taskId=task_id,
        status=task["status"],
        progress=task.get("progress", 0),
        imageUrl=task.get("imageUrl"),
        error=task.get("error"),
    )