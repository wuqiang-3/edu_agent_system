"""
分析路由 — 薄弱知识点、推荐、自适应、学习路径、复习计划、学习报告

P0-1 认证保护
P0-6 IDOR 防护
"""
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Query

from dal import load_answers, load_data
from middleware import get_current_user, resolve_student_id

router = APIRouter(prefix="/api", tags=["analysis"])

DIFF_LEVELS = ["★", "★★", "★★★"]


@router.get("/analysis/weak-points")
def get_weak_points(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    data = load_answers()
    records = [a for a in data["answers"] if a.get("student_id") == sid]
    if not records:
        return {"weak_points": [], "total_analyzed": 0}

    kp_stats = defaultdict(lambda: {"total": 0, "correct": 0, "total_time": 0})
    for r in records:
        kp = r["kp_id"]
        kp_stats[kp]["total"] += 1
        kp_stats[kp]["correct"] += 1 if r["is_correct"] else 0
        kp_stats[kp]["total_time"] += r.get("time_spent", 0)

    rd = load_data()
    kp_names = {kp["kp_id"]: kp["kp_name"] for kp in rd.get("knowledge_points", [])}

    weak_points = []
    for kp_id, st in kp_stats.items():
        accuracy = round(st["correct"] / st["total"] * 100, 1)
        avg_time = round(st["total_time"] / st["total"], 0)
        status = "weak" if accuracy < 60 else "moderate" if accuracy < 80 else "strong"
        weak_points.append({
            "kp_id": kp_id,
            "kp_name": kp_names.get(kp_id, kp_id),
            "total_attempts": st["total"],
            "correct_count": st["correct"],
            "accuracy": accuracy,
            "avg_time_spent": avg_time,
            "status": status,
        })

    weak_points.sort(key=lambda x: x["accuracy"])
    return {
        "weak_points": weak_points,
        "total_analyzed": len(records),
        "total_kps": len(weak_points),
    }


@router.get("/analysis/recommendations")
def get_recommendations(student_id: str = Query("default"), max_count: int = 5, user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    analysis = get_weak_points(sid, user)
    weak_kps = [wp for wp in analysis.get("weak_points", []) if wp["status"] in ("weak", "moderate")]
    if not weak_kps:
        return {"recommendations": [], "message": "暂无薄弱知识点，继续保持！"}

    rd = load_data()
    all_questions = rd.get("questions", [])
    answers_data = load_answers()
    done_qids = {a["q_id"] for a in answers_data["answers"] if a.get("student_id") == sid}

    recs = []
    for wp in weak_kps:
        suggested_diff = "★" if wp["accuracy"] < 40 else "★★"
        candidates = [q for q in all_questions
                      if q.get("kp_id") == wp["kp_id"]
                      and q.get("difficulty") == suggested_diff
                      and q.get("q_id") not in done_qids]
        if not candidates:
            candidates = [q for q in all_questions
                          if q.get("kp_id") == wp["kp_id"]
                          and q.get("q_id") not in done_qids]
        if candidates:
            recs.append(candidates[0])
        if len(recs) >= max_count:
            break

    return {"recommendations": recs, "weak_kps_count": len(weak_kps)}


def _get_student_accuracy_per_diff(student_id: str, kp_id: str) -> dict:
    data = load_answers()
    records = [a for a in data["answers"]
               if a.get("student_id") == student_id and a.get("kp_id") == kp_id]
    if not records:
        return {}
    stats = defaultdict(lambda: {"total": 0, "correct": 0})
    for r in records:
        diff = r.get("difficulty", "★")
        stats[diff]["total"] += 1
        stats[diff]["correct"] += 1 if r.get("is_correct") else 0
    return {diff: {"total": s["total"], "correct": s["correct"],
                   "accuracy": round(s["correct"] / s["total"] * 100, 1)}
            for diff, s in stats.items()}


def _suggest_difficulty(diff_stats: dict) -> str:
    if not diff_stats:
        return "★"
    for diff in reversed(DIFF_LEVELS):
        if diff in diff_stats:
            s = diff_stats[diff]
            idx = DIFF_LEVELS.index(diff)
            if s["accuracy"] >= 80 and idx < len(DIFF_LEVELS) - 1:
                return DIFF_LEVELS[idx + 1]
            elif s["accuracy"] < 40 and idx > 0:
                return DIFF_LEVELS[idx - 1]
            return diff
    return "★"


@router.get("/adaptive-questions")
def get_adaptive_questions(kp_id: str, student_id: str = Query("default"),
                           count: int = Query(3, ge=1, le=10),
                           user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    diff_stats = _get_student_accuracy_per_diff(sid, kp_id)
    suggested_diff = _suggest_difficulty(diff_stats)

    rd = load_data()
    answers_data = load_answers()
    done_qids = {a["q_id"] for a in answers_data["answers"]
                 if a.get("student_id") == sid and a.get("kp_id") == kp_id}

    candidates = []
    target_idx = DIFF_LEVELS.index(suggested_diff)
    ordered = [suggested_diff]
    for offset in range(1, len(DIFF_LEVELS)):
        if target_idx - offset >= 0:
            ordered.append(DIFF_LEVELS[target_idx - offset])
        if target_idx + offset < len(DIFF_LEVELS):
            ordered.append(DIFF_LEVELS[target_idx + offset])
    seen = set()
    ordered_unique = [d for d in ordered if not (d in seen or seen.add(d))]

    for diff in ordered_unique:
        if len(candidates) >= count:
            break
        for q in rd.get("questions", []):
            if q.get("kp_id") == kp_id and q.get("difficulty") == diff and q.get("q_id") not in done_qids:
                candidates.append(q)
                if len(candidates) >= count:
                    break

    total_questions_for_kp = len([q for q in rd.get("questions", []) if q.get("kp_id") == kp_id])
    all_answered = total_questions_for_kp > 0 and len(done_qids) >= total_questions_for_kp

    review_mode = False
    if all_answered and len(candidates) == 0:
        review_mode = True
        for diff in ordered_unique:
            if len(candidates) >= count:
                break
            for q in rd.get("questions", []):
                if q.get("kp_id") == kp_id and q.get("difficulty") == diff:
                    candidates.append(q)
                    if len(candidates) >= count:
                        break

    return {
        "suggested_difficulty": suggested_diff,
        "diff_stats": diff_stats,
        "questions": candidates,
        "total_available": len(candidates),
        "all_answered": all_answered,
        "review_mode": review_mode,
        "total_questions": total_questions_for_kp,
    }


@router.get("/analysis/learning-path")
def get_learning_path(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    rd = load_data()
    kps = rd.get("knowledge_points", [])
    if not kps:
        return {"learning_path": [], "next_to_study": None}

    name_to_id = {kp["kp_name"]: kp["kp_id"] for kp in kps}
    answers_data = load_answers()
    student_answers = [a for a in answers_data["answers"] if a.get("student_id") == sid]

    kp_accuracy = defaultdict(lambda: {"total": 0, "correct": 0})
    for a in student_answers:
        kp = a.get("kp_id", "")
        kp_accuracy[kp]["total"] += 1
        kp_accuracy[kp]["correct"] += 1 if a.get("is_correct") else 0

    kp_accuracy_pct = {kp: round(s["correct"] / max(s["total"], 1) * 100, 1)
                       for kp, s in kp_accuracy.items()}

    path = []
    for kp in kps:
        kp_id = kp["kp_id"]
        acc = kp_accuracy_pct.get(kp_id, None)
        prereqs = kp.get("prerequisites", [])
        prereq_ids = []
        prereq_blocked = []
        for p_name in prereqs:
            p_id = name_to_id.get(p_name)
            if p_id:
                prereq_ids.append(p_id)
                p_acc = kp_accuracy_pct.get(p_id, None)
                if p_acc is None or p_acc < 80:
                    prereq_blocked.append(p_name)
        if acc is not None and acc >= 80:
            status = "mastered"
        elif not prereq_blocked:
            status = "ready"
        else:
            status = "blocked"
        path.append({
            "kp_id": kp_id, "kp_name": kp["kp_name"],
            "chapter_id": kp.get("chapter_id", ""),
            "difficulty": kp.get("difficulty", ""),
            "importance": kp.get("importance", ""),
            "status": status, "accuracy": acc,
            "prerequisites": prereqs, "prereq_ids": prereq_ids,
            "prereq_blocked": prereq_blocked,
        })

    next_to_study = next((p for p in path if p["status"] == "ready"), None)
    counts = defaultdict(int)
    for p in path:
        counts[p["status"]] += 1

    return {
        "learning_path": path, "next_to_study": next_to_study,
        "total_kps": len(kps),
        "mastered": counts.get("mastered", 0),
        "ready": counts.get("ready", 0),
        "blocked": counts.get("blocked", 0),
        "no_data": counts.get("no_data", 0),
    }


@router.get("/analysis/review-schedule")
def get_review_schedule(student_id: str = Query("default"), user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    now = int(time.time() * 1000)
    DAY_MS = 86400000
    HOUR_MS = 3600000
    REVIEW_INTERVALS = [
        ("🔵 即时复习", 10 * 60 * 1000),
        ("🟡 次日复习", DAY_MS),
        ("🟠 周复习", 7 * DAY_MS),
        ("🔴 月复习", 30 * DAY_MS),
    ]

    answers_data = load_answers()
    records = [a for a in answers_data["answers"] if a.get("student_id") == sid]
    if not records:
        return {"reviews": [], "due_count": 0, "total_kps": 0}

    rd = load_data()
    kp_names = {kp["kp_id"]: kp["kp_name"] for kp in rd.get("knowledge_points", [])}

    first_study = {}
    for r in sorted(records, key=lambda x: x.get("timestamp", 0)):
        kp = r.get("kp_id", "")
        if kp and kp not in first_study:
            first_study[kp] = r["timestamp"]

    last_answer = {}
    for r in records:
        kp = r.get("kp_id", "")
        ts = r.get("timestamp", 0)
        if kp and (kp not in last_answer or ts > last_answer[kp]):
            last_answer[kp] = ts

    reviews = []
    for kp_id, first_ts in first_study.items():
        for label, interval in REVIEW_INTERVALS:
            review_time = first_ts + interval
            due = review_time <= now
            last_ts = last_answer.get(kp_id, 0)
            refreshed_since = last_ts > review_time if last_ts else False
            remaining = review_time - now
            if due:
                reviews.append({
                    "kp_id": kp_id, "kp_name": kp_names.get(kp_id, kp_id),
                    "review_label": label, "interval_hours": int(interval / HOUR_MS),
                    "due": True, "refreshed": refreshed_since,
                    "overdue_hours": int(abs(remaining) / HOUR_MS),
                    "first_study": first_ts,
                })

    reviews.sort(key=lambda x: x.get("overdue_hours", 0), reverse=True)
    return {"reviews": reviews, "due_count": len(reviews), "total_kps": len(first_study)}


@router.get("/analysis/learning-report")
def get_learning_report(student_id: str = Query("default"),
                        period: str = Query("weekly", pattern="^(weekly|monthly)$"),
                        user: dict = Depends(get_current_user)):
    sid = resolve_student_id(user, student_id)
    now = int(time.time() * 1000)
    DAY_MS = 86400000
    if period == "weekly":
        since = now - 7 * DAY_MS
        period_label = "周报"
        period_days = 7
    else:
        since = now - 30 * DAY_MS
        period_label = "月报"
        period_days = 30

    answers_data = load_answers()
    records = [a for a in answers_data["answers"]
               if a.get("student_id") == sid and a.get("timestamp", 0) >= since]

    total = len(records)
    correct = sum(1 for a in records if a.get("is_correct"))
    wrong = total - correct
    accuracy = round(correct / max(total, 1) * 100, 1)
    total_time = sum(a.get("time_spent", 0) for a in records)

    rd = load_data()
    ch_questions = {q["q_id"]: q.get("chapter_id", "") for q in rd.get("questions", [])}
    ch_names = {ch["chapter_id"]: ch["chapter_title"] for ch in rd.get("chapters", [])}

    ch_stats = defaultdict(lambda: {"total": 0, "correct": 0})
    for a in records:
        ch = ch_questions.get(a.get("q_id", ""), "未知")
        ch_stats[ch]["total"] += 1
        ch_stats[ch]["correct"] += 1 if a.get("is_correct") else 0

    chapter_summary = [
        {"chapter_id": ch_id, "chapter_title": ch_names.get(ch_id, ch_id),
         "total": s["total"], "correct": s["correct"],
         "accuracy": round(s["correct"] / max(s["total"], 1) * 100, 1)}
        for ch_id, s in ch_stats.items()
    ]
    chapter_summary.sort(key=lambda x: x["accuracy"])

    prev_since = since - period_days * DAY_MS
    prev_records = [a for a in answers_data["answers"]
                    if a.get("student_id") == sid
                    and prev_since <= a.get("timestamp", 0) < since]

    def kp_accuracy(recs):
        stats = defaultdict(lambda: {"total": 0, "correct": 0})
        for a in recs:
            kp = a.get("kp_id", "")
            stats[kp]["total"] += 1
            stats[kp]["correct"] += 1 if a.get("is_correct") else 0
        return {kp: round(s["correct"] / max(s["total"], 1) * 100, 1) for kp, s in stats.items()}

    current_kp = kp_accuracy(records)
    prev_kp = kp_accuracy(prev_records)
    kp_names = {kp["kp_id"]: kp["kp_name"] for kp in rd.get("knowledge_points", [])}

    improved, declined = [], []
    for kp_id in set(list(current_kp.keys()) + list(prev_kp.keys())):
        cur = current_kp.get(kp_id, 0)
        pre = prev_kp.get(kp_id, 0)
        if cur > pre + 10:
            improved.append({"kp_id": kp_id, "kp_name": kp_names.get(kp_id, kp_id), "prev": pre, "current": cur})
        elif cur < pre - 10:
            declined.append({"kp_id": kp_id, "kp_name": kp_names.get(kp_id, kp_id), "prev": pre, "current": cur})
    improved.sort(key=lambda x: x["current"] - x["prev"], reverse=True)
    declined.sort(key=lambda x: x["prev"] - x["current"], reverse=True)

    return {
        "period": period_label, "period_days": period_days,
        "total_questions": total, "correct": correct, "wrong": wrong,
        "accuracy": accuracy, "total_time_min": round(total_time / 60, 1),
        "daily_avg": round(total / max(period_days, 1), 1),
        "chapter_summary": chapter_summary,
        "improved_kps": improved[:5], "declined_kps": declined[:5],
    }
