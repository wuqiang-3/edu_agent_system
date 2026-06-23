#!/bin/bash
# 启动 FastAPI 后端服务
# 用法: ./start_backend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_FILE="$SCRIPT_DIR/logs/backend.log"

# 创建 logs 目录
mkdir -p "$SCRIPT_DIR/logs"

# 检查 result.json 是否存在
if [ ! -f "$BACKEND_DIR/../output/result.json" ]; then
    echo "❌ 找不到 output/result.json，请先运行 mvp_main.py 生成数据"
    exit 1
fi

# 查找 Python 虚拟环境
if [ -f "$BACKEND_DIR/../../venv/bin/activate" ]; then
    echo "📦 使用项目虚拟环境..."
    source "$BACKEND_DIR/../../venv/bin/activate"
    PYTHON_CMD="python"
elif [ -f "$BACKEND_DIR/../../edu_mvp_venv/bin/activate" ]; then
    echo "📦 使用 edu_mvp_venv 虚拟环境..."
    source "$BACKEND_DIR/../../edu_mvp_venv/bin/activate"
    PYTHON_CMD="python"
else
    echo "⚠️  未找到虚拟环境，使用系统 Python..."
    PYTHON_CMD="python3"
fi

# 检查依赖
$PYTHON_CMD -c "import fastapi, uvicorn" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 安装后端依赖..."
    $PYTHON_CMD -m pip install fastapi uvicorn python-dotenv json5 2>&1 | tail -3
fi

# 杀掉占用 8000 端口的进程
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 1

echo "🚀 启动后端 API 服务..."
echo "   API 文档: <INTERNAL_URL_REMOVED>"
echo "   健康检查: <INTERNAL_URL_REMOVED>"
echo "   日志文件: $LOG_FILE"
echo ""

cd "$BACKEND_DIR"
nohup $PYTHON_CMD -m uvicorn app_clean:app --host 0.0.0.0 --port 8000 --reload > "$LOG_FILE" 2>&1 &

BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/.backend.pid"

echo "✅ 后端已启动 (PID: $BACKEND_PID)"
echo "   停止后端: kill $BACKEND_PID 或运行 ./stop_backend.sh"
echo ""
echo "⏳ 等待服务就绪..."
sleep 3

# 验证服务
curl -s <INTERNAL_URL_REMOVED> > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 后端服务就绪！"
    curl -s <INTERNAL_URL_REMOVED> | python3 -m json.tool 2>/dev/null || echo "   API 正常响应"
else
    echo "⚠️  后端可能还在启动中，请查看日志: tail -f $LOG_FILE"
fi
