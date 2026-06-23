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


# ============================================================
# 1. 种子数据
# ============================================================

SEED_CHAPTERS = [
    # ===== 第1章：勾股定理 =====
    {
        "chapter_id": "CH01",
        "chapter_title": "勾股定理",
        "chapter_order": 1,
        "sections": [
            {
                "section_id": "CH01_SEC01",
                "section_title": "勾股定理",
                "content": (
                    "勾股定理：直角三角形两直角边a、b的平方和，等于斜边c的平方。\n"
                    "公式：a² + b² = c²\n"
                    "应用：已知两边求第三边；解决实际问题（如梯子滑动、最短路径）。\n"
                    "勾股定理的逆定理：若三角形三边满足a²+b²=c²，则该三角形为直角三角形。"
                ),
            },
            {
                "section_id": "CH01_SEC02",
                "section_title": "勾股定理的应用",
                "content": (
                    "最短路径问题：立体图形表面两点间最短距离，需展开成平面图形后用勾股定理。\n"
                    "航海问题：船只航行方向问题，建立直角三角形模型。\n"
                    "勾股数：满足a²+b²=c²的正整数组，如(3,4,5)、(5,12,13)。"
                ),
            },
        ],
        "key_knowledge_points": ["勾股定理公式", "勾股定理逆定理", "最短路径问题", "勾股数"],
    },
    # ===== 第2章：实数 =====
    {
        "chapter_id": "CH02",
        "chapter_title": "实数",
        "chapter_order": 2,
        "sections": [
            {
                "section_id": "CH02_SEC01",
                "section_title": "平方根",
                "content": (
                    "平方根：若x²=a（a≥0），则x叫做a的平方根，记作±√a。\n"
                    "算术平方根：非负数a的非负平方根，记作√a。\n"
                    "性质：正数有两个平方根（互为相反数）；0的平方根是0；负数没有平方根。"
                ),
            },
            {
                "section_id": "CH02_SEC02",
                "section_title": "立方根",
                "content": (
                    "立方根：若x³=a，则x叫做a的立方根，记作³√a。\n"
                    "性质：任何实数都有且仅有一个立方根；符号与被开方数相同。\n"
                    "开立方：求一个数立方根的运算叫做开立方。"
                ),
            },
            {
                "section_id": "CH02_SEC03",
                "section_title": "实数",
                "content": (
                    "无理数：无限不循环小数（如√2、π）。\n"
                    "实数：有理数和无理数的统称。\n"
                    "实数与数轴：实数与数轴上的点一一对应。"
                ),
            },
        ],
        "key_knowledge_points": ["平方根概念", "算术平方根", "立方根概念", "无理数定义", "实数分类"],
    },
    # ===== 第3章：位置与坐标 =====
    {
        "chapter_id": "CH03",
        "chapter_title": "位置与坐标",
        "chapter_order": 3,
        "sections": [
            {
                "section_id": "CH03_SEC01",
                "section_title": "平面直角坐标系",
                "content": (
                    "平面直角坐标系：由两条互相垂直的数轴构成，交点为原点O(0,0)。\n"
                    "点的坐标：点P在平面内的位置用有序数对(x,y)表示，x叫横坐标，y叫纵坐标。\n"
                    "象限：坐标系被分为四个象限（I、II、III、IV），坐标轴上的点不属于任何象限。"
                ),
            },
            {
                "section_id": "CH03_SEC02",
                "section_title": "坐标变换",
                "content": (
                    "平移变换：点(x,y)向右平移a个单位→(x+a,y)；向左平移a个单位→(x-a,y)。\n"
                    "上下平移：点(x,y)向上平移b个单位→(x,y+b)；向下平移b个单位→(x,y-b)。\n"
                    "对称变换：关于x轴对称→(x,-y)；关于y轴对称→(-x,y)；关于原点对称→(-x,-y)。"
                ),
            },
        ],
        "key_knowledge_points": ["坐标系概念", "点的坐标表示", "象限判断", "坐标平移", "坐标对称"],
    },
    # ===== 第4章：一次函数 =====
    {
        "chapter_id": "CH04",
        "chapter_title": "一次函数",
        "chapter_order": 4,
        "sections": [
            {
                "section_id": "CH04_SEC01",
                "section_title": "函数概念",
                "content": (
                    "函数：在一个变化过程中，有两个变量x和y，如果给定一个x值，y都有唯一确定的值与之对应，那么x是自变量，y是x的函数。\n"
                    "函数值：对于自变量x在取值范围内的一个确定的值a，函数y所对应的值，叫做当x=a时的函数值。\n"
                    "函数的表示方法：解析法、列表法、图象法。"
                ),
            },
            {
                "section_id": "CH04_SEC02",
                "section_title": "一次函数",
                "content": (
                    "一次函数：形如y=kx+b（k≠0）的函数叫做一次函数。\n"
                    "正比例函数：当b=0时，y=kx（k≠0）叫做正比例函数。\n"
                    "一次函数的图象：一条直线，过点(0,b)和(-b/k,0)。\n"
                    "一次函数的性质：k>0时y随x增大而增大；k<0时y随x增大而减小。"
                ),
            },
            {
                "section_id": "CH04_SEC03",
                "section_title": "一次函数的应用",
                "content": (
                    "用一次函数解决实际问题：建立函数模型→求解析式→利用图象或解析式解决问题。\n"
                    "方程、不等式与函数的关系：kx+b=0的解是直线与x轴交点的横坐标；kx+b>0的解集是直线在x轴上方的部分。\n"
                    "方案选择问题：比较不同方案的优劣，选择最优解。"
                ),
            },
        ],
        "key_knowledge_points": ["函数概念", "一次函数解析式", "一次函数图象", "一次函数性质", "一次函数应用"],
    },
    # ===== 第5章：二元一次方程组 =====
    {
        "chapter_id": "CH05",
        "chapter_title": "二元一次方程组",
        "chapter_order": 5,
        "sections": [
            {
                "section_id": "CH05_SEC01",
                "section_title": "二元一次方程组",
                "content": (
                    "二元一次方程：含有两个未知数，并且所含未知数的项的次数都是1的方程。\n"
                    "二元一次方程组：由两个二元一次方程组成的方程组。\n"
                    "二元一次方程的解：使方程两边相等的两个未知数的值，叫做二元一次方程的解（有无数组）。\n"
                    "二元一次方程组的解：方程组中各个方程的公共解，叫做二元一次方程组的解。"
                ),
            },
            {
                "section_id": "CH05_SEC02",
                "section_title": "消元法",
                "content": (
                    "代入消元法：从一个方程中用含一个未知数的代数式表示另一个未知数，再代入另一个方程，实现消元。\n"
                    "加减消元法：把两个方程的两边分别相加或相减，消去一个未知数，得到一个一元一次方程。\n"
                    "选择消元方法：某个未知数系数为±1时，用代入法；同一未知数系数相等或互为相反数时，用加减法。"
                ),
            },
            {
                "section_id": "CH05_SEC03",
                "section_title": "二元一次方程组的应用",
                "content": (
                    "列二元一次方程组解应用题：审题→设未知数→列方程组→解方程组→检验→作答。\n"
                    "常见题型：行程问题、工程问题、利润问题、数字问题。\n"
                    "含参问题：已知方程组的解，求参数的值；或已知方程组的解的情况，求参数的取值范围。"
                ),
            },
        ],
        "key_knowledge_points": ["二元一次方程组概念", "代入消元法", "加减消元法", "列方程组解应用题", "含参问题"],
    },
    # ===== 第6章：数据的分析 =====
    {
        "chapter_id": "CH06",
        "chapter_title": "数据的分析",
        "chapter_order": 6,
        "sections": [
            {
                "section_id": "CH06_SEC01",
                "section_title": "平均数",
                "content": (
                    "算术平均数：一组数据的和除以这组数据的个数所得到的商。\n"
                    "加权平均数：如果n个数中，x₁出现f₁次，x₂出现f₂次...，那么这组数据的平均数为(x₁f₁+x₂f₂+...+xₖfₖ)/(f₁+f₂+...+fₖ)。\n"
                    "平均数的意义：反映一组数据的集中趋势，但容易受极端值影响。"
                ),
            },
            {
                "section_id": "CH06_SEC02",
                "section_title": "中位数与众数",
                "content": (
                    "中位数：将一组数据按照由小到大（或由大到小）的顺序排列，如果数据的个数是奇数，则处于中间位置的数就是这组数据的中位数；如果数据的个数是偶数，则中间两个数据的平均数就是这组数据的中位数。\n"
                    "众数：一组数据中出现次数最多的数据叫做这组数据的众数。\n"
                    "选择适当的量表示数据的集中趋势：平均数、中位数、众数各有特点，需根据数据特点和分析目的选择。"
                ),
            },
            {
                "section_id": "CH06_SEC03",
                "section_title": "方差",
                "content": (
                    "方差：各个数据与平均数之差的平方的平均数。公式：s²=[(x₁-x̄)²+(x₂-x̄)²+...+(xₙ-x̄)²]/n。\n"
                    "方差的意义：反映一组数据的波动大小，方差越大，数据的波动越大；方差越小，数据越稳定。\n"
                    "标准差：方差的算术平方根，记作s。"
                ),
            },
        ],
        "key_knowledge_points": ["平均数计算", "加权平均数", "中位数求法", "众数求法", "方差计算"],
    },
    # ===== 第7章：平行线的证明 =====
    {
        "chapter_id": "CH07",
        "chapter_title": "平行线的证明",
        "chapter_order": 7,
        "sections": [
            {
                "section_id": "CH07_SEC01",
                "section_title": "命题与证明",
                "content": (
                    "命题：判断一件事情的语句，由题设和结论两部分组成。\n"
                    "真命题与假命题：正确的命题叫做真命题；错误的命题叫做假命题。\n"
                    "证明：根据已知条件，依据定义、公理、定理，推导出一个命题的正确性，这种推理过程叫做证明。\n"
                    "基本事实（公理）：人类经过长期实践证实的真命题，作为判断其他命题真假的根据。"
                ),
            },
            {
                "section_id": "CH07_SEC02",
                "section_title": "平行线的判定",
                "content": (
                    "判定方法1：同位角相等，两直线平行。\n"
                    "判定方法2：内错角相等，两直线平行。\n"
                    "判定方法3：同旁内角互补，两直线平行。\n"
                    "判定方法4：平行于同一条直线的两条直线互相平行。"
                ),
            },
            {
                "section_id": "CH07_SEC03",
                "section_title": "平行线的性质",
                "content": (
                    "性质1：两直线平行，同位角相等。\n"
                    "性质2：两直线平行，内错角相等。\n"
                    "性质3：两直线平行，同旁内角互补。\n"
                    "平行线的判定与性质的区别：判定是由角的关系推平行；性质是由平行推角的关系。"
                ),
            },
        ],
        "key_knowledge_points": ["命题与证明", "平行线判定", "平行线性质", "判定与性质的区别"],
    },
    # ===== 第8章：三角形 ============================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================"]


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
    print(f"  [种子注入] 注入 {len(load_seed_chapters())} 个章节（人教版8上全册）")
    return {
        "textbook_status": "success",
        "textbook_version": "人教版（陕西地区8年级上）",
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
    print("  章节：勾股定理 + 实数 | 每知识点：3题\n")

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
