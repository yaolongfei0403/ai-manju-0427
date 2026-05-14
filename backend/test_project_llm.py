import os
os.environ.setdefault('PYTHONPATH', '.')
from app.core.db import get_db_cursor
from app.api.v1.assets.extract import _get_llm_config_by_project

with get_db_cursor() as cursor:
    cursor.execute('SELECT id, "llmModel" FROM "Project" LIMIT 5')
    projects = cursor.fetchall()
    print("Projects:")
    for p in projects:
        print(dict(p))

    if projects:
        pid = projects[0]['id']
        print(f"\nTesting with project id: {pid}")
        config = _get_llm_config_by_project(pid)
        print(f"Config: {config}")