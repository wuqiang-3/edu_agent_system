"""
修补已有数据：补填缺失字段 + 修复选择题选项偏移 + 分数标准化
===================================================================
执行方式：python patch_existing_data.py
会直接修改 output/ 下的 result.json、questions_partial.json（如存在）
"""
import json
import random
from pathlib import Path

OUT_DIR = Path(__file__).parent / "output"


def shuffle_choice_options(questions, kp_lookup):
    """
    修复选择题选项偏移：随机重排选项顺序，保证正确选项均匀分布在 A/B/C/D。
    每组基于 kp_id 的 hash seed，保证确定性。
    """
    shuffled = 0
    for q in questions:
        if q.get("question_type") != "choice" or not q.get("options"):
            continue
        kp_id = q.get("kp_id", "")
        seed = hash(kp_id) & 0xFFFFFFFF
        rng = random.Random(seed)

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
            shuffled += 1

    return shuffled


def standardize_scores(questions):
    """分数标准化：★=3分、★★=5分、★★★=8分"""
    patched = 0
    for q in questions:
        diff = q.get("difficulty", "★")
        new_score = {"★": 3, "★★": 5, "★★★": 8}.get(diff, 3)
        if q.get("score") != new_score:
            q["score"] = new_score
            patched += 1
    return patched

def patch_result():
    path = OUT_DIR / "result.json"
    if not path.exists():
        print(f"✗ 未找到 {path}，跳过")
        return

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    kps = data.get("knowledge_points", [])
    qs  = data.get("questions", [])
    chs = data.get("chapters", [])

    # 1. 构建 kp_id → {chapter_id, section_id} 查找表
    kp_lookup = {}
    for kp in kps:
        kp_lookup[kp["kp_id"]] = {
            "chapter_id": kp.get("chapter_id", ""),
            "section_id": kp.get("section_id", ""),
        }

    # 2. 补填题目缺失字段
    patched_q = 0
    for q in qs:
        info = kp_lookup.get(q.get("kp_id", ""), {})
        changed = False
        if not q.get("chapter_id"):
            q["chapter_id"] = info.get("chapter_id", "")
            changed = True
        if not q.get("section_id"):
            q["section_id"] = info.get("section_id", "")
            changed = True
        if changed:
            patched_q += 1
    print(f"  ✓ 题目补填：{patched_q}/{len(qs)} 道题被修补")

    # 3. 选择题选项随机重排
    s = shuffle_choice_options(qs, kp_lookup)
    print(f"  ✓ 选择题重排：{s} 道题选项已打乱")

    # 4. 分数标准化
    sc = standardize_scores(qs)
    print(f"  ✓ 分数标准化：{sc} 道题分数已调整")

    # 5. 补填 chapters 数组（如缺失）
    if not chs and kps:
        ch_map = {}
        for kp in kps:
            cid = kp.get("chapter_id", "")
            ctitle = kp.get("chapter_title", "")
            if cid and cid not in ch_map:
                ch_map[cid] = {
                    "chapter_id": cid,
                    "chapter_title": ctitle,
                    "kp_count": 1,
                }
            elif cid:
                ch_map[cid]["kp_count"] += 1
        data["chapters"] = list(ch_map.values())
        print(f"  ✓ 已补填 chapters 数组：{len(data['chapters'])} 章")
    else:
        print(f"  ✓ chapters 已存在：{len(chs)} 章")

    # 4. 写入
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n  ✅ result.json 修复完成")


def patch_intermediate():
    """修补中间文件 questions_partial.json（如存在）"""
    path = OUT_DIR / "questions_partial.json"
    if not path.exists():
        print("  ⬜ questions_partial.json 不存在，跳过")
        return

    with open(path, "r", encoding="utf-8") as f:
        qs = json.load(f)

    # 从 result.json 加载 kp_lookup
    rp = OUT_DIR / "result.json"
    if not rp.exists():
        print("  ✗ 需要 result.json 提供 kp 引用，跳过中间文件修补")
        return
    with open(rp, "r", encoding="utf-8") as f:
        data = json.load(f)
    kp_lookup = {}
    for kp in data.get("knowledge_points", []):
        kp_lookup[kp["kp_id"]] = {
            "chapter_id": kp.get("chapter_id", ""),
            "section_id": kp.get("section_id", ""),
        }

    patched = 0
    for q in qs:
        info = kp_lookup.get(q.get("kp_id", ""), {})
        if not q.get("chapter_id"):
            q["chapter_id"] = info.get("chapter_id", "")
            patched += 1
        if not q.get("section_id"):
            q["section_id"] = info.get("section_id", "")

    # 选择题重排 + 分数标准化
    s = shuffle_choice_options(qs, kp_lookup)
    sc = standardize_scores(qs)
    print(f"  ✓ 选择题重排：{s} 道 | 分数标准化：{sc} 道")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(qs, f, ensure_ascii=False, indent=2)
    print(f"  ✓ questions_partial.json 已修补：{patched} 道题")


if __name__ == "__main__":
    print("=== 数据迁移：补填题目缺失字段 ===\n")
    patch_result()
    patch_intermediate()
    print("\n=== 完成 ===")
