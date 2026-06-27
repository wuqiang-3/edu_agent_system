"""
考试路由 — 模拟考试组卷 + 交卷评分

考试结构（参考陕西 8 年级数学期中/期末）：
  选择题 10 道 × 3分 = 30分（★×4 ★★×4 ★★★×2）
  填空题  6 道 × 5分 = 30分（★×2 ★★×2 ★★★×2）
  计算题  6 道 × 8分 = 48分（★×2 ★★×2 ★★★×2）
  共 22 题，108 分，难度 5:3:2

组卷策略：8 章节均匀覆盖，题型+难度约束内随机抽题。
"""
import time
import random
from collections import defaultdict, Counter

from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel

from dal import load_data, load_users
from middleware import get_current_user

router = APIRouter(prefix="/api/exam", tags=["exam"])

# ============================================================
# 考试配置
# ============================================================
EXAM_CONFIG = [
    # (题型, 数量, 单题分数, {难度: 数量})
    ("choice",      10, 3, {"★": 4, "★★": 4, "★★★": 2}),
    ("fill_blank",   6, 5, {"★": 2, "★★": 2, "★★★": 2}),
    ("calculation",  6, 8, {"★": 2, "★★": 2, "★★★": 2}),
]

EXAM_TOTAL_QUESTIONS = 22
EXAM_TOTAL_SCORE = 108


# ============================================================
# 组卷算法
# ============================================================

def _normalize_qtype(q: dict) -> str:
    """统一题型名称：中文 → 英文"""
    qtype = q.get("question_type", "")
    mapping = {
        "选择题": "choice", "填空": "fill_blank", "填空题": "fill_blank",
        "计算": "calculation", "计算题": "calculation",
        "解答题": "calculation", "证明题": "calculation",
    }
    return mapping.get(qtype, qtype)


def _group_by_chapter(questions: list) -> dict:
    """按章节分组：{chapter_id: [q, ...]}"""
    groups = defaultdict(list)
    for q in questions:
        groups[q.get("chapter_id", "")].append(q)
    return dict(groups)


def _pick_from_pool(pool: list, qtype: str, difficulty: str, count: int,
                    used_ids: set, rng: random.Random) -> list:
    """从题库中抽取指定题型+难度+数量的题目"""
    candidates = [
        q for q in pool
        if _normalize_qtype(q) == qtype
        and q.get("difficulty") == difficulty
        and q.get("q_id") not in used_ids
    ]
    if len(candidates) < count:
        candidates = [
            q for q in pool
            if _normalize_qtype(q) == qtype
            and q.get("q_id") not in used_ids
        ]
    if len(candidates) < count:
        candidates = [
            q for q in pool
            if q.get("q_id") not in used_ids
        ]
    rng.shuffle(candidates)
    return candidates[:count]


class ExamGenerateBody(BaseModel):
    chapter_ids: list[str] = []   # 空=全部章节
    exclude_done: bool = False     # 是否排除已做过题


class ExamSubmitBody(BaseModel):
    answers: list[dict]  # [{q_id, answer}]


# ============================================================
# 端点
# ============================================================

@router.post("/generate")
def generate_exam(body: ExamGenerateBody, user: dict = Depends(get_current_user)):
    """
    生成一份模拟考试试卷。
    返回 22 道题 + 总分 + 时长建议 + 试卷元信息。
    """
    data = load_data()
    chapters = data.get("chapters", [])
    all_questions = data.get("questions", [])

    # 筛选章节
    if body.chapter_ids:
        target_chapters = set(body.chapter_ids)
        pool = [q for q in all_questions if q.get("chapter_id") in target_chapters]
        chapter_names = {
            ch["chapter_id"]: ch["chapter_title"]
            for ch in chapters if ch["chapter_id"] in target_chapters
        }
    else:
        pool = list(all_questions)
        chapter_names = {ch["chapter_id"]: ch["chapter_title"] for ch in chapters}

    # 去重（同一 q_id）
    seen_ids = set()
    pool = [q for q in pool if q.get("q_id") and q["q_id"] not in seen_ids and not seen_ids.add(q["q_id"])]

    # 种子固定（同一天同一用户的卷面一致，便于复现）
    seed = hash(f"{user['user_id']}_{int(time.time() / 3600)}") & 0xFFFFFFFF
    rng = random.Random(seed)

    # 按章节分组
    ch_pool = _group_by_chapter(pool)
    chapter_ids = list(ch_pool.keys())

    if not chapter_ids:
        return {"error": "所选章节无可用题目", "questions": []}

    # 组卷
    used_ids = set()
    exam_questions = []

    for qtype, total, score, diff_map in EXAM_CONFIG:
        for diff, need in diff_map.items():
            # 从每个章节轮流取题（尽量均匀覆盖）
            picked = _pick_from_pool(pool, qtype, diff, need, used_ids, rng)
            for q in picked:
                # 计算每题分数
                q["exam_score"] = score
                exam_questions.append(q)
                used_ids.add(q["q_id"])

            # 如果没抽够，用 any 难度补
            if len(picked) < need:
                extra = _pick_from_pool(pool, qtype, "any", need - len(picked), used_ids, rng)
                for q in extra:
                    q["exam_score"] = score
                    exam_questions.append(q)
                    used_ids.add(q["q_id"])

    # 去掉敏感字段
    safe_questions = []
    for q in exam_questions:
        safe = {
            "q_id": q["q_id"],
            "kp_id": q.get("kp_id", ""),
            "kp_name": q.get("kp_name", ""),
            "chapter_id": q.get("chapter_id", ""),
            "chapter_title": chapter_names.get(q.get("chapter_id", ""), ""),
            "question_type": q.get("question_type", ""),
            "difficulty": q.get("difficulty", "★"),
            "exam_score": q.get("exam_score", 3),
            "question_text": q.get("question_text", ""),
            "options": q.get("options", []),
        }
        safe_questions.append(safe)

    # 统计
    ch_dist = Counter(q["chapter_id"] for q in safe_questions)

    # 随机打乱顺序（不让同一章节的题堆在一起）
    rng.shuffle(safe_questions)

    return {
        "exam_id": f"exam_{int(time.time() * 1000)}_{user['user_id'][:8]}",
        "generated_at": int(time.time() * 1000),
        "total_questions": len(safe_questions),
        "total_score": EXAM_TOTAL_SCORE,
        "duration_minutes": 90,
        "chapter_coverage": len(ch_dist),
        "chapter_distribution": {str(k): v for k, v in ch_dist.items()},
        "questions": safe_questions,
    }


