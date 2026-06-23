#!/bin/bash
# 启动 React 前端开发服务器
# 用法: ./start_frontend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# 检查 node_modules 是否存在
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd "$FRONTEND_DIR"
    npm install
fi

# 杀掉占用 5173 端口的进程
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

echo "🚀 启动前端开发服务器..."
echo "   访问地址: <ADDRESS_REMOVED>
echo "   网络访问: http://$(ipconfig getifaddr en0):5173"
echo ""

cd "$FRONTEND_DIR"
nohup npm run dev > "$SCRIPT_DIR/logs/frontend.log" 2>&1 &

FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/.frontend.pid"

echo "✅ 前端已启动 (PID: $FRONTEND_PID)"
echo "   停止前端: kill $FRONTEND_PID 或运行 ./stop_frontend.sh"
echo ""
echo "⏳ 等待服务就绪..."
sleep 4

# 验证服务
curl -s -o /dev/null -w "%{http_code}" <INTERNAL_HOST_REMOVED> 2>/dev/null | grep -q "200\|301\|304"
if [ $? -eq 0 ]; then
    echo "✅ 前端服务就绪！"
    echo "   👉 打开浏览器访问: <INTERNAL_HOST_REMOVED>"
else
    echo "⚠️  前端可能还在启动中，请查看日志: tail -f $SCRIPT_DIR/logs/frontend.log"
fi
