"""
初中学习系统 MVP - 陕西+8年级+数学（前2章）
==============================================

修复说明 v2：
- 使用 json5 做容错 JSON 解析（支持尾部逗号、单引号等）
- 每个 Agent 完成后立即写入中间文件，避免中断丢失
- 题库生成每完成一个知识点立即追加写入
"""

import json
import json5
import os
import random
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from typing import Annotated, List, Optional
from operator import add

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict


# ============================================================
# 0. 配置 & 工具函数
# ============================================================

# 加载种子数据
SEED_DATA_PATH = Path(__file__).parent / "data" / "seed_data.json"

def load_seed_chapters():
    """从 seed_data.json 加载章节数据"""
    if not SEED_DATA_PATH.exists():
        raise ValueError(f"种子数据文件不存在：{SEED_DATA_PATH}")
    with open(SEED_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL   = "deepseek-chat"

OUT_DIR = Path(__file__).parent / "output"
OUT_DIR.mkdir(exist_ok=True)


def get_llm(temperature: float = 0.1):
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY 未设置！请在 .env 文件中填写。")
    return ChatOpenAI(
        model=DEEPSEEK_MODEL,
        temperature=temperature,
        openai_api_key=DEEPSEEK_API_KEY,
        openai_api_base=DEEPSEEK_BASE_URL,
        max_retries=2,
        timeout=30,
    )


def _parse_json(raw: str):
    """容错 JSON 解析：支持 markdown 包裹、尾部逗号、单引号。"""
    text = raw.strip()
    # 去除 markdown 代码块
    if "```" in text:
        # 找第一个 ``` 和最后一个 ```
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.startswith("json") or text.startswith("JSON"):
                text = text[4:]
    # 去除前后非 JSON 字符
    text = text.strip()
    if text and text[0] not in ("[", "{"):
        for i, ch in enumerate(text):
            if ch in ("[", "{"):
                text = text[i:]
                break
    if text and text[-1] not in ("]", "}"):
        for i in range(len(text)-1, -1, -1):
            if text[i] in ("]", "}"):
                text = text[:i+1]
                break
    return json5.loads(text)


def _call_llm(system_prompt: str, user_content: str,
              temperature: float = 0.1) -> object:
    """调用 DeepSeek，容错解析 JSON，失败自动重试2次。"""
    llm = get_llm(temperature=temperature)
    last_err = None
    for attempt in range(3):
        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_content),
            ])
            return _parse_json(response.content)
        except Exception as e:
            last_err = e
            print(f"    ⚠ LLM 调用失败（{attempt+1}/3）：{e}")
    raise ValueError(f"LLM 调用失败（已重试3次）：{last_err}")


def _save_intermediate(state: dict, filename: str):
    """将当前 state 写入中间文件。"""
    path = OUT_DIR / filename
    data = {k: v for k, v in state.items() if not k.startswith("_")}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"    💾 中间结果已保存：{path.name}")


def _postprocess_questions(questions: list, kp: dict) -> list:
    """
    后处理题目：修复选择题选项偏移 + 分数标准化。
    每轮随机 shuffle（不同 seed），保证选项分布均匀。
    """
    # 固定每组的选择题为同一个随机种子（基于 kp_id），
    # 保证同样输入下产出一致，不影响 LRU 缓存/重放。
    kp_hash = hash(kp.get("kp_id", "")) & 0xFFFFFFFF
    rng = random.Random(kp_hash)

    for q in questions:
        # Fix 1: 选择题选项随机重排
        if q.get("question_type") == "choice" and q.get("options"):
            opts = q["options"]
            # 记录正确答案的内容
            correct_content = None
            for opt in opts:
                if opt.get("is_correct"):
                    correct_content = opt["content"]
                    break

            if correct_content is not None:
                rng.shuffle(opts)
                new_labels = ["A", "B", "C", "D"]
                for i, opt in enumerate(opts):
                    opt["label"] = new_labels[i]
                    opt["is_correct"] = (opt["content"] == correct_content)
                    if opt["is_correct"]:
                        q["correct_answer"] = new_labels[i]

        # Fix 2: 分数标准化
        diff = q.get("difficulty", "★")
        if diff == "★":
            q["score"] = 3
        elif diff == "★★":
            q["score"] = 5
        elif diff == "★★★":
            q["score"] = 8

    return questions


