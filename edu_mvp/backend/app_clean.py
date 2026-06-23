from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
from pathlib import Path

app = FastAPI(title="Edu Agent API")

# CORS 配置（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 加载数据文件
DATA_FILE = Path(__file__).parent.parent / "output" / "result.json"

def load_data():
    if not DATA_FILE.exists():
        return {"knowledge_points": [], "questions": [], "learning_methods": [], "chapters": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        # 兼容处理：如果没有 chapters 字段，从 knowledge_points 提取
        if "chapters" not in data:
            # 从 knowledge_points 中提取唯一的 chapter_id 和 chapter_title
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

@app.get("/")
def root():
    return {"msg": "Edu Agent API is running!"}

@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/api/chapters")
def get_chapters():
    data = load_data()
    return data.get("chapters", [])

@app.get("/api/knowledge-points")
def get_knowledge_points(chapter_id: str = None):
    data = load_data()
    kps = data.get("knowledge_points", [])
    if chapter_id:
        kps = [kp for kp in kps if kp.get("chapter_id") == chapter_id]
    return kps

@app.get("/api/questions")
def get_questions(kp_id: str = None):
    data = load_data()
    qs = data.get("questions", [])
    if kp_id:
        qs = [q for q in qs if q.get("kp_id") == kp_id]
    return qs

@app.get("/api/methods")
def get_methods(kp_id: str = None):
    data = load_data()
    ms = data.get("learning_methods", [])
    if kp_id:
        ms = [m for m in ms if m.get("kp_id") == kp_id]
    return ms

@app.get("/api/stats")
def get_stats():
    data = load_data()
    chapters = data.get("chapters", [])
    kps = data.get("knowledge_points", [])
    qs = data.get("questions", [])
    return {
        "chapters": len(chapters),
        "knowledge_points": len(kps),
        "questions": len(qs),
        "methods": len(data.get("methods", [])),
    }
