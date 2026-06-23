#!/bin/bash
# 停止 React 前端开发服务器
# 用法: ./stop_frontend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.frontend.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/.frontend.pid")
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null
        echo "✅ 前端已停止 (PID: $PID)"
    else
        echo "⚠️  PID $PID 的进程不存在"
    fi
    rm "$SCRIPT_DIR/.frontend.pid"
else
    echo "⚠️  未找到 .frontend.pid 文件，尝试按端口停止..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "✅ 已停止 5173 端口的进程"
fi
