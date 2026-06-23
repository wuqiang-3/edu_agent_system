"""
FastAPI 后端服务 - 初中学习系统 MVP
提供 REST API 读取 result.json 数据
"""

import json
import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# 配置
# ============================================================

# 获取数据文件位置
BASE_DIR = Path(__file__).parent.parent
RESULT_PATH = BASE_DIR / "output" / "result.json"

# 加载数据
def load_data():
    if not RESULT_PATH.exists():
        raise RuntimeError(f"数据文件不存在：{RESULT_PATH}")
    with open(RESULT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# 全局数据缓存
_data = None
def get_data():
    global _data
    if _data is None:
        _data = load_data()
    return _data

# ============================================================
# FastAPI 应用
# ============================================================

app = FastAPI(title="初中学习系统 API", version="1.0.0")

# CORS 配置（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 数据模型
# ============================================================

class ChapterResponse(BaseModel):
    id: str
    title: str
    order: int
    kp_count: int

class KnowledgePointResponse(BaseModel):
    kp_id: str
    kp_name: str
    chapter_id: str
    difficulty: str
    importance: str
    description: str

class QuestionResponse(BaseModel):
    q_id: str
    kp_id: str
    question_type: str
    difficulty: str
    question_text: str
    correct_answer: Optional[str] = None

# ============================================================
# API 路由
# ============================================================

@app.get("/")
def root():
    return {"message": "初中学习系统 API 服务运行中"}

@app.get("/api/health")
def health_check():
    """健康检查"""
    return {"status": "ok", "data_loaded": _data is not None}

@app.get("/api/chapters", response_model=List[ChapterResponse])
def get_chapters():
    """获取章节列表"""
    data = get_data()
    chapters = data.get("chapters", [])
    result = []
    kps = data.get("knowledge_points", [])
    
    for ch in chapters:
        kp_count = len([k for k in kps if k.get("chapter_id") == ch.get("id")])
        result.append({
            "id": ch.get("id"),
            "title": ch.get("title"),
            "order": ch.get("order", 0),
            "kp_count": kp_count
        })
    return result

@app.get("/api/chapters/{chapter_id}")
def get_chapter_detail(chapter_id: str):
    """获取章节详情（含知识点）"""
    data = get_data()
    chapters = data.get("chapters", [])
    chapter = next((ch for ch in chapters if ch.get("id") == chapter_id), None)
    
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")
    
    # 获取该章节的知识点
    kps = data.get("knowledge_points", [])
    chapter_kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    
    return {
        "chapter": chapter,
        "knowledge_points": chapter_kps
    }

@app.get("/api/knowledge-points")
def get_knowledge_points(chapter_id: Optional[str] = None):
    """获取知识点列表（支持按章节过滤）"""
    data = get_data()
    kps = data.get("knowledge_points", [])
    
    if chapter_id:
        kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    
    return kps

@app.get("/api/knowledge-points/{kp_id}")
def get_knowledge_point(kp_id: str):
    """获取单个知识点详情"""
    data = get_data()
    kps = data.get("knowledge_points", [])
    kp = next((k for k in kps if k.get("kp_id") == kp_id), None)
    
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
    
    # 获取对应的学习方法
    methods = data.get("learning_methods", [])
    method = next((m for m in methods if m.get("kp_id") == kp_id), None)
    
    # 获取对应的题目
    questions = data.get("questions", [])
    kp_questions = [q for q in questions if q.get("kp_id") == kp_id]
    
    return {
        "knowledge_point": kp,
        "learning_method": method,
        "questions": kp_questions
    }

@app.get("/api/questions")
def get_questions(kp_id: Optional[str] = None, question_type: Optional[str] = None):
    """获取题目列表（支持按知识点/题型过滤）"""
    data = get_data()
    questions = data.get("questions", [])
    
    if kp_id:
        questions = [q for q in questions if q.get("kp_id") == kp_id]
    if question_type:
        questions = [q for q in questions if q.get("question_type") == question_type]
    
    return questions

@app.get("/api/questions/{q_id}")
def get_question(q_id: str):
    """获取单题详情"""
    data = get_data()
    questions = data.get("questions", [])
    question = next((q for q in questions if q.get("q_id") == q_id), None)
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    return question

@app.get("/api/methods")
def get_methods(kp_id: Optional[str] = None):
    """获取学习方法列表"""
    data = get_data()
    methods = data.get("learning_methods", [])
    
    if kp_id:
        methods = [m for m in methods if m.get("kp_id") == kp_id]
    
    return methods

@app.get("/api/stats")
def get_stats():
    """获取统计数据"""
    data = get_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])
    questions = data.get("questions", [])
    methods = data.get("learning_methods", [])
    
    # 按难度统计题目
    difficulty_stats = {}
    for q in questions:
        diff = q.get("difficulty", "未知")
        difficulty_stats[diff] = difficulty_stats.get(diff, 0) + 1
    
    # 按题型统计题目
    type_stats = {}
    for q in questions:
        qt = q.get("question_type", "未知")
        type_stats[qt] = type_stats.get(qt, 0) + 1
    
    return {
        "total_chapters": len(chapters),
        "total_knowledge_points": len(kps),
        "total_questions": len(questions),
        "total_methods": len(methods),
        "questions_by_difficulty": difficulty_stats,
        "questions_by_type": type_stats
    }

# ============================================================
# 启动代码
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
