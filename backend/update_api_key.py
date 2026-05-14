#!/usr/bin/env python3
"""更新 AIModel 表中的 API Key"""
import psycopg2
import sys

# 获取 API Key 作为参数
if len(sys.argv) < 3:
    print("用法: python update_api_key.py <model_code> <new_api_key>")
    sys.exit(1)

model_code = sys.argv[1]
new_api_key = sys.argv[2]

try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='ai_manhua',
        user='postgres',
        password='postgres'
    )
    conn.autocommit = True
    cur = conn.cursor()

    sql = 'UPDATE "AIModel" SET "apiKey" = %s WHERE code = %s AND type = %s'
    cur.execute(sql, (new_api_key, model_code, 'llm'))

    if cur.rowcount > 0:
        print(f"✅ 成功更新 API Key for {model_code}")
    else:
        print(f"⚠️ 未找到匹配的记录: code={model_code}, type=llm")

    conn.close()
except Exception as e:
    print(f"❌ 错误: {e}")
    sys.exit(1)