# ============================================================
# 1. 种子数据（从 data/seed_data.json 动态加载）
# ============================================================


# ============================================================
# 2. State Schema
# ============================================================

class AgentState(TypedDict, total=False):
    province: str
    city: str
    grade: int
    subject: str
    textbook_status: str
    textbook_version: str
    chapters: List[dict]
    extractor_status: str
    knowledge_points: Annotated[List[dict], add]
    extractor_error: Optional[str]
    method_status: str
    learning_methods: List[dict]
    question_status: str
    questions: Annotated[List[dict], add]
    question_error: Optional[str]
    current_agent: str
    error_count: int
    messages: Annotated[List[dict], add]


# ============================================================
# 3. Prompts（简化版，降低 JSON 出错概率）
# ============================================================

PROMPT_EXTRACTOR = """你是一位资深初中数学教研专家。请根据以下内容提取知识点。

# 输入（JSON格式）
{input}

# 输出要求
1. 对每个小节，提取其中的知识点（每个小节2-4个知识点）
2. 每个知识点包含：kp_id、kp_name、chapter_id、section_id、description（80-150字）、difficulty（★/★★/★★★）、importance（核心考点/重要/了解）、curriculum_requirement（理解/掌握/运用）、prerequisites（数组）、exam_frequency（高频/中频/低频）、typical_errors（数组）
3. kp_id 命名规则：MATH8_{chapter_id}_{section_id}_KP{两位数序号}
4. 仅输出一个 JSON 数组，不要输出任何其他文字、不要加 ``` 包裹

# 输出格式示例
[{"kp_id":"MATH8_CH16_SEC01_KP01","kp_name":"勾股定理公式","chapter_id":"CH16","section_id":"CH16_SEC01","description":"...","difficulty":"★★","importance":"核心考点","curriculum_requirement":"掌握","prerequisites":[],"exam_frequency":"高频","typical_errors":["混淆直角边与斜边"]}]
"""

PROMPT_METHOD = """你是一位数学学习方法专家。请为以下知识点设计学习方法。

# 输入（JSON格式）
{input}

# 输出要求
1. 输出一个 JSON 对象
2. 包含字段：kp_id、kp_name、method_type（记忆型/理解型/运算型）、learning_steps（数组，每项含step/action/duration_min）、memory_trick（对象，含type/content）、practice_guide（对象，含base_count/intermediate_count/comprehensive_count）、common_pitfalls（数组，每项含pitfall/why_happens/how_to_avoid）
3. 仅输出 JSON 对象，不要输出任何其他文字

# 输出格式示例
{"kp_id":"MATH8_CH16_SEC01_KP01","kp_name":"勾股定理公式","method_type":"理解型","learning_steps":[{"step":1,"action":"理解面积法证明","duration_min":10}],"memory_trick":{"type":"口诀","content":"直三角斜边c，两小边平方和"},"practice_guide":{"base_count":3,"intermediate_count":2,"comprehensive_count":1},"common_pitfalls":[{"pitfall":"把直角边当斜边","why_happens":"未仔细识别直角","how_to_avoid":"先标直角再确定斜边"}]}
"""

