"""
题库扩充工具 — 每知识点从 3 题扩充到 9 题

运行方式：cd edu_mvp && python3 expand_questions.py
"""
import json
import sys
import time
from pathlib import Path
from collections import Counter

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))
from mvp_main import _call_llm, _postprocess_questions

OUTPUT_FILE = Path(__file__).parent / "output" / "result.json"
TARGET_PER_KP = 9


def load_existing():
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def count_per_kp(data: dict) -> dict:
    counts = {}
    for q in data.get("questions", []):
        kp = q.get("kp_id", "?")
        counts[kp] = counts.get(kp, 0) + 1
    return counts


def build_prompt(kp: dict, existing_display: str) -> str:
    """用 f-string 构造 prompt，避免 .format() 与 JSON 大括号冲突"""
    return f"""你是一位中考数学命题专家。请为以下知识点生成 6 道新题目。

# 知识点信息（JSON格式）
{json.dumps(kp, ensure_ascii=False)}

# 输出要求
1. 输出一个 JSON 数组，包含 6 道题目
2. 难度分布：★ ×2 道、★★ ×2 道、★★★ ×2 道
3. 每个难度：1 道选择题 + 1 道填空/计算题（不同类型）
4. 每道题必须包含：q_id, kp_id, kp_name, question_type, difficulty, score, question_text, options, correct_answer, solution_steps, analysis, common_mistakes
5. q_id 命名规则：{kp["kp_id"]}_Q004 开始递增
6. kp_id 固定为：{kp["kp_id"]}
7. 仅输出 JSON 数组，不要任何其他文字、不要 ``` 包裹

# 已有题目（请勿重复生成）
{existing_display}
"""


def generate_questions(kp: dict, existing_texts: list[str]) -> list[dict]:
    existing_display = "\n".join([f"- {t[:80]}..." for t in existing_texts[:12]])
    if not existing_display:
        existing_display = "（无已有题目）"

    prompt = build_prompt(kp, existing_display)

    try:
        questions = _call_llm(prompt, "请生成 JSON 数组", temperature=0.3)
        if not isinstance(questions, list):
            print(f"    ✗ 返回非数组格式")
            return []

        for q in questions:
            q.setdefault("chapter_id", kp.get("chapter_id", ""))
            q.setdefault("section_id", kp.get("section_id", ""))
            q.setdefault("kp_id", kp["kp_id"])
            q.setdefault("kp_name", kp["kp_name"])
            if q.get("question_type") == "choice" and not q.get("options"):
                q["options"] = []

        _postprocess_questions(questions, kp)
        return questions
    except Exception as e:
        print(f"    ✗ {e}")
        return []


def main():
    print("\n📚 题库扩充工具")
    print("  目标：每知识点 9 题（当前 3 题 → 目标 9 题）\n")

    print("1️⃣ 加载现有题库...")
    data = load_existing()
    kps = data.get("knowledge_points", [])
    existing_qs = data.get("questions", [])
    kp_counts = count_per_kp(data)

    print(f"   知识点数: {len(kps)}")
    print(f"   现有题目: {len(existing_qs)}")
    print(f"   平均每KP: {len(existing_qs)/max(len(kps),1):.1f} 题\n")

    need_expand = []
    for kp in kps:
        count = kp_counts.get(kp["kp_id"], 0)
        if count < TARGET_PER_KP:
            need_expand.append((kp, TARGET_PER_KP - count, count))

    if not need_expand:
        print("✅ 所有知识点已达到目标题数！")
        return

    print(f"2️⃣ 需补充知识点: {len(need_expand)} 个（约 {sum(n for _, n, _ in need_expand)} 道新题）\n")
    print("3️⃣ 开始生成...\n")

    total_new = 0
    for i, (kp, need, current) in enumerate(need_expand):
        existing_for_kp = [
            q.get("question_text", "")
            for q in existing_qs
            if q.get("kp_id") == kp["kp_id"]
        ]

        print(f"  [{i+1}/{len(need_expand)}] {kp['kp_name']} ({kp['kp_id']})")
        new_qs = generate_questions(kp, existing_for_kp)

        if new_qs:
            existing_qs.extend(new_qs)
            total_new += len(new_qs)
            print(f"    ✅ 生成 {len(new_qs)} 题（总计 {current + len(new_qs)} 题）")
        else:
            print(f"    ❌ 生成失败，跳过")

        if (i + 1) % 3 == 0:
            data["questions"] = existing_qs
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"    💾 已保存（累计 {total_new} 新题）")

        time.sleep(2)  # API 限流

    data["questions"] = existing_qs
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    final_counts = count_per_kp(data)
    print("\n" + "=" * 52)
    print("  题库扩充完成！")
    print(f"  知识点: {len(kps)} | 原题数: {len(existing_qs) - total_new} | 新增: {total_new} | 现题数: {len(existing_qs)}")
    print(f"  每KP: 最少 {min(final_counts.values())} 题 | 最多 {max(final_counts.values())} 题 | 平均 {sum(final_counts.values())/max(len(final_counts),1):.1f} 题")
    print("=" * 52)


if __name__ == "__main__":
    main()
