"""
题目库路由 — 章节、知识点、题目、学习方法（公开只读）

这些是公开数据，无需认证。
"""
from fastapi import APIRouter, Query

from dal import load_data

router = APIRouter(prefix="/api", tags=["content"])


@router.get("/chapters")
def get_chapters():
    return load_data().get("chapters", [])


@router.get("/knowledge-points")
def get_knowledge_points(chapter_id: str = None):
    data = load_data()
    kps = data.get("knowledge_points", [])
    if chapter_id:
        kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    return kps


@router.get("/questions")
def get_questions(kp_id: str = None):
    data = load_data()
    qs = data.get("questions", [])
    if kp_id:
        qs = [q for q in qs if q.get("kp_id") == kp_id]
    return qs


@router.get("/learning-methods")
def get_methods(kp_id: str = None):
    data = load_data()
    ms = data.get("learning_methods", [])
    if kp_id:
        ms = [m for m in ms if m.get("kp_id") == kp_id]
    return ms


@router.get("/stats")
def get_stats():
    data = load_data()
    return {
        "chapters": len(data.get("chapters", [])),
        "knowledge_points": len(data.get("knowledge_points", [])),
        "questions": len(data.get("questions", [])),
        "methods": len(data.get("learning_methods", [])),
    }
