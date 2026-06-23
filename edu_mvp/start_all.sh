#!/bin/bash
# 一键启动前后端服务
# 用法: ./start_all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  🎓 初中学习系统 - 一键启动"
echo "=========================================="
echo ""

# 创建日志目录
mkdir -p "$SCRIPT_DIR/logs"

# 启动后端
echo "【1/2】启动后端 API 服务..."
bash "$SCRIPT_DIR/start_backend.sh"

echo ""
echo "【2/2】启动前端开发服务器..."
bash "$SCRIPT_DIR/start_frontend.sh"

echo ""
echo "=========================================="
echo "  ✅ 启动完成！"
echo "=========================================="
echo ""
echo "📱 学生端:     <INTERNAL_URL_REMOVED>"
echo "⚙️  管理台:     <INTERNAL_URL_REMOVED>"
echo "🔧 API 文档:    <INTERNAL_URL_REMOVED>"
echo ""
echo "📋 日志位置:"
echo "   后端: $SCRIPT_DIR/logs/backend.log"
echo "   前端: $SCRIPT_DIR/logs/frontend.log"
echo ""
echo "🛑 停止服务: bash stop_all.sh"
echo "=========================================="
