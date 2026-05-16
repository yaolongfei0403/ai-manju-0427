"""
数据库数据同步脚本
==================

功能：
1. 全量导出/导入数据库数据
2. 增量同步（基于时间戳）
3. 支持指定表同步
4. 数据校验

用法：
    python sync_db.py --help                    # 查看帮助
    python sync_db.py --export                  # 导出所有数据
    python sync_db.py --import <file>           # 导入数据
    python sync_db.py --export --tables users   # 导出指定表
    python sync_db.py --sync --source <url>     # 从远程同步
"""

import os
import json
import argparse
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

# ─── 配置 ────────────────────────────────────────────────────────────────────

DEFAULT_OUTPUT_DIR = Path(__file__).parent / "sync_data"

# 默认数据库连接（可通过环境变量覆盖）
DEFAULT_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres123@127.0.0.1:5432/ai_manhua"
)

# 支持同步的表及其配置
TABLE_CONFIGS = {
    "split_results": {
        "primary_key": "task_id",
        "timestamp_field": "generated_at",
        "batch_size": 1000,
    },
    "User": {
        "primary_key": "id",
        "timestamp_field": "createdAt",
        "batch_size": 500,
    },
}


# ─── 数据库操作 ──────────────────────────────────────────────────────────────


def get_db_connection(db_url: str = None):
    """创建数据库连接"""
    url = db_url or DEFAULT_DB_URL
    return psycopg2.connect(url)


def get_tables(conn) -> list[str]:
    """获取所有用户表（排除系统表）"""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            AND table_name NOT IN ('pg_stat_statements', 'pg_buffercache')
            ORDER BY table_name
        """)
        return [row[0] for row in cursor.fetchall()]


def export_table_data(conn, table_name: str, batch_size: int = 1000) -> list[dict]:
    """导出指定表的数据"""
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(f'SELECT * FROM "{table_name}"')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_table_count(conn, table_name: str) -> int:
    """获取表的数据行数"""
    with conn.cursor() as cursor:
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        return cursor.fetchone()[0]


def get_table_schema(conn, table_name: str) -> list[dict]:
    """获取表结构（列信息）"""
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = %s AND table_schema = 'public'
            ORDER BY ordinal_position
        """, (table_name,))
        return [dict(row) for row in cursor.fetchall()]


# ─── 数据处理 ─────────────────────────────────────────────────────────────────


def serialize_value(value: Any) -> Any:
    """序列化特殊数据类型（如 datetime, bytes）"""
    if isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, bytes):
        return value.hex()
    elif isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [serialize_value(item) for item in value]
    return value


def deserialize_value(value: Any, target_type: str = None) -> Any:
    """反序列化数据"""
    if value is None:
        return None
    if target_type == "jsonb" and isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def compute_data_hash(data: list[dict]) -> str:
    """计算数据的 MD5 哈希值（用于校验）"""
    content = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(content.encode()).hexdigest()


# ─── 导出功能 ─────────────────────────────────────────────────────────────────


def export_data(
    output_file: Path = None,
    tables: list[str] = None,
    db_url: str = None,
    include_schema: bool = True,
) -> dict:
    """
    导出数据库数据到 JSON 文件

    Args:
        output_file: 输出文件路径（默认: sync_data/export_{timestamp}.json）
        tables: 指定要导出的表列表（默认: 所有用户表）
        db_url: 数据库连接 URL
        include_schema: 是否包含表结构信息

    Returns:
        导出元信息（包含文件路径、表统计、哈希值等）
    """
    output_file = output_file or DEFAULT_OUTPUT_DIR / f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    conn = get_db_connection(db_url)
    all_tables = get_tables(conn)

    if tables:
        # 只导出指定的表，按指定顺序
        all_tables = [t for t in tables if t in all_tables]

    export_metadata = {
        "version": "1.0",
        "exported_at": datetime.now().isoformat(),
        "database_url": db_url or DEFAULT_DB_URL,
        "tables": {},
    }

    export_data = {
        "metadata": export_metadata,
        "data": {},
    }

    print(f"开始导出数据到: {output_file}")
    print(f"发现 {len(all_tables)} 个表")

    for table_name in all_tables:
        print(f"\n  导出表: {table_name}...", end=" ")

        try:
            # 获取表结构
            if include_schema:
                schema = get_table_schema(conn, table_name)
                export_metadata["tables"][table_name] = {
                    "schema": schema,
                    "record_count": None,
                    "hash": None,
                }

            # 导出数据
            rows = export_table_data(conn, table_name)
            serialized_rows = [serialize_value(row) for row in rows]

            # 计算哈希
            data_hash = compute_data_hash(serialized_rows) if serialized_rows else None
            record_count = len(serialized_rows)

            if include_schema:
                export_metadata["tables"][table_name]["record_count"] = record_count
                export_metadata["tables"][table_name]["hash"] = data_hash

            export_data["data"][table_name] = serialized_rows

            print(f"{record_count} 条记录")

        except Exception as e:
            print(f"失败: {e}")
            export_metadata["tables"][table_name] = {"error": str(e)}

    conn.close()

    # 写入文件
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    # 打印汇总
    total_records = sum(
        t.get("record_count", 0)
        for t in export_metadata["tables"].values()
        if "record_count" in t
    )
    print(f"\n✓ 导出完成: {total_records} 条记录，{len(all_tables)} 个表")
    print(f"  文件: {output_file}")

    return export_metadata


