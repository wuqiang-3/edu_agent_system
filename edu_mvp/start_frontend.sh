#!/bin/bash
# 启动 React 前端（build + vite preview，managed node）
# 用法: ./start_frontend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_FILE="$SCRIPT_DIR/.frontend.pid"
PORT=5173

NODE_DIR="/Users/fangchao/.workbuddy/binaries/node/versions/22.12.0"
NPM="$NODE_DIR/bin/npm"
NPX="$NODE_DIR/bin/npx"

echo "=========================================="
echo "  🚀 启动前端服务"
echo "=========================================="
echo ""

# 1. 检查端口
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

# 2. 切换到前端目录
cd "$FRONTEND_DIR" || {
    echo "❌ 目录不存在: $FRONTEND_DIR"
    exit 1
}

# 3. 验证 node 环境
if [ ! -f "$NODE_DIR/bin/node" ]; then
    echo "❌ Node 环境不存在: $NODE_DIR/bin/node"
    exit 1
fi

# 4. 构建生产版本
echo "📦 构建前端..."
$NPM run build --silent 2>&1 | tail -3
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi
echo "✅ 构建完成"

# 5. 启动 vite preview（后台运行，记录实际进程 PID）
echo "🌐 启动 vite preview on 0.0.0.0:$PORT ..."
nohup $NPX vite preview --port $PORT --host 0.0.0.0 \
    > "$SCRIPT_DIR/.frontend.log" 2>&1 &
NOHUP_PID=$!

sleep 3

# 6. 通过端口反查实际 PID
VITE_PID=$(lsof -ti:$PORT | head -1)

if [ -z "$VITE_PID" ]; then
    echo "❌ vite preview 启动失败，查看日志: $SCRIPT_DIR/.frontend.log"
    exit 1
fi

echo "$VITE_PID" > "$PID_FILE"
echo "✅ 前端已启动"
echo "   PID:  $VITE_PID"
echo "   端口: $PORT"
echo "   日志: $SCRIPT_DIR/.frontend.log"
echo ""
echo "=========================================="
echo "  前端运行中 ✅"
echo "=========================================="
