"""
数据访问层 (DAL) — 统一的文件读写 + 锁 + 原子操作

所有 JSON 文件读写必须经过这里，禁止业务层直接 open()。
"""
import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Dict, Optional

# ============================================================
# 数据文件路径定义
# ============================================================
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"

DATA_FILE = OUTPUT_DIR / "result.json"
WRONG_FILE = OUTPUT_DIR / "wrong_questions.json"
FAVORITE_FILE = OUTPUT_DIR / "favorites.json"
USERS_FILE = OUTPUT_DIR / "users.json"
SESSIONS_FILE = OUTPUT_DIR / "sessions.json"
ANSWERS_FILE = OUTPUT_DIR / "answers.json"
CLASSES_FILE = OUTPUT_DIR / "classes.json"
SCORES_FILE = OUTPUT_DIR / "scores.json"
PARENTS_FILE = OUTPUT_DIR / "parents.json"

# ============================================================
# 线程锁（每类数据一把锁）
# ============================================================
_locks = {
    "wrong": threading.Lock(),
    "fav": threading.Lock(),
    "answers": threading.Lock(),
    "users": threading.Lock(),
    "sessions": threading.Lock(),
    "classes": threading.Lock(),
    "scores": threading.Lock(),
    "parents": threading.Lock(),
    "data": threading.Lock(),
}

# 文件路径 → 锁名 映射
_FILE_LOCK_MAP = {
    WRONG_FILE: "wrong",
    FAVORITE_FILE: "fav",
    ANSWERS_FILE: "answers",
    USERS_FILE: "users",
    SESSIONS_FILE: "sessions",
    CLASSES_FILE: "classes",
    SCORES_FILE: "scores",
    PARENTS_FILE: "parents",
    DATA_FILE: "data",
}


# ============================================================
# 核心读写函数
# ============================================================

def load_json(path: Path, default: Any) -> Any:
    """读取 JSON 文件，不存在返回 default"""
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    """原子写入 JSON 文件（先写 tmp → fsync → os.replace），加线程锁防并发覆盖"""
    lock_name = _FILE_LOCK_MAP.get(path, "data")
    lock = _locks[lock_name]
    with lock:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", suffix=".json",
            dir=str(path.parent), delete=False,
        )
        try:
            json.dump(data, tmp, ensure_ascii=False, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp.close()
            os.replace(tmp.name, str(path))
        except Exception:
            tmp.close()
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
            raise


# ============================================================
# 便捷封装（每个文件一对 load/save）
# ============================================================

def load_wrong() -> dict:
    return load_json(WRONG_FILE, {})

def save_wrong(data: dict) -> None:
    save_json(WRONG_FILE, data)

def load_fav() -> dict:
    return load_json(FAVORITE_FILE, {})

def save_fav(data: dict) -> None:
    save_json(FAVORITE_FILE, data)

def load_answers() -> dict:
    return load_json(ANSWERS_FILE, {"answers": []})

def save_answers(data: dict) -> None:
    save_json(ANSWERS_FILE, data)

def load_users() -> dict:
    return load_json(USERS_FILE, {"users": []})

def save_users(data: dict) -> None:
    save_json(USERS_FILE, data)

def load_sessions() -> dict:
    return load_json(SESSIONS_FILE, {"sessions": []})

def save_sessions(data: dict) -> None:
    save_json(SESSIONS_FILE, data)

def load_classes() -> dict:
    return load_json(CLASSES_FILE, {"classes": []})

def save_classes(data: dict) -> None:
    save_json(CLASSES_FILE, data)

def load_scores() -> dict:
    return load_json(SCORES_FILE, {"scores": []})

def save_scores(data: dict) -> None:
    save_json(SCORES_FILE, data)

def load_parents() -> dict:
    return load_json(PARENTS_FILE, {"links": []})

def save_parents(data: dict) -> None:
    save_json(PARENTS_FILE, data)

def load_data() -> dict:
    """加载主数据文件 result.json，兼容 chapters 字段"""
    data = load_json(DATA_FILE, {"knowledge_points": [], "questions": [], "learning_methods": [], "chapters": []})
    if "chapters" not in data:
        chapters = {}
        for kp in data.get("knowledge_points", []):
            cid = kp.get("chapter_id", "")
            if cid and cid not in chapters:
                chapters[cid] = {
                    "chapter_id": cid,
                    "chapter_title": kp.get("chapter_title", cid),
                    "kp_count": 1,
                }
            elif cid:
                chapters[cid]["kp_count"] += 1
        data["chapters"] = list(chapters.values())
    return data

def save_data(data: dict) -> None:
    save_json(DATA_FILE, data)