# ─── 导入功能 ─────────────────────────────────────────────────────────────────


def import_data(
    input_file: Path,
    db_url: str = None,
    truncate_first: bool = False,
    skip_errors: bool = True,
) -> dict:
    """
    从 JSON 文件导入数据到数据库

    Args:
        input_file: 输入文件路径
        db_url: 数据库连接 URL
        truncate_first: 导入前是否清空表（默认: 否）
        skip_errors: 是否跳过错误继续执行（默认: 是）

    Returns:
        导入结果统计
    """
    with open(input_file, "r", encoding="utf-8") as f:
        import_data = json.load(f)

    metadata = import_data.get("metadata", {})
    tables_data = import_data.get("data", {})

    conn = get_db_connection(db_url)
    results = {}

    print(f"开始导入数据从: {input_file}")
    print(f"发现 {len(tables_data)} 个表")

    for table_name, records in tables_data.items():
        print(f"\n  导入表: {table_name}...", end=" ")

        if not records:
            print("无数据，跳过")
            results[table_name] = {"imported": 0, "skipped": 0, "errors": []}
            continue

        try:
            if truncate_first:
                with conn.cursor() as cursor:
                    cursor.execute(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE')
                    print("(已清空) ", end="")

            imported = 0
            errors = []

            for record in records:
                try:
                    columns = list(record.keys())
                    values = [deserialize_value(v) for v in record.values()]

                    placeholders = [f"${i+1}" for i in range(len(values))]
                    columns_str = '", "'.join(columns)
                    placeholders_str = ", ".join(placeholders)

                    sql = f'''
                        INSERT INTO "{table_name}" ("{columns_str}")
                        VALUES ({placeholders_str})
                        ON CONFLICT DO NOTHING
                    '''

                    with conn.cursor() as cursor:
                        cursor.execute(sql, values)
                    imported += 1

                except Exception as e:
                    if skip_errors:
                        errors.append({"record": str(record)[:100], "error": str(e)})
                        continue
                    else:
                        raise

            conn.commit()
            print(f"{imported} 条记录")
            results[table_name] = {"imported": imported, "skipped": len(errors), "errors": errors}

        except Exception as e:
            print(f"失败: {e}")
            results[table_name] = {"imported": 0, "skipped": 0, "errors": [str(e)]}

    conn.close()

    # 打印汇总
    total_imported = sum(r.get("imported", 0) for r in results.values())
    total_skipped = sum(r.get("skipped", 0) for r in results.values())
    print(f"\n✓ 导入完成: {total_imported} 条记录，{total_skipped} 条跳过")

    return results


# ─── 增量同步 ─────────────────────────────────────────────────────────────────


def incremental_export(
    output_file: Path,
    tables: list[str] = None,
    since: datetime = None,
    db_url: str = None,
) -> dict:
    """
    增量导出数据（只导出指定时间之后修改的记录）

    Args:
        output_file: 输出文件路径
        tables: 要导出的表列表
        since: 只导出此时间之后的记录
        db_url: 数据库连接 URL
    """
    since = since or datetime.now() - timedelta(days=7)

    conn = get_db_connection(db_url)
    all_tables = get_tables(conn)

    if tables:
        all_tables = [t for t in tables if t in all_tables]

    export_data = {
        "metadata": {
            "version": "1.0",
            "exported_at": datetime.now().isoformat(),
            "export_type": "incremental",
            "since": since.isoformat(),
            "tables": {},
        },
        "data": {}
    }

    print(f"增量导出数据（自 {since.isoformat()}）：")

    for table_name in all_tables:
        config = TABLE_CONFIGS.get(table_name, {})
        timestamp_field = config.get("timestamp_field")

        if not timestamp_field:
            print(f"\n  表 {table_name} 无时间戳字段，导出全部数据...")
            rows = export_table_data(conn, table_name)
        else:
            print(f"\n  导出表 {table_name}（按 {timestamp_field} 筛选）...")
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    f'SELECT * FROM "{table_name}" WHERE "{timestamp_field}" >= %s',
                    (since,)
                )
                rows = [dict(row) for row in cursor.fetchall()]

        serialized_rows = [serialize_value(row) for row in rows]
        export_data["data"][table_name] = serialized_rows
        export_data["metadata"]["tables"][table_name] = {
            "record_count": len(serialized_rows),
            "hash": compute_data_hash(serialized_rows) if serialized_rows else None,
        }
        print(f"    {len(serialized_rows)} 条记录")

    conn.close()

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    total_records = sum(t.get("record_count", 0) for t in export_data["metadata"]["tables"].values())
    print(f"\n✓ 增量导出完成: {total_records} 条记录")

    return export_data["metadata"]


