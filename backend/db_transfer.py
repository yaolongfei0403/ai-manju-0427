"""
跨数据库同步脚本
================

功能：
- 在两个 PostgreSQL 数据库之间同步数据
- 支持全量同步和增量同步
- 支持表级别过滤

用法：
    # 从源数据库同步到目标数据库
    python db_transfer.py --source <source_url> --target <target_url>

    # 只同步指定表
    python db_transfer.py --source <url> --target <url> --tables split_results,User

    # 增量同步（过去24小时修改的数据）
    python db_transfer.py --source <url> --target <url> --sync --hours 24
"""

import os
import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor


# ─── 配置 ─────────────────────────────────────────────────────────────────────

DEFAULT_BATCH_SIZE = 1000


# ─── 辅助函数 ─────────────────────────────────────────────────────────────────


def get_connection(db_url: str):
    """创建数据库连接"""
    return psycopg2.connect(db_url)


def get_tables(conn) -> list[str]:
    """获取所有用户表"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        return [row[0] for row in cursor.fetchall()]


def get_table_row_count(conn, table_name: str) -> int:
    """获取表行数"""
    with conn.cursor() as cursor:
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        return cursor.fetchone()[0]


def serialize_value(value: Any) -> Any:
    """序列化特殊数据类型"""
    if isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, bytes):
        return value.hex()
    elif isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


# ─── 全量同步 ─────────────────────────────────────────────────────────────────


def full_sync(source_url: str, target_url: str, tables: list[str] = None) -> dict:
    """
    全量同步数据（从源到目标）

    Args:
        source_url: 源数据库连接 URL
        target_url: 目标数据库连接 URL
        tables: 要同步的表列表（默认: 所有表）

    Returns:
        同步结果统计
    """
    print("=" * 50)
    print("全量数据库同步")
    print("=" * 50)

    source_conn = get_connection(source_url)
    target_conn = get_connection(target_url)

    # 获取要同步的表
    all_tables = get_tables(source_conn)
    if tables:
        all_tables = [t for t in all_tables if t in tables]

    print(f"源数据库: {source_url[:50]}...")
    print(f"目标数据库: {target_url[:50]}...")
    print(f"待同步表: {len(all_tables)} 个")
    print("-" * 50)

    results = {}

    for table_name in all_tables:
        print(f"\n同步表: {table_name}...", end=" ")

        try:
            # 从源数据库读取数据
            with source_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(f'SELECT * FROM "{table_name}"')
                rows = cursor.fetchall()

            record_count = len(rows)
            print(f"读取 {record_count} 条, ", end="")

            if record_count == 0:
                print("跳过（无数据）")
                results[table_name] = {"synced": 0, "skipped": 0}
                continue

            # 清空目标表
            with target_conn.cursor() as cursor:
                cursor.execute(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE')

            # 写入目标数据库
            for row in rows:
                columns = list(row.keys())
                values = [serialize_value(v) for v in row.values()]
                placeholders = [f"${i+1}" for i in range(len(values))]

                sql = f'''
                    INSERT INTO "{table_name}" ("{'", "'.join(columns)}")
                    VALUES ({", ".join(placeholders)})
                '''

                with target_conn.cursor() as cursor:
                    cursor.execute(sql, values)

            target_conn.commit()
            print(f"写入 {record_count} 条")

            results[table_name] = {"synced": record_count, "skipped": 0}

        except Exception as e:
            print(f"失败: {e}")
            results[table_name] = {"synced": 0, "skipped": 0, "error": str(e)}
            target_conn.rollback()

    source_conn.close()
    target_conn.close()

    # 打印汇总
    print("\n" + "=" * 50)
    total_synced = sum(r.get("synced", 0) for r in results.values())
    print(f"同步完成: {total_synced} 条记录")

    return results


# ─── 增量同步 ─────────────────────────────────────────────────────────────────


def incremental_sync(
    source_url: str,
    target_url: str,
    tables: list[str] = None,
    hours: int = 24,
    timestamp_column: str = "updated_at",
) -> dict:
    """
    增量同步数据（只同步指定时间内修改的数据）

    Args:
        source_url: 源数据库连接 URL
        target_url: 目标数据库连接 URL
        tables: 要同步的表列表
        hours: 时间范围（小时）
        timestamp_column: 时间戳字段名
    """
    since = datetime.now() - timedelta(hours=hours)

    print("=" * 50)
    print(f"增量同步（过去 {hours} 小时）")
    print("=" * 50)

    source_conn = get_connection(source_url)
    target_conn = get_connection(target_url)

    all_tables = get_tables(source_conn)
    if tables:
        all_tables = [t for t in all_tables if t in tables]

    print(f"同步起始时间: {since.isoformat()}")
    print(f"待同步表: {len(all_tables)} 个")
    print("-" * 50)

    results = {}

    for table_name in all_tables:
        print(f"\n增量同步表: {table_name}...", end=" ")

        try:
            with source_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # 尝试使用 updated_at 或 created_at 字段过滤
                query = f'''
                    SELECT * FROM "{table_name}"
                    WHERE ("{timestamp_column}" >= %s OR "createdAt" >= %s OR "generated_at" >= %s)
                '''
                cursor.execute(query, (since, since, since))
                rows = cursor.fetchall()

            record_count = len(rows)

            if record_count == 0:
                print("无更新")
                results[table_name] = {"synced": 0}
                continue

            # 使用 UPSERT 写入（根据主键更新或插入）
            synced = 0
            for row in rows:
                columns = list(row.keys())
                values = [serialize_value(v) for v in row.values()]

                # 构建 ON CONFLICT DO UPDATE 语句
                placeholders = [f"${i+1}" for i in range(len(values))]
                update_clause = ", ".join([f'"{col}" = EXCLUDED."{col}"' for col in columns])

                sql = f'''
                    INSERT INTO "{table_name}" ("{'", "'.join(columns)}")
                    VALUES ({", ".join(placeholders)})
                    ON CONFLICT DO UPDATE SET {update_clause}
                '''

                with target_conn.cursor() as cursor:
                    cursor.execute(sql, values)
                synced += 1

            target_conn.commit()
            print(f"同步 {synced} 条")
            results[table_name] = {"synced": synced}

        except Exception as e:
            print(f"失败: {e}")
            results[table_name] = {"synced": 0, "error": str(e)}
            target_conn.rollback()

    source_conn.close()
    target_conn.close()

    print("\n" + "=" * 50)
    total_synced = sum(r.get("synced", 0) for r in results.values())
    print(f"增量同步完成: {total_synced} 条记录")

    return results


# ─── 导出到文件 ───────────────────────────────────────────────────────────────


def export_to_file(source_url: str, output_file: Path, tables: list[str] = None) -> dict:
    """
    导出数据库到 JSON 文件
    """
    print("=" * 50)
    print(f"导出数据到: {output_file}")
    print("=" * 50)

    conn = get_connection(source_url)
    all_tables = get_tables(conn)

    if tables:
        all_tables = [t for t in all_tables if t in tables]

    export_data = {
        "exported_at": datetime.now().isoformat(),
        "tables": {},
        "data": {},
    }

    for table_name in all_tables:
        print(f"导出表: {table_name}...", end=" ")

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(f'SELECT * FROM "{table_name}"')
                rows = cursor.fetchall()

            serialized = [serialize_value(dict(row)) for row in rows]

            export_data["tables"][table_name] = {"count": len(serialized)}
            export_data["data"][table_name] = serialized

            print(f"{len(serialized)} 条")

        except Exception as e:
            print(f"失败: {e}")
            export_data["tables"][table_name] = {"error": str(e)}

    conn.close()

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 导出完成: {output_file}")
    return export_data


# ─── 从文件导入 ───────────────────────────────────────────────────────────────


def import_from_file(target_url: str, input_file: Path, truncate: bool = False) -> dict:
    """
    从 JSON 文件导入数据到数据库
    """
    print("=" * 50)
    print(f"从文件导入: {input_file}")
    print("=" * 50)

    with open(input_file, "r", encoding="utf-8") as f:
        import_data = json.load(f)

    conn = get_connection(target_url)
    results = {}

    for table_name, records in import_data.get("data", {}).items():
        print(f"导入表: {table_name}...", end=" ")

        try:
            if truncate:
                with conn.cursor() as cursor:
                    cursor.execute(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE')

            if not records:
                print("跳过（无数据）")
                results[table_name] = {"imported": 0}
                continue

            imported = 0
            for row in records:
                columns = list(row.keys())
                values = [serialize_value(v) for v in row.values()]
                placeholders = [f"${i+1}" for i in range(len(values))]

                sql = f'''
                    INSERT INTO "{table_name}" ("{'", "'.join(columns)}")
                    VALUES ({", ".join(placeholders)})
                '''

                with conn.cursor() as cursor:
                    cursor.execute(sql, values)
                imported += 1

            conn.commit()
            print(f"{imported} 条")
            results[table_name] = {"imported": imported}

        except Exception as e:
            print(f"失败: {e}")
            results[table_name] = {"imported": 0, "error": str(e)}
            conn.rollback()

    conn.close()

    print(f"\n✓ 导入完成")
    return results


# ─── 性能测试 ─────────────────────────────────────────────────────────────────


def benchmark(source_url: str, queries: int = 10) -> dict:
    """
    数据库性能基准测试
    """
    import time

    print("=" * 50)
    print("数据库性能测试")
    print("=" * 50)

    conn = get_connection(source_url)

    # 测试 1: 全表查询
    tables = get_tables(conn)
    large_tables = [t for t in tables if get_table_row_count(conn, t) > 1000]

    if large_tables:
        table = large_tables[0]
        print(f"\n测试: 全表查询 ({table})")

        start = time.time()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(f'SELECT * FROM "{table}" LIMIT 1000')
            rows = cursor.fetchall()
        elapsed = time.time() - start

        print(f"  查询 1000 条耗时: {elapsed*1000:.2f}ms")

    # 测试 2: 简单聚合查询
    print("\n测试: 聚合查询")
    start = time.time()
    with conn.cursor() as cursor:
        for _ in range(queries):
            cursor.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")
            cursor.fetchone()
    elapsed = time.time() - start

    print(f"  {queries} 次元查询耗时: {elapsed*1000:.2f}ms")

    conn.close()

    print("\n✓ 测试完成")
    return {"tables": len(tables), "large_tables": len(large_tables)}


# ─── 主程序 ───────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="跨数据库同步工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 全量同步
  python db_transfer.py --source postgresql://user:pass@src:5432/db --target postgresql://user:pass@tgt:5432/db

  # 只同步指定表
  python db_transfer.py --source <url> --target <url> --tables split_results,User

  # 增量同步（过去24小时）
  python db_transfer.py --source <url> --target <url> --sync --hours 24

  # 导出到文件
  python db_transfer.py --source <url> --export-to ./backup.json

  # 从文件导入
  python db_transfer.py --target <url> --import-from ./backup.json

  # 性能测试
  python db_transfer.py --source <url> --benchmark
        """
    )

    parser.add_argument("--source", help="源数据库连接 URL")
    parser.add_argument("--target", help="目标数据库连接 URL")
    parser.add_argument("--tables", type=str, help="指定表名，逗号分隔")
    parser.add_argument("--hours", type=int, default=24, help="增量同步时间范围（小时）")

    parser.add_argument("--export-to", type=Path, dest="export_to", help="导出到文件")
    parser.add_argument("--import-from", type=Path, dest="import_from", help="从文件导入")
    parser.add_argument("--truncate", action="store_true", help="导入前清空表")

    parser.add_argument("--sync", action="store_true", help="增量同步模式")
    parser.add_argument("--benchmark", action="store_true", help="性能测试模式")

    args = parser.parse_args()

    tables = [t.strip() for t in args.tables.split(",")] if args.tables else None

    # 环境变量支持
    source_url = args.source or os.getenv("SOURCE_DATABASE_URL")
    target_url = args.target or os.getenv("TARGET_DATABASE_URL")

    if args.benchmark and source_url:
        benchmark(source_url)

    elif args.export_to and source_url:
        export_to_file(source_url, args.export_to, tables)

    elif args.import_from and target_url:
        import_from_file(target_url, args.import_from, args.truncate)

    elif source_url and target_url:
        if args.sync:
            incremental_sync(source_url, target_url, tables, args.hours)
        else:
            full_sync(source_url, target_url, tables)

    else:
        print("错误: 请提供 --source 和 --target 参数，或使用环境变量")
        print("\n环境变量:")
        print("  SOURCE_DATABASE_URL")
        print("  TARGET_DATABASE_URL")
        parser.print_help()


if __name__ == "__main__":
    main()