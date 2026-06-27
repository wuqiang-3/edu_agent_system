#!/bin/bash
# 停止 React 前端服务
# 用法: ./stop_frontend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
PORT=5173

echo "🛑 停止前端服务..."

stopped=0

# 方式1：通过 PID 文件停止
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        # 先发 SIGTERM
        kill "$PID" 2>/dev/null
        sleep 1
        # 如果还在，强制 kill -9
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
            sleep 0.5
        fi
        echo "✅ 前端已停止 (PID: $PID)"
        stopped=1
    else
        echo "⚠️  PID $PID 的进程不存在"
    fi
    rm -f "$PID_FILE"
fi

# 方式2：通过端口兜底
if lsof -ti:$PORT &>/dev/null; then
    echo "⚠️  端口 $PORT 仍有残留进程，强制清理..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    echo "✅ 端口 $PORT 已释放"
    stopped=1
fi

if [ $stopped -eq 0 ]; then
    echo "ℹ️  前端未在运行"
fi
