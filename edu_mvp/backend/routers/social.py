"""
社交路由 — 班级、积分、勋章、排行榜、家长

P0-1 认证保护
P0-6 IDOR 防护
"""
import time
import secrets
from collections import defaultdict

from fastapi import APIRouter, Depends, Query, Body

from dal import (load_classes, save_classes, load_scores, save_scores,
                 load_answers, load_users, load_parents, save_parents)
from middleware import get_current_user, resolve_student_id

router = APIRouter(prefix="/api", tags=["social"])

BADGE_DEFS = [
    {"id": "新手", "name": "新手入门", "desc": "答对第1题", "correct_needed": 1},
    {"id": "达人", "name": "答题达人", "desc": "答对50题", "correct_needed": 50},
    {"id": "学霸", "name": "学霸", "desc": "答对100题", "correct_needed": 100},
    {"id": "全能", "name": "全能学霸", "desc": "答对200题", "correct_needed": 200},
    {"id": "连胜", "name": "三连胜", "desc": "连续答对3题", "streak_needed": 3},
    {"id": "十连胜", "name": "十连胜", "desc": "连续答对10题", "streak_needed": 10},
]


# ============================================================
# 班级
# ============================================================

@router.post("/classes")
def create_class(name: str = Body(...), teacher_id: str = Body(...),
                 user: dict = Depends(get_current_user)):
    import random, string
    data = load_classes()
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    while any(c.get("join_code") == code for c in data["classes"]):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    tid = resolve_student_id(user, teacher_id)
    cls = {
        "class_id": f"c_{secrets.token_hex(6)}",
        "class_name": name, "teacher_id": tid,
        "join_code": code, "members": [tid],
        "created_at": int(time.time() * 1000),
    }
    data["classes"].append(cls)
    save_classes(data)
    return {"status": "ok", "class": cls}


@router.post("/classes/join")
def join_class(join_code: str = Body(...), student_id: str = Body(...),
               user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    data = load_classes()
    for cls in data["classes"]:
        if cls["join_code"] == join_code:
            if sid not in cls["members"]:
                cls["members"].append(sid)
                save_classes(data)
            return {"status": "ok", "class": {"class_id": cls["class_id"], "class_name": cls["class_name"]}}
    from services import error_response
    return error_response(404, "班级码无效")


@router.get("/classes")
def list_classes(user_id: str = Query(""), user: dict = Depends(get_current_user)):
    uid = resolve_student_id(user, user_id if user_id else None)
    return [c for c in load_classes()["classes"] if uid in c.get("members", [])]


# ============================================================
# 积分 & 勋章
# ============================================================

@router.get("/scores/badges")
def get_badges():
    return {"badges": BADGE_DEFS}


@router.get("/scores/{student_id}")
def get_student_score(student_id: str, user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    data = load_scores()
    for s in data["scores"]:
        if s["student_id"] == sid:
            return s
    return {"student_id": sid, "points": 0, "badges": [], "streak": 0, "updated_at": 0}


@router.post("/scores/award")
def award_points(student_id: str = Body(...), points: int = Body(0),
                 streak: int = Body(0), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    data = load_scores()
    for s in data["scores"]:
        if s["student_id"] == sid:
            s["points"] += points
            if streak > 0: s["streak"] = streak
            s["updated_at"] = int(time.time() * 1000)
            new_b = []
            answers = load_answers()
            total_correct = sum(1 for a in answers["answers"]
                                if a.get("student_id") == sid and a.get("is_correct"))
            for b in BADGE_DEFS:
                if b["id"] in s.get("badges", []): continue
                if b.get("correct_needed") and total_correct >= b["correct_needed"]:
                    s.setdefault("badges", []).append(b["id"]); new_b.append(b["id"])
                elif b.get("streak_needed") and s.get("streak", 0) >= b["streak_needed"]:
                    s.setdefault("badges", []).append(b["id"]); new_b.append(b["id"])
            save_scores(data)
            return {"status": "ok", "points": s["points"], "new_badges": new_b}
    entry = {"student_id": sid, "points": points, "badges": [], "streak": streak,
             "updated_at": int(time.time() * 1000)}
    data["scores"].append(entry)
    save_scores(data)
    return {"status": "ok", "points": points, "new_badges": []}


@router.get("/leaderboard")
def get_leaderboard(limit: int = Query(20, le=100)):
    """排行榜（公开数据）"""
    scores_data = load_scores()
    users_data = load_users()
    user_map = {u["user_id"]: u.get("name", u["username"]) for u in users_data.get("users", [])}
    board = [
        {"rank": i + 1, "student_id": s["student_id"],
         "name": user_map.get(s["student_id"], s["student_id"][:12]),
         "points": s.get("points", 0),
         "badges": s.get("badges", []),
         "streak": s.get("streak", 0)}
        for i, s in enumerate(sorted(scores_data["scores"], key=lambda x: x.get("points", 0), reverse=True))
    ][:limit]
    return {"leaderboard": board, "total": len(scores_data["scores"])}


# ============================================================
# 家长端
# ============================================================

@router.post("/parents/link")
def link_parent(parent_id: str = Body(...), child_id: str = Body(...),
                user: dict = Depends(get_current_user)):
    pid = resolve_student_id(user, parent_id)
    data = load_parents()
    for link in data["links"]:
        if link["parent_id"] == pid and link["child_id"] == child_id:
            return {"status": "ok"}
    data["links"].append({"parent_id": pid, "child_id": child_id})
    save_parents(data)
    return {"status": "ok"}


@router.get("/parents/children")
def get_children(parent_id: str = Query(""), user: dict = Depends(get_current_user)):
    pid = resolve_student_id(user, parent_id if parent_id else None)
    data = load_parents()
    user_data = load_users()
    user_map = {u["user_id"]: u.get("name", u["username"]) for u in user_data.get("users", [])}
    children = [{"user_id": l["child_id"], "name": user_map.get(l["child_id"], l["child_id"])}
                for l in data["links"] if l["parent_id"] == pid]
    return {"children": children}