PROMPT_QUESTION = """你是一位中考数学命题专家。请为以下知识点生成3道题目（难度：★、★★、★★★各1道）。

# 输入（JSON格式）
{input}

# 输出要求
1. 输出一个 JSON 数组，包含3个题目对象
2. 每个题目含：q_id（命名规则：{kp_id}_Q{三位数序号}）、kp_id、kp_name、question_type（choice/fill_blank/calculation）、difficulty（★/★★/★★★）、score、question_text、options（选择题用，数组）、correct_answer、solution_steps（数组）、analysis、common_mistakes（数组）
3. 选择题需提供4个选项，标明哪个正确
4. 仅输出 JSON 数组，不要输出任何其他文字、不要加 ``` 包裹

# 输出格式示例
[{"q_id":"MATH8_CH16_SEC01_KP01_Q001","kp_id":"MATH8_CH16_SEC01_KP01","kp_name":"勾股定理公式","question_type":"choice","difficulty":"★","score":3,"question_text":"直角三角形两直角边分别为3和4，则斜边长度为（  ）\nA. 5  B. 6  C. 7  D. 12","options":[{"label":"A","content":"5","is_correct":true},{"label":"B","content":"6","is_correct":false},{"label":"C","content":"7","is_correct":false},{"label":"D","content":"12","is_correct":false}],"correct_answer":"A","solution_steps":[{"step":1,"description":"应用勾股定理：c²=3²+4²=25"},{"step":2,"description":"开方得c=5"}],"analysis":"直接套用勾股定理公式","common_mistakes":["误选D（忘记开方）"]}]
"""


# ============================================================
# 4. Agent 节点函数
# ============================================================

def seed_injector_node(state: AgentState) -> dict:
    print(f"  [种子注入] 注入 {len(load_seed_chapters())} 个章节（北师大版8上全册）")
    return {
        "textbook_status": "success",
        "textbook_version": "北师大版（陕西地区8年级上）",
        "chapters": load_seed_chapters(),
        "current_agent": "seed_injector",
    }


def knowledge_extractor_node(state: AgentState) -> dict:
    print("  [知识梳理] 开始提取知识点...")
    all_kps = []
    for chapter in state.get("chapters", []):
        for section in chapter.get("sections", []):
            user_msg = json.dumps({
                "chapter_title": chapter["chapter_title"],
                "section_title": section["section_title"],
                "section_content": section["content"],
                "chapter_id": chapter["chapter_id"],
                "section_id": section["section_id"],
            }, ensure_ascii=False)
            try:
                kps = _call_llm(PROMPT_EXTRACTOR, user_msg)
                if isinstance(kps, list):
                    all_kps.extend(kps)
                    print(f"    ✓ {section['section_title']}：{len(kps)} 个知识点")
                else:
                    print(f"    ✗ {section['section_title']}：返回格式异常（非数组）")
            except Exception as e:
                print(f"    ✗ {section['section_title']}：{e}")

    print(f"  [知识梳理] 完成，共提取 {len(all_kps)} 个知识点")
    _save_intermediate({**state, "knowledge_points": all_kps}, "kp_partial.json")
    return {
        "extractor_status": "success",
        "knowledge_points": all_kps,
        "current_agent": "knowledge_extractor",
    }


def learning_method_node(state: AgentState) -> dict:
    print("  [学习方法] 开始生成学习方法...")
    methods = []
    for kp in state.get("knowledge_points", []):
        try:
            method = _call_llm(PROMPT_METHOD, json.dumps(kp, ensure_ascii=False), temperature=0.3)
            methods.append(method)
        except Exception as e:
            print(f"    ✗ {kp.get('kp_name','?')}：{e}")
    print(f"  [学习方法] 完成，共生成 {len(methods)} 个方法卡片")
    _save_intermediate({**state, "learning_methods": methods}, "methods_partial.json")
    return {
        "method_status": "success",
        "learning_methods": methods,
        "current_agent": "learning_method",
    }


