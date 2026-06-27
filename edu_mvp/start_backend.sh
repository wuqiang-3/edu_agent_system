#!/bin/bash
# 启动 FastAPI 后端服务（isolated venv）
# 用法: ./start_backend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
PID_FILE="$SCRIPT_DIR/.backend.pid"
PORT=8000

PYTHON="/Users/fangchao/.workbuddy/binaries/python/envs/edu-mvp/bin/python"
PIP="/Users/fangchao/.workbuddy/binaries/python/envs/edu-mvp/bin/pip"

echo "=========================================="
echo "  🚀 启动后端 API 服务"
echo "=========================================="
echo ""

# 1. 检查端口是否已被占用
if lsof -ti:$PORT &>/dev/null; then
    echo "⚠️  端口 $PORT 已被占用，尝试释放..."
    lsof -ti:$PORT | xargs kill 2>/dev/null
    sleep 1
    if lsof -ti:$PORT &>/dev/null; then
        echo "❌ 端口 $PORT 仍被占用，无法启动"
        exit 1
    fi
    echo "✅ 端口已释放"
fi

# 2. 切换到后端目录
cd "$BACKEND_DIR" || {
    echo "❌ 目录不存在: $BACKEND_DIR"
    exit 1
}

# 3. 验证 Python 环境存在
if [ ! -f "$PYTHON" ]; then
    echo "❌ Python 环境不存在: $PYTHON"
    echo "   请先创建 venv: $PYTHON -m venv /path/to/edu-mvp"
    exit 1
fi

# 4. 检查并安装依赖
echo "📦 检查依赖..."
$PIP install -r requirements.txt -q 2>/dev/null
echo "✅ 依赖就绪"

# 5. 后台启动 uvicorn（记录实际进程 PID）
echo "🌐 启动 uvicorn (app_clean:app) on 0.0.0.0:$PORT ..."
nohup "$PYTHON" -m uvicorn app_clean:app \
    --host 0.0.0.0 \
    --port $PORT \
    --reload \
    --log-level info \
    > "$SCRIPT_DIR/.backend.log" 2>&1 &

sleep 3

# 6. 通过端口反查实际 PID
UVI_PID=$(lsof -ti:$PORT | head -1)

if [ -z "$UVI_PID" ]; then
    echo "❌ uvicorn 启动失败，查看日志: $SCRIPT_DIR/.backend.log"
    exit 1
fi

echo "$UVI_PID" > "$PID_FILE"
echo "✅ 后端已启动"
echo "   PID:  $UVI_PID"
echo "   端口: $PORT"
echo "   日志: $SCRIPT_DIR/.backend.log"
echo ""
echo "=========================================="
echo "  后端运行中 ✅"
echo "=========================================="
