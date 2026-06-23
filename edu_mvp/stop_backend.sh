#!/bin/bash
# 停止 FastAPI 后端服务
# 用法: ./stop_backend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.backend.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.backend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo "✅ 后端已停止 (PID: $PID)"
    else
        echo "⚠️  PID $PID 的进程不存在"
    fi
    rm "$SCRIPT_DIR/.backend.pid"
else
    echo "⚠️  未找到 .backend.pid 文件，尝试按端口停止..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    echo "✅ 已停止 8000 端口的进程"
fi
