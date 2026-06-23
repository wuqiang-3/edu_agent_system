"""
Flask 后端服务 - 初中学习系统 MVP
更简单的实现，避免 FastAPI 路由问题
"""

import json
import os
from pathlib import Path
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# ============================================================
# 配置
# ============================================================

BASE_DIR = Path(__file__).parent.parent
RESULT_PATH = BASE_DIR / "output" / "result.json"

# 加载数据
def load_data():
    if not RESULT_PATH.exists():
        return {"error": f"数据文件不存在：{RESULT_PATH}"}
    with open(RESULT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# ============================================================
# Flask 应用
# ============================================================

app = Flask(__name__)
CORS(app)  # 允许跨域

# ============================================================
# API 路由
# ============================================================

@app.route("/")
def root():
    return jsonify({"message": "初中学习系统 API 服务运行中"})

@app.route("/api/health")
def health_check():
    """健康检查"""
    return jsonify({"status": "ok"})

@app.route("/api/chapters")
def get_chapters():
    """获取章节列表"""
    data = load_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])
    
    result = []
    for ch in chapters:
        kp_count = len([k for k in kps if k.get("chapter_id") == ch.get("id")])
        result.append({
            "id": ch.get("id"),
            "title": ch.get("title"),
            "order": ch.get("order", 0),
            "kp_count": kp_count
        })
    return jsonify(result)

@app.route("/api/chapters/<chapter_id>")
def get_chapter_detail(chapter_id):
    """获取章节详情"""
    data = load_data()
    chapters = data.get("chapters", [])
    chapter = next((ch for ch in chapters if ch.get("id") == chapter_id), None)
    
    if not chapter:
        return jsonify({"error": "章节不存在"}), 404
    
    kps = data.get("knowledge_points", [])
    chapter_kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    
    return jsonify({
        "chapter": chapter,
        "knowledge_points": chapter_kps
    })

@app.route("/api/knowledge-points")
def get_knowledge_points():
    """获取知识点列表"""
    data = load_data()
    kps = data.get("knowledge_points", [])
    
    chapter_id = request.args.get("chapter_id")
    if chapter_id:
        kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    
    return jsonify(kps)

@app.route("/api/knowledge-points/<kp_id>")
def get_knowledge_point(kp_id):
    """获取单个知识点详情"""
    data = load_data()
    kps = data.get("knowledge_points", [])
    kp = next((k for k in kps if k.get("kp_id") == kp_id), None)
    
    if not kp:
        return jsonify({"error": "知识点不存在"}), 404
    
    methods = data.get("learning_methods", [])
    method = next((m for m in methods if m.get("kp_id") == kp_id), None)
    
    questions = data.get("questions", [])
    kp_questions = [q for q in questions if q.get("kp_id") == kp_id]
    
    return jsonify({
        "knowledge_point": kp,
        "learning_method": method,
        "questions": kp_questions
    })

@app.route("/api/questions")
def get_questions():
    """获取题目列表"""
    data = load_data()
    questions = data.get("questions", [])
    
    kp_id = request.args.get("kp_id")
    question_type = request.args.get("question_type")
    
    if kp_id:
        questions = [q for q in questions if q.get("kp_id") == kp_id]
    if question_type:
        questions = [q for q in questions if q.get("question_type") == question_type]
    
    return jsonify(questions)

@app.route("/api/questions/<q_id>")
def get_question(q_id):
    """获取单题详情"""
    data = load_data()
    questions = data.get("questions", [])
    question = next((q for q in questions if q.get("q_id") == q_id), None)
    
    if not question:
        return jsonify({"error": "题目不存在"}), 404
    
    return jsonify(question)

@app.route("/api/methods")
def get_methods():
    """获取学习方法列表"""
    data = load_data()
    methods = data.get("learning_methods", [])
    
    kp_id = request.args.get("kp_id")
    if kp_id:
        methods = [m for m in methods if m.get("kp_id") == kp_id]
    
    return jsonify(methods)

@app.route("/api/stats")
def get_stats():
    """获取统计数据"""
    data = load_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])
    questions = data.get("questions", [])
    methods = data.get("learning_methods", [])
    
    difficulty_stats = {}
    for q in questions:
        diff = q.get("difficulty", "未知")
        difficulty_stats[diff] = difficulty_stats.get(diff, 0) + 1
    
    type_stats = {}
    for q in questions:
        qt = q.get("question_type", "未知")
        type_stats[qt] = type_stats.get(qt, 0) + 1
    
    return jsonify({
        "total_chapters": len(chapters),
        "total_knowledge_points": len(kps),
        "total_questions": len(questions),
        "total_methods": len(methods),
        "questions_by_difficulty": difficulty_stats,
        "questions_by_type": type_stats
    })

# ============================================================
# 启动
# ============================================================

if __name__ == "__main__":
    print("🚀 启动 Flask 后端服务...")
    print("   API 文档: http://localhost:8000/api/health")
    app.run(host="0.0.0.0", port=8000, debug=True)
