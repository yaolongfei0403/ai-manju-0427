@echo off
REM 数据库同步快速启动脚本 (Windows)
REM ==================================
REM 用法: run_sync.bat [选项]

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%"
set "SYNC_DATA_DIR=%BACKEND_DIR%\sync_data"

REM 默认值
set "COMMAND="
set "TABLES="
set "HOURS=24"
set "OUTPUT_FILE="
set "IMPORT_FILE="
set "VALIDATE_FILE="
set "SOURCE_URL="
set "TARGET_URL="
set "TRUNCATE="

REM 解析参数
:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="--help" goto :show_help
if "%~1"=="--export" set "COMMAND=export" & shift & goto :parse_args
if "%~1"=="--import" set "IMPORT_FILE=%~2" & set "COMMAND=import" & shift & shift & goto :parse_args
if "%~1"=="--sync" set "COMMAND=sync" & shift & goto :parse_args
if "%~1"=="--transfer" set "COMMAND=transfer" & shift & goto :parse_args
if "%~1"=="--validate" set "VALIDATE_FILE=%~2" & set "COMMAND=validate" & shift & shift & goto :parse_args
if "%~1"=="--source" set "SOURCE_URL=%~2" & shift & shift & goto :parse_args
if "%~1"=="--target" set "TARGET_URL=%~2" & shift & shift & goto :parse_args
if "%~1"=="--tables" set "TABLES=%~2" & shift & shift & goto :parse_args
if "%~1"=="--hours" set "HOURS=%~2" & shift & shift & goto :parse_args
if "%~1"=="--output" set "OUTPUT_FILE=%~2" & shift & shift & goto :parse_args
if "%~1"=="--truncate" set "TRUNCATE=1" & shift & goto :parse_args
shift
goto :parse_args

:done_parsing

REM 从环境变量读取默认值
if not defined DATABASE_URL set "DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/ai_manhua"
if not defined SOURCE_URL set "SOURCE_URL=%SOURCE_DATABASE_URL%"
if not defined TARGET_URL set "TARGET_URL=%TARGET_DATABASE_URL%"

REM 执行命令
if "%COMMAND%"=="export" goto :do_export
if "%COMMAND%"=="import" goto :do_import
if "%COMMAND%"=="sync" goto :do_sync
if "%COMMAND%"=="transfer" goto :do_transfer
if "%COMMAND%"=="validate" goto :do_validate

goto :show_help

:do_export
echo [INFO] 开始导出数据...
if not defined OUTPUT_FILE (
    for /f "tokens=1-4 delims=/ " %%a in ("%date% %time%") do set "TIMESTAMP=%%a%%b%%c_%%d"
    set "OUTPUT_FILE=%SYNC_DATA_DIR%\export_%TIMESTAMP:~0,8%_%TIME:~0,8%.json"
    set "OUTPUT_FILE=!OUTPUT_FILE: =0!"
)
if not exist "%SYNC_DATA_DIR%" mkdir "%SYNC_DATA_DIR%"
python "%BACKEND_DIR%\sync_db.py" --export --output "%OUTPUT_FILE%" --tables "%TABLES%"
echo [INFO] 导出完成: %OUTPUT_FILE%
goto :end

:do_import
if "%IMPORT_FILE%"=="" (
    echo [ERROR] 请指定导入文件 (--import ^<file^>)
    exit /b 1
)
if not exist "%IMPORT_FILE%" (
    echo [ERROR] 文件不存在: %IMPORT_FILE%
    exit /b 1
)
echo [INFO] 开始导入数据: %IMPORT_FILE%
python "%BACKEND_DIR%\sync_db.py" --import "%IMPORT_FILE%" --truncate
echo [INFO] 导入完成
goto :end

:do_sync
echo [INFO] 开始增量同步（过去 %HOURS% 小时）...
if not defined OUTPUT_FILE (
    for /f "tokens=1-4 delims=/ " %%a in ("%date% %time%") do set "TIMESTAMP=%%a%%b%%c_%%d"
    set "OUTPUT_FILE=%SYNC_DATA_DIR%\incremental_%TIMESTAMP:~0,8%_%TIME:~0,8%.json"
    set "OUTPUT_FILE=!OUTPUT_FILE: =0!"
)
if not exist "%SYNC_DATA_DIR%" mkdir "%SYNC_DATA_DIR%"
python "%BACKEND_DIR%\sync_db.py" --sync --output "%OUTPUT_FILE%" --hours "%HOURS%" --tables "%TABLES%"
echo [INFO] 增量同步完成: %OUTPUT_FILE%
goto :end

:do_transfer
if "%SOURCE_URL%"=="" (
    echo [ERROR] 请提供 --source 参数
    exit /b 1
)
if "%TARGET_URL%"=="" (
    echo [ERROR] 请提供 --target 参数
    exit /b 1
)
echo [INFO] 开始跨库同步...
echo [INFO] 源: %SOURCE_URL%
echo [INFO] 目标: %TARGET_URL%
python "%BACKEND_DIR%\db_transfer.py" --source "%SOURCE_URL%" --target "%TARGET_URL%" --tables "%TABLES%" --hours "%HOURS%"
echo [INFO] 跨库同步完成
goto :end

:do_validate
if "%VALIDATE_FILE%"=="" (
    echo [ERROR] 请指定要校验的文件 (--validate ^<file^>)
    exit /b 1
)
if not exist "%VALIDATE_FILE%" (
    echo [ERROR] 文件不存在: %VALIDATE_FILE%
    exit /b 1
)
echo [INFO] 校验数据文件: %VALIDATE_FILE%
python "%BACKEND_DIR%\sync_db.py" --validate "%VALIDATE_FILE%"
goto :end

:show_help
echo.
echo 数据库同步工具
echo ================
echo.
echo 用法: run_sync.bat [选项]
echo.
echo 选项:
echo     --export              导出数据库到文件
echo     --import ^<file^>      从文件导入数据
echo     --sync                增量同步（过去24小时）
echo     --transfer            跨数据库同步（需配合 --source --target）
echo     --validate ^<file^>   校验数据文件
echo.
echo     --source ^<url^>       源数据库连接URL
echo     --target ^<url^>       目标数据库连接URL
echo     --tables ^<list^>      指定表名（逗号分隔）
echo.
echo     --hours ^<n^>          增量同步时间范围（小时），默认24
echo     --output ^<file^>      输出文件路径
echo     --truncate            导入前清空表
echo.
echo 环境变量:
echo     DATABASE_URL            默认数据库连接
echo     SOURCE_DATABASE_URL     源数据库连接
echo     TARGET_DATABASE_URL     目标数据库连接
echo.
echo 示例:
echo     run_sync.bat --export --output ./backup.json
echo     run_sync.bat --import ./backup.json
echo     run_sync.bat --sync --hours 24
echo     run_sync.bat --transfer --source "postgresql://..." --target "postgresql://..."
echo.

:end
endlocal