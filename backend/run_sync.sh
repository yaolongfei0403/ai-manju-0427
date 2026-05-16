#!/bin/bash
# 数据库同步快速启动脚本
# ================================
# 用法: ./run_sync.sh [选项]
#
# 示例:
#   ./run_sync.sh --export              # 导出所有数据
#   ./run_sync.sh --import backup.json # 导入数据
#   ./run_sync.sh --sync               # 增量同步
#   ./run_sync.sh --transfer --source <url> --target <url>  # 跨库同步

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
SYNC_DATA_DIR="$BACKEND_DIR/sync_data"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 帮助信息
show_help() {
    cat << EOF
数据库同步工具
==============

用法: $0 [选项]

选项:
    --export              导出数据库到文件
    --import <file>       从文件导入数据
    --sync                增量同步（过去24小时）
    --transfer            跨数据库同步（需配合 --source --target）
    --validate <file>     校验数据文件

    --source <url>        源数据库连接URL
    --target <url>        目标数据库连接URL
    --tables <list>       指定表名（逗号分隔）

    --hours <n>           增量同步时间范围（小时），默认24
    --output <file>       输出文件路径
    --truncate            导入前清空表

    --help                显示此帮助信息

环境变量:
    DATABASE_URL          默认数据库连接
    SOURCE_DATABASE_URL  源数据库连接
    TARGET_DATABASE_URL   目标数据库连接

示例:
    # 导出到文件
    $0 --export --output ./backup.json

    # 从文件导入
    $0 --import ./backup.json

    # 增量同步（过去24小时）
    $0 --sync --hours 24

    # 跨库同步
    $0 --transfer --source "postgresql://..." --target "postgresql://..."

    # 指定表导出
    $0 --export --tables split_results,User

EOF
}

# 检查依赖
check_dependencies() {
    if ! command -v python &> /dev/null; then
        log_error "Python 未安装"
        exit 1
    fi

    # 检查 psycopg2
    if ! python -c "import psycopg2" &> /dev/null; then
        log_info "安装 psycopg2..."
        pip install psycopg2-binary
    fi
}

# 导出数据
do_export() {
    log_info "开始导出数据..."

    OUTPUT_FILE="${OUTPUT_FILE:-$SYNC_DATA_DIR/export_$(date +%Y%m%d_%H%M%S).json}"

    mkdir -p "$SYNC_DATA_DIR"

    python "$BACKEND_DIR/sync_db.py" --export --output "$OUTPUT_FILE" ${TABLES:+--tables "$TABLES"}

    log_info "导出完成: $OUTPUT_FILE"
}

# 导入数据
do_import() {
    if [ -z "$IMPORT_FILE" ]; then
        log_error "请指定导入文件 (--import <file>)"
        exit 1
    fi

    if [ ! -f "$IMPORT_FILE" ]; then
        log_error "文件不存在: $IMPORT_FILE"
        exit 1
    fi

    log_info "开始导入数据: $IMPORT_FILE"

    python "$BACKEND_DIR/sync_db.py" --import "$IMPORT_FILE" ${TRUNCATE:+--truncate}

    log_info "导入完成"
}

# 增量同步
do_sync() {
    log_info "开始增量同步（过去 ${HOURS:-24} 小时）..."

    OUTPUT_FILE="${OUTPUT_FILE:-$SYNC_DATA_DIR/incremental_$(date +%Y%m%d_%H%M%S).json}"

    mkdir -p "$SYNC_DATA_DIR"

    python "$BACKEND_DIR/sync_db.py" --sync --output "$OUTPUT_FILE" --hours "${HOURS:-24}" ${TABLES:+--tables "$TABLES"}

    log_info "增量同步完成: $OUTPUT_FILE"
}

# 跨库同步
do_transfer() {
    if [ -z "$SOURCE_URL" ] || [ -z "$TARGET_URL" ]; then
        log_error "请提供 --source 和 --target 参数"
        exit 1
    fi

    log_info "开始跨库同步..."
    log_info "源: $SOURCE_URL"
    log_info "目标: $TARGET_URL"

    python "$BACKEND_DIR/db_transfer.py" \
        --source "$SOURCE_URL" \
        --target "$TARGET_URL" \
        ${TABLES:+--tables "$TABLES"} \
        ${SYNC_MODE:+--sync} \
        ${HOURS:+--hours "$HOURS"}

    log_info "跨库同步完成"
}

# 校验数据
do_validate() {
    if [ -z "$VALIDATE_FILE" ]; then
        log_error "请指定要校验的文件 (--validate <file>)"
        exit 1
    fi

    if [ ! -f "$VALIDATE_FILE" ]; then
        log_error "文件不存在: $VALIDATE_FILE"
        exit 1
    fi

    log_info "校验数据文件: $VALIDATE_FILE"

    python "$BACKEND_DIR/sync_db.py" --validate "$VALIDATE_FILE"
}

# 解析参数
TABLES=""
HOURS=""
OUTPUT_FILE=""
IMPORT_FILE=""
VALIDATE_FILE=""
SOURCE_URL=""
TARGET_URL=""
TRUNCATE=""
SYNC_MODE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --export)
            COMMAND="export"
            shift
            ;;
        --import)
            IMPORT_FILE="$2"
            COMMAND="import"
            shift 2
            ;;
        --sync)
            COMMAND="sync"
            shift
            ;;
        --transfer)
            COMMAND="transfer"
            shift
            ;;
        --validate)
            VALIDATE_FILE="$2"
            COMMAND="validate"
            shift 2
            ;;
        --source)
            SOURCE_URL="$2"
            shift 2
            ;;
        --target)
            TARGET_URL="$2"
            shift 2
            ;;
        --tables)
            TABLES="$2"
            shift 2
            ;;
        --hours)
            HOURS="$2"
            shift 2
            ;;
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --truncate)
            TRUNCATE="true"
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 从环境变量读取默认值
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres123@127.0.0.1:5432/ai_manhua}"
SOURCE_URL="${SOURCE_URL:-$SOURCE_DATABASE_URL}"
TARGET_URL="${TARGET_URL:-$TARGET_DATABASE_URL}"

# 检查依赖
check_dependencies

# 执行命令
case "$COMMAND" in
    export)
        do_export
        ;;
    import)
        do_import
        ;;
    sync)
        do_sync
        ;;
    transfer)
        do_transfer
        ;;
    validate)
        do_validate
        ;;
    *)
        show_help
        ;;
esac