def question_generator_node(state: AgentState) -> dict:
    print("  [题库生成] 开始生成题目（每知识点3题）...")
    kps = state.get("knowledge_points", [])
    all_questions = []
    q_path = OUT_DIR / "questions_partial.json"

    for i, kp in enumerate(kps):
        try:
            questions = _call_llm(PROMPT_QUESTION, json.dumps(kp, ensure_ascii=False), temperature=0.2)
            if isinstance(questions, list):
                # LLM 不主动输出 chapter_id/section_id，从 kp 补填
                for q in questions:
                    if "chapter_id" not in q or not q.get("chapter_id"):
                        q["chapter_id"] = kp.get("chapter_id", "")
                    if "section_id" not in q or not q.get("section_id"):
                        q["section_id"] = kp.get("section_id", "")
                # 后处理：修复选择题选项偏移 + 分数标准化
                _postprocess_questions(questions, kp)
                all_questions.extend(questions)
                print(f"    ✓ [{i+1}/{len(kps)}] {kp.get('kp_name','?')}：{len(questions)} 题")
            else:
                print(f"    ✗ [{i+1}/{len(kps)}] {kp.get('kp_name','?')}：返回格式异常")
        except Exception as e:
            print(f"    ✗ [{i+1}/{len(kps)}] {kp.get('kp_name','?')}：{e}")

        # 每完成一个知识点立即追加写入
        with open(q_path, "w", encoding="utf-8") as f:
            json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"  [题库生成] 完成，共生成 {len(all_questions)} 道题")
    return {
        "question_status": "success",
        "questions": all_questions,
        "current_agent": "question_generator",
    }


def summary_node(state: AgentState) -> dict:
    result = {
        "province": state.get("province"),
        "city": state.get("city"),
        "grade": state.get("grade"),
        "subject": state.get("subject"),
        "textbook_version": state.get("textbook_version"),
        "chapter_count": len(state.get("chapters", [])),
        "kp_count": len(state.get("knowledge_points", [])),
        "method_count": len(state.get("learning_methods", [])),
        "question_count": len(state.get("questions", [])),
        "chapters": state.get("chapters", []),
        "knowledge_points": state.get("knowledge_points", []),
        "learning_methods": state.get("learning_methods", []),
        "questions": state.get("questions", []),
    }
    with open(OUT_DIR / "result.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print("\n" + "="*52)
    print("  MVP 执行完成！")
    print(f"  章节数　：{result['chapter_count']}")
    print(f"  知识点数：{result['kp_count']}")
    print(f"  方法卡片：{result['method_count']}")
    print(f"  题目数　：{result['question_count']}")
    print(f"  结果已保存至：{OUT_DIR / 'result.json'}")
    print("="*52)
    return {"messages": [{"type": "summary", "result": result}]}


# ============================================================
# 5. 构建图
# ============================================================

def build_graph():
    g = StateGraph(AgentState)
    g.add_node("seed_injector",     seed_injector_node)
    g.add_node("knowledge_extractor", knowledge_extractor_node)
    g.add_node("learning_method",    learning_method_node)
    g.add_node("question_generator", question_generator_node)
    g.add_node("summary",           summary_node)
    g.add_edge(START,               "seed_injector")
    g.add_edge("seed_injector",     "knowledge_extractor")
    g.add_edge("knowledge_extractor", "learning_method")
    g.add_edge("learning_method",    "question_generator")
    g.add_edge("question_generator", "summary")
    g.add_edge("summary",           END)
    return g


def main():
    print("\n  初中学习系统 MVP")
    print("  地区：陕西 | 年级：8年级 | 学科：数学")
    print("  章节：北师大版8上全册（8章23节） | 每知识点：3题\n")

    graph = build_graph()
    app   = graph.compile()

    initial_state = {
        "province": "陕西省",
        "city":     "西安市",
        "grade":    8,
        "subject":  "数学",
        "textbook_status":    "pending",
        "extractor_status":   "pending",
        "method_status":      "pending",
        "question_status":    "pending",
        "current_agent":      "start",
        "error_count":        0,
        "knowledge_points":   [],
        "questions":          [],
        "learning_methods":  [],
        "messages":           [],
    }

    result = app.invoke(initial_state)
    return result


if __name__ == "__main__":
    main()
