"""
FastAPI 后端服务 - 初中学习系统 MVP
======================================

提供 REST API 读取 result.json 数据：
- 章节列表
- 知识点列表
- 题目列表
- 学习方法列表

运行：
  cd backend
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import json
import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============================================================
# 配置
# ============================================================

RESULT_PATH = Path(__file__).parent.parent / "output" / "result.json"

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

app = FastAPI(
    title="初中学习系统 API",
    description="陕西 8年级数学 MVP",
    version="1.0.0",
)

# CORS 配置（允许前端 localhost:5173 访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 数据模型
# ============================================================

class ChapterOut(BaseModel):
    chapter_id: str
    chapter_title: str
    chapter_order: int
    section_count: int
    kp_count: int


class KnowledgePointOut(BaseModel):
    kp_id: str
    kp_name: str
    chapter_id: str
    section_id: str
    difficulty: str
    importance: str
    exam_frequency: str


class QuestionOut(BaseModel):
    q_id: str
    kp_id: str
    kp_name: str
    question_type: str
    difficulty: str
    score: int
    question_text: str
    options: Optional[List[dict]]
    correct_answer: str


class MethodOut(BaseModel):
    kp_id: str
    kp_name: str
    method_type: str
    memory_trick: dict
    practice_guide: dict


# ============================================================
# API 路由
# ============================================================

@app.get("/")
def root():
    return {"msg": "初中学习系统 API", "version": "1.0.0", "docs": "/docs"}


@app.get("/api/health")
def health():
    data = get_data()
    return {
        "status": "ok",
        "kp_count": len(data.get("knowledge_points", [])),
        "question_count": len(data.get("questions", [])),
        "method_count": len(data.get("learning_methods", [])),
    }


@app.get("/api/chapters", response_model=List[ChapterOut])
def get_chapters():
    """
    获取章节列表，每个章节含知识点数量。
    """
    data = get_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])

    result = []
    for ch in chapters:
        kp_count = len([k for k in kps if k.get("chapter_id") == ch["chapter_id"]])
        result.append(ChapterOut(
            chapter_id=ch["chapter_id"],
            chapter_title=ch["chapter_title"],
            chapter_order=ch["chapter_order"],
            section_count=len(ch.get("sections", [])),
            kp_count=kp_count,
        ))
    return result


@app.get("/api/chapters/{chapter_id}")
def get_chapter_detail(chapter_id: str):
    """
    获取章节详情 + 该章节下所有知识点。
    """
    data = get_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])

    chapter = next((c for c in chapters if c["chapter_id"] == chapter_id), None)
    if not chapter:
        raise HTTPException(status_code=404, detail="章节不存在")

    chapter_kps = [k for k in kps if k.get("chapter_id") == chapter_id]
    return {
        "chapter": chapter,
        "knowledge_points": chapter_kps,
    }


@app.get("/api/knowledge-points", response_model=List[KnowledgePointOut])
def get_knowledge_points(chapter_id: Optional[str] = Query(None)):
    """
    获取知识点列表，支持按 chapter_id 过滤。
    """
    data = get_data()
    kps = data.get("knowledge_points", [])
    if chapter_id:
        kps = [k for k in kps if k.get("chapter_id") == chapter_id]
    return [KnowledgePointOut(**k) for k in kps]


@app.get("/api/knowledge-points/{kp_id}")
def get_knowledge_point_detail(kp_id: str):
    """
    获取单个知识点详情 + 对应的学习方法 + 题目列表。
    """
    data = get_data()
    kps = data.get("knowledge_points", [])
    methods = data.get("learning_methods", [])
    questions = data.get("questions", [])

    kp = next((k for k in kps if k.get("kp_id") == kp_id), None)
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")

    method = next((m for m in methods if m.get("kp_id") == kp_id), None)
    kp_questions = [q for q in questions if q.get("kp_id") == kp_id]

    return {
        "knowledge_point": kp,
        "method": method,
        "questions": kp_questions,
    }


@app.get("/api/questions", response_model=List[QuestionOut])
def get_questions(
    kp_id: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
):
    """
    获取题目列表，支持多种过滤条件。
    """
    data = get_data()
    qs = data.get("questions", [])
    if kp_id:
        qs = [q for q in qs if q.get("kp_id") == kp_id]
    if difficulty:
        qs = [q for q in qs if q.get("difficulty") == difficulty]
    if question_type:
        qs = [q for q in qs if q.get("question_type") == question_type]

    return [QuestionOut(**q) for q in qs]


@app.get("/api/questions/{q_id}")
def get_question_detail(q_id: str):
    """
    获取单题详情（含解析）。
    """
    data = get_data()
    questions = data.get("questions", [])
    q = next((q for q in questions if q.get("q_id") == q_id), None)
    if not q:
        raise HTTPException(status_code=404, detail="题目不存在")
    return q


@app.get("/api/methods")
def get_methods(kp_id: Optional[str] = Query(None)):
    """
    获取学习方法列表，支持按 kp_id 过滤。
    """
    data = get_data()
    methods = data.get("learning_methods", [])
    if kp_id:
        methods = [m for m in methods if m.get("kp_id") == kp_id]
    return methods


@app.get("/api/stats")
def get_stats():
    """
    获取全局统计信息。
    """
    data = get_data()
    kps = data.get("knowledge_points", [])
    questions = data.get("questions", [])

    # 按难度统计题目
    by_difficulty = {}
    for q in questions:
        d = q.get("difficulty", "未知")
        by_difficulty[d] = by_difficulty.get(d, 0) + 1

    # 按章节统计知识点
    by_chapter = {}
    for kp in kps:
        cid = kp.get("chapter_id", "未知")
        by_chapter[cid] = by_chapter.get(cid, 0) + 1

    return {
        "total_chapters": len(data.get("chapters", [])),
        "total_kps": len(kps),
        "total_questions": len(questions),
        "total_methods": len(data.get("learning_methods", [])),
        "questions_by_difficulty": by_difficulty,
        "kps_by_chapter": by_chapter,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
