"""
练习路由 — 错题本、收藏、答题记录

P0-1 认证保护
P0-6 IDOR 防护：student_id 从 token 提取
"""
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Query, Body
from pydantic import BaseModel

from dal import load_wrong, save_wrong, load_fav, save_fav, load_answers, save_answers
from middleware import get_current_user, resolve_student_id

router = APIRouter(prefix="/api", tags=["practice"])


# ============================================================
# 错题本
# ============================================================

class WrongQuestionBody(BaseModel):
    q_id: str
    student_id: str = "default"


@router.post("/wrong-questions")
def add_wrong_question(body: WrongQuestionBody, user: dict = Depends(get_current_user)):
    data = load_wrong()
    sid = resolve_student_id(user, body.student_id)
    qid = body.q_id
    if sid not in data:
        data[sid] = []
    if qid not in data[sid]:
        data[sid].append(qid)
    save_wrong(data)
    return {"status": "ok", "count": len(data[sid])}


@router.get("/wrong-questions")
def get_wrong_questions(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    return load_wrong().get(sid, [])


@router.delete("/wrong-questions/{q_id}")
def remove_wrong_question(q_id: str, student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    data = load_wrong()
    sid = resolve_student_id(user, student_id)
    if sid in data and q_id in data[sid]:
        data[sid].remove(q_id)
        save_wrong(data)
    return {"status": "ok"}


@router.delete("/wrong-questions")
def clear_wrong_questions(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    data = load_wrong()
    sid = resolve_student_id(user, student_id)
    data[sid] = []
    save_wrong(data)
    return {"status": "ok", "count": 0}


# ============================================================
# 收藏
# ============================================================

class FavoriteBody(BaseModel):
    q_id: str
    student_id: str = "default"


@router.post("/favorites")
def toggle_favorite(body: FavoriteBody, user: dict = Depends(get_current_user)):
    data = load_fav()
    sid = resolve_student_id(user, body.student_id)
    qid = body.q_id
    if sid not in data:
        data[sid] = []
    if qid in data[sid]:
        data[sid].remove(qid)
        favorited = False
    else:
        data[sid].append(qid)
        favorited = True
    save_fav(data)
    return {"status": "ok", "favorited": favorited, "count": len(data[sid])}


@router.get("/favorites")
def get_favorites(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    return load_fav().get(sid, [])


# ============================================================
# 答题记录
# ============================================================

class AnswerBody(BaseModel):
    q_id: str
    kp_id: str
    chapter_id: str
    difficulty: str
    selected_answer: str
    is_correct: bool
    time_spent: int
    student_id: str = "default"


@router.post("/answers")
def record_answer(body: AnswerBody, user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, body.student_id)
    data = load_answers()
    data["answers"].append({
        "answer_id": f"ans_{int(time.time() * 1000)}_{len(data['answers'])}",
        "student_id": sid,
        "q_id": body.q_id,
        "kp_id": body.kp_id,
        "chapter_id": body.chapter_id,
        "difficulty": body.difficulty,
        "selected_answer": body.selected_answer,
        "is_correct": body.is_correct,
        "time_spent": body.time_spent,
        "timestamp": int(time.time() * 1000),
    })
    save_answers(data)
    return {"status": "ok", "answer_id": data["answers"][-1]["answer_id"]}


@router.get("/answers")
def get_answers(student_id: str = Query("default"), limit: int = 100, user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    data = load_answers()
    records = [a for a in data["answers"] if a.get("student_id") == sid]
    return sorted(records, key=lambda x: x.get("timestamp", 0), reverse=True)[:limit]
