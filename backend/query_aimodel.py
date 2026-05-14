import os
os.environ.setdefault('PYTHONPATH', '.')
from app.core.db import get_db_cursor

with get_db_cursor() as cursor:
    cursor.execute('SELECT code, name, provider, endpoint, "modelId", "modelName", "apiKey" FROM "AIModel" WHERE type = %s LIMIT 5', ('llm',))
    rows = cursor.fetchall()
    for r in rows:
        print(dict(r))