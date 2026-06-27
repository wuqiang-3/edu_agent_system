"""
管理台路由 — 题目/知识点/学习方法的 CRUD + 导入导出

P0-7 全部 require_admin
"""
import json

from fastapi import APIRouter, Depends, Body

from dal import load_data, save_data
from middleware import require_admin
from services import error_response

router = APIRouter(prefix="/api", tags=["admin"], dependencies=[Depends(require_admin)])


@router.put("/questions/{q_id}")
def update_question(q_id: str, body: dict = Body(...)):
    data = load_data()
    for q in data.get("questions", []):
        if q.get("q_id") == q_id:
            for k, v in body.items():
                if k != "q_id":
                    q[k] = v
            save_data(data)
            return {"status": "ok", "q_id": q_id}
    return error_response(404, "题目不存在")


@router.delete("/questions/{q_id}")
def delete_question(q_id: str):
    data = load_data()
    before = len(data.get("questions", []))
    data["questions"] = [q for q in data["questions"] if q.get("q_id") != q_id]
    if len(data["questions"]) < before:
        save_data(data)
        return {"status": "ok", "deleted": q_id}
    return error_response(404, "题目不存在")


@router.put("/knowledge-points/{kp_id}")
def update_knowledge_point(kp_id: str, body: dict = Body(...)):
    data = load_data()
    for kp in data.get("knowledge_points", []):
        if kp.get("kp_id") == kp_id:
            for k, v in body.items():
                if k not in ("kp_id", "chapter_id", "section_id"):
                    kp[k] = v
            save_data(data)
            return {"status": "ok", "kp_id": kp_id}
    return error_response(404, "知识点不存在")


@router.put("/learning-methods/{kp_id}")
def update_learning_method(kp_id: str, body: dict = Body(...)):
    data = load_data()
    for m in data.get("learning_methods", []):
        if m.get("kp_id") == kp_id:
            for k, v in body.items():
                if k != "kp_id":
                    m[k] = v
            save_data(data)
            return {"status": "ok", "kp_id": kp_id}
    return error_response(404, "学习方法不存在")


@router.get("/questions/export")
def export_questions():
    data = load_data()
    return {
        "total": len(data.get("questions", [])),
        "questions": data.get("questions", []),
    }


@router.post("/questions/import")
def import_questions(body: dict = Body(...)):
    new_questions = body.get("questions", [])
    if not isinstance(new_questions, list) or len(new_questions) == 0:
        return error_response(400, "请提供 questions 数组")

    data = load_data()
    added = 0
    for q in new_questions:
        if q.get("q_id") and not any(ex.get("q_id") == q["q_id"] for ex in data.get("questions", [])):
            q.setdefault("chapter_id", "")
            q.setdefault("kp_id", "")
            q.setdefault("kp_name", "")
            q.setdefault("question_type", "choice")
            q.setdefault("difficulty", "★")
            q.setdefault("score", 3)
            q.setdefault("analysis", "")
            q.setdefault("solution_steps", [])
            data.setdefault("questions", []).append(q)
            added += 1

    if added > 0:
        save_data(data)
    return {"status": "ok", "added": added}
