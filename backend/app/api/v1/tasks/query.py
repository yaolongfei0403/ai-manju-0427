"""
Tasks API — /api/v1/tasks/{task_id}
Query task status.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.adapters import TaskStatusResponse, AdapterError

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


class TaskQueryResponse(BaseModel):
    task_id: str
    status: str
    progress: float | None = None
    result: dict | None = None
    error: str | None = None


@router.get("/{task_id}", response_model=TaskQueryResponse)
async def get_task(task_id: str):
    """
    Query task status by task_id.

    Note: This is a placeholder. In production, task state should be
    stored in Redis or a database for cross-instance access.
    """
    return TaskQueryResponse(
        task_id=task_id,
        status="unknown",
        error="Task status tracking requires Redis or DB backend",
    )