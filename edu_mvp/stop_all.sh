#!/bin/bash
# 停止前后端服务
# 用法: ./stop_all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  🛑 停止所有服务"
echo "=========================================="
echo ""

# 停止后端
bash "$SCRIPT_DIR/stop_backend.sh"

echo ""
# 停止前端
bash "$SCRIPT_DIR/stop_frontend.sh"

echo ""
echo "=========================================="
echo "  ✅ 停止完成"
echo "=========================================="