# ─── 数据校验 ─────────────────────────────────────────────────────────────────


def validate_data(file_path: Path) -> dict:
    """
    校验数据文件的完整性和一致性

    Returns:
        校验结果（包含每个表的状态）
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metadata = data.get("metadata", {})
    tables_data = data.get("data", {})

    results = {
        "file": str(file_path),
        "validated_at": datetime.now().isoformat(),
        "status": "valid",
        "tables": {},
    }

    for table_name, records in tables_data.items():
        stored_hash = metadata.get("tables", {}).get(table_name, {}).get("hash")
        actual_hash = compute_data_hash(records) if records else None

        is_valid = stored_hash == actual_hash

        results["tables"][table_name] = {
            "record_count": len(records),
            "expected_hash": stored_hash,
            "actual_hash": actual_hash,
            "valid": is_valid,
        }

        if not is_valid:
            results["status"] = "invalid"
            print(f"  ✗ 表 {table_name} 校验失败")
        else:
            print(f"  ✓ 表 {table_name} 校验通过 ({len(records)} 条)")

    if results["status"] == "valid":
        print(f"\n✓ 数据校验通过")
    else:
        print(f"\n✗ 数据校验失败，数据可能已损坏")

    return results


# ─── 主程序 ────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="数据库数据同步工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 导出所有数据
  python sync_db.py --export

  # 导出到指定文件
  python sync_db.py --export --output ./backup.json

  # 只导出指定表
  python sync_db.py --export --tables split_results,User

  # 导入数据
  python sync_db.py --import ./backup.json

  # 增量同步（过去7天）
  python sync_db.py --sync --output ./inc_backup.json

  # 增量同步（过去24小时）
  python sync_db.py --sync --output ./today.json --hours 24

  # 校验数据
  python sync_db.py --validate ./backup.json
        """
    )

    parser.add_argument("--export", action="store_true", help="导出模式")
    parser.add_argument("--import", dest="import_file", help="导入模式，指定输入文件路径")
    parser.add_argument("--sync", action="store_true", help="增量同步模式（导出）")
    parser.add_argument("--validate", dest="validate_file", help="校验模式，指定要校验的文件")

    parser.add_argument("--output", "-o", type=Path, help="输出文件路径")
    parser.add_argument("--tables", type=str, help="指定表名，逗号分隔（如: split_results,User）")
    parser.add_argument("--hours", type=int, default=168, help="增量导出的时间范围（小时，默认168即7天）")
    parser.add_argument("--db-url", help="数据库连接URL（默认从环境变量DATABASE_URL读取）")
    parser.add_argument("--truncate", action="store_true", help="导入前清空表")
    parser.add_argument("--no-skip", action="store_true", help="导入时遇到错误不跳过")

    args = parser.parse_args()

    # 处理表名参数
    tables = [t.strip() for t in args.tables.split(",")] if args.tables else None

    if args.export:
        export_data(
            output_file=args.output,
            tables=tables,
            db_url=args.db_url,
        )

    elif args.import_file:
        import_data(
            input_file=Path(args.import_file),
            db_url=args.db_url,
            truncate_first=args.truncate,
            skip_errors=not args.no_skip,
        )

    elif args.sync:
        since = datetime.now() - timedelta(hours=args.hours)
        incremental_export(
            output_file=args.output,
            tables=tables,
            since=since,
            db_url=args.db_url,
        )

    elif args.validate_file:
        validate_data(Path(args.validate_file))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()