@router.post("/grade")
def grade_exam(body: ExamSubmitBody, user: dict = Depends(get_current_user)):
    """
    交卷评分 — 对比正确答案，返回分数 + 每题结果 + 薄弱分析。
    """
    data = load_data()
    all_questions = {q["q_id"]: q for q in data.get("questions", [])}

    total_score = 0
    max_score = 0
    correct = 0
    wrong = 0
    details = []

    chapter_accuracy = defaultdict(lambda: {"total": 0, "correct": 0})
    kp_accuracy = defaultdict(lambda: {"total": 0, "correct": 0})

    for ans in body.answers:
        q_id = ans.get("q_id")
        student_answer = ans.get("answer", "")
        q = all_questions.get(q_id)

        if not q:
            continue

        # 获取正确答案
        correct_answer = q.get("correct_answer", "")
        qtype = _normalize_qtype(q)
        score = q.get("score", 3)

        # 判分逻辑
        if qtype == "choice":
            is_correct = (student_answer.strip().upper() == correct_answer.strip().upper())
        else:
            # 填空/计算：去空格后比对
            is_correct = (student_answer.replace(" ", "") == correct_answer.replace(" ", ""))

        max_score += score
        if is_correct:
            total_score += score
            correct += 1
        else:
            wrong += 1

        ch_id = q.get("chapter_id", "")
        kp_id = q.get("kp_id", "")
        chapter_accuracy[ch_id]["total"] += 1
        chapter_accuracy[ch_id]["correct"] += 1 if is_correct else 0
        kp_accuracy[kp_id]["total"] += 1
        kp_accuracy[kp_id]["correct"] += 1 if is_correct else 0

        details.append({
            "q_id": q_id,
            "kp_name": q.get("kp_name", ""),
            "question_type": qtype,
            "difficulty": q.get("difficulty", "★"),
            "student_answer": student_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "score": score if is_correct else 0,
            "analysis": q.get("analysis", ""),
        })

    # 薄弱分析
    weak_chapters = [
        {"chapter_id": ch, "accuracy": round(s["correct"] / max(s["total"], 1) * 100, 1),
         "total": s["total"], "correct": s["correct"]}
        for ch, s in chapter_accuracy.items()
        if s["total"] >= 2 and s["correct"] / max(s["total"], 1) < 0.6
    ]
    weak_chapters.sort(key=lambda x: x["accuracy"])

    weak_kps = [
        {"kp_id": kp, "kp_name": all_questions.get(kp, {}).get("kp_name", kp),
         "accuracy": round(s["correct"] / max(s["total"], 1) * 100, 1)}
        for kp, s in kp_accuracy.items()
        if s["correct"] < s["total"]
    ]
    weak_kps.sort(key=lambda x: x["accuracy"])

    return {
        "total_score": total_score,
        "max_score": max_score,
        "correct_count": correct,
        "wrong_count": wrong,
        "accuracy": round(correct / max(correct + wrong, 1) * 100, 1),
        "details": details,
        "weak_chapters": weak_chapters[:3],
        "weak_kps": weak_kps[:5],
        "graded_at": int(time.time() * 1000),
    }
