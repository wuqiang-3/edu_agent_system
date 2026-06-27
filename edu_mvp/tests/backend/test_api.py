"""
Edu Agent System — 后端 API 全面测试
覆盖：基础查询 / CRUD / 认证 / 分析引擎 / 积分勋章 / 班级 / 家长 / 边界异常

⚠️ 已适配 P0 修复后的认证机制：
- client fixture 带 admin token（conftest.py 提供）
- raw_client fixture 不带 token（认证测试用）
- 注册不再接受 role 参数
- 错误响应格式：{"success": false, "error": {"code", "message", "detail"}}

运行方式：cd desktop/edu_agent_system/edu_mvp && python -m pytest tests/backend/test_api.py -v
"""
import pytest

# conftest.py 提供 client / raw_client / student_client fixtures

# ──────────────────── 1. 基础健康检查 ────────────────────

class TestHealth:
    def test_root(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert "msg" in r.json()

    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


# ──────────────────── 2. 章节 & 统计 ────────────────────

class TestChapters:
    def test_get_chapters_returns_list(self, client):
        r = client.get("/api/chapters")
        assert r.status_code == 200
        chapters = r.json()
        assert isinstance(chapters, list)
        assert len(chapters) >= 1
        required_keys = {"chapter_id", "chapter_title", "kp_count"}
        for ch in chapters:
            assert required_keys.issubset(ch.keys())

    def test_stats_returns_correct_counts(self, client):
        r = client.get("/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["chapters"] >= 1
        assert data["knowledge_points"] >= 1
        assert data["questions"] >= 1
        assert data["methods"] >= 1


# ──────────────────── 3. 知识点 ────────────────────

class TestKnowledgePoints:
    def test_get_all_knowledge_points(self, client):
        r = client.get("/api/knowledge-points")
        assert r.status_code == 200
        kps = r.json()
        assert len(kps) >= 1
        assert "kp_id" in kps[0]

    def test_filter_by_chapter_id(self, client):
        chapters = client.get("/api/chapters").json()
        assert len(chapters) > 0
        ch = chapters[0]["chapter_id"]
        r = client.get(f"/api/knowledge-points?chapter_id={ch}")
        assert r.status_code == 200
        kps = r.json()
        assert all(k["chapter_id"] == ch for k in kps)

    def test_filter_by_nonexistent_chapter_id(self, client):
        r = client.get("/api/knowledge-points?chapter_id=NONEXIST")
        assert r.status_code == 200
        assert r.json() == []


# ──────────────────── 4. 题目查询 ────────────────────

class TestQuestions:
    def test_get_all_questions(self, client):
        r = client.get("/api/questions")
        assert r.status_code == 200
        qs = r.json()
        assert len(qs) >= 1
        required = {"q_id", "question_text", "options", "correct_answer", "difficulty"}
        assert required.issubset(qs[0].keys())

    def test_filter_by_kp_id(self, client):
        kps = client.get("/api/knowledge-points").json()
        assert len(kps) > 0
        kp = kps[0]["kp_id"]
        r = client.get(f"/api/questions?kp_id={kp}")
        assert r.status_code == 200
        qs = r.json()
        assert len(qs) >= 1
        assert all(q["kp_id"] == kp for q in qs)

    def test_filter_by_invalid_kp_id_returns_empty(self, client):
        r = client.get("/api/questions?kp_id=NO_SUCH_KP")
        assert r.status_code == 200
        assert r.json() == []


# ──────────────────── 5. 学习方法 ────────────────────

class TestMethods:
    def test_get_all_methods(self, client):
        r = client.get("/api/learning-methods")
        assert r.status_code == 200
        ms = r.json()
        assert len(ms) >= 1

    def test_filter_by_kp_id(self, client):
        kps = client.get("/api/knowledge-points").json()
        kp = kps[0]["kp_id"]
        r = client.get(f"/api/learning-methods?kp_id={kp}")
        assert r.status_code == 200
        ms = r.json()
        if ms:
            assert all(m["kp_id"] == kp for m in ms)

    def test_filter_nonexistent_kp_id(self, client):
        r = client.get("/api/learning-methods?kp_id=NO_SUCH")
        assert r.status_code == 200
        assert r.json() == []


# ──────────────────── 6. 错题本 CRUD ────────────────────

class TestWrongQuestions:
    SID = "test_student_wq"

    def test_add_wrong_question(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        r = client.post("/api/wrong-questions", json={"q_id": qid, "student_id": self.SID})
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_add_duplicate_is_idempotent(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        client.post("/api/wrong-questions", json={"q_id": qid, "student_id": self.SID})
        r2 = client.post("/api/wrong-questions", json={"q_id": qid, "student_id": self.SID})
        assert r2.status_code == 200
        assert r2.json()["count"] == 1  # 不重复

    def test_get_wrong_questions(self, client):
        qs = client.get("/api/questions").json()
        client.post("/api/wrong-questions", json={"q_id": qs[0]["q_id"], "student_id": self.SID})
        client.post("/api/wrong-questions", json={"q_id": qs[1]["q_id"], "student_id": self.SID})
        r = client.get(f"/api/wrong-questions?student_id={self.SID}")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1

    def test_get_wrong_questions_empty_for_new_student(self, client):
        r = client.get("/api/wrong-questions?student_id=nobody")
        assert r.status_code == 200
        assert r.json() == []

    def test_remove_wrong_question(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        client.post("/api/wrong-questions", json={"q_id": qid, "student_id": self.SID})
        r = client.delete(f"/api/wrong-questions/{qid}?student_id={self.SID}")
        assert r.status_code == 200
        # 验证已删除
        after = client.get(f"/api/wrong-questions?student_id={self.SID}").json()
        assert qid not in after

    def test_remove_nonexistent_is_noop(self, client):
        r = client.delete("/api/wrong-questions/NO_SUCH_Q?student_id=nobody")
        assert r.status_code == 200

    def test_clear_all_wrong_questions(self, client):
        qs = client.get("/api/questions").json()
        client.post("/api/wrong-questions", json={"q_id": qs[0]["q_id"], "student_id": self.SID})
        client.post("/api/wrong-questions", json={"q_id": qs[1]["q_id"], "student_id": self.SID})
        r = client.delete(f"/api/wrong-questions?student_id={self.SID}")
        assert r.status_code == 200
        assert r.json()["count"] == 0


# ──────────────────── 7. 收藏 CRUD ────────────────────

class TestFavorites:
    SID = "test_student_fav"

    def test_toggle_favorite_add(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        r = client.post("/api/favorites", json={"q_id": qid, "student_id": self.SID})
        assert r.status_code == 200
        assert r.json()["favorited"] is True

    def test_toggle_favorite_remove(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        client.post("/api/favorites", json={"q_id": qid, "student_id": self.SID})
        r2 = client.post("/api/favorites", json={"q_id": qid, "student_id": self.SID})
        assert r2.json()["favorited"] is False

    def test_get_favorites(self, client):
        qs = client.get("/api/questions").json()
        client.post("/api/favorites", json={"q_id": qs[0]["q_id"], "student_id": self.SID})
        client.post("/api/favorites", json={"q_id": qs[1]["q_id"], "student_id": self.SID})
        r = client.get(f"/api/favorites?student_id={self.SID}")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_get_favorites_empty(self, client):
        r = client.get("/api/favorites?student_id=nobody")
        assert r.status_code == 200
        assert r.json() == []


# ──────────────────── 8. 答题记录 ────────────────────

class TestAnswers:
    SID = "test_student_ans"

    def test_record_answer(self, client):
        qs = client.get("/api/questions").json()
        q = qs[0]
        body = {
            "q_id": q["q_id"],
            "kp_id": q["kp_id"],
            "chapter_id": q.get("chapter_id", ""),
            "difficulty": q["difficulty"],
            "selected_answer": "A",
            "is_correct": True,
            "time_spent": 45,
            "student_id": self.SID,
        }
        r = client.post("/api/answers", json=body)
        assert r.status_code == 200
        assert "answer_id" in r.json()

    def test_record_wrong_answer(self, client):
        qs = client.get("/api/questions").json()
        q = qs[0]
        body = {
            "q_id": q["q_id"],
            "kp_id": q["kp_id"],
            "chapter_id": q.get("chapter_id", ""),
            "difficulty": q["difficulty"],
            "selected_answer": "B",
            "is_correct": False,
            "time_spent": 60,
            "student_id": self.SID,
        }
        r = client.post("/api/answers", json=body)
        assert r.status_code == 200
        assert "answer_id" in r.json()

    def test_get_answers(self, client):
        qs = client.get("/api/questions").json()
        for i in range(3):
            q = qs[i]
            client.post("/api/answers", json={
                "q_id": q["q_id"], "kp_id": q["kp_id"],
                "chapter_id": q.get("chapter_id", ""),
                "difficulty": q["difficulty"],
                "selected_answer": "A", "is_correct": True,
                "time_spent": 30, "student_id": self.SID,
            })
        r = client.get(f"/api/answers?student_id={self.SID}&limit=50")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert data[0]["timestamp"] >= data[-1]["timestamp"]  # 按时间倒序

    def test_get_answers_empty(self, client):
        r = client.get("/api/answers?student_id=never_answered")
        assert r.status_code == 200
        assert r.json() == []

    def test_get_answers_with_limit(self, client):
        r = client.get(f"/api/answers?student_id={self.SID}&limit=1")
        assert r.status_code == 200
        assert len(r.json()) <= 1


# ──────────────────── 9. 分析引擎 ────────────────────

class TestAnalysis:
    SID = "test_analysis_student"

    @pytest.fixture(autouse=True)
    def seed_answers(self, client):
        """为分析测试准备答题记录"""
        qs = client.get("/api/questions").json()
        kps = client.get("/api/knowledge-points").json()
        # 对同一个 kp 答对 3 题
        kp1 = kps[0]["kp_id"]
        for q in qs:
            if q["kp_id"] == kp1:
                for _ in range(3):
                    client.post("/api/answers", json={
                        "q_id": q["q_id"], "kp_id": kp1,
                        "chapter_id": q.get("chapter_id", ""),
                        "difficulty": q["difficulty"],
                        "selected_answer": q["correct_answer"],
                        "is_correct": True, "time_spent": 30,
                        "student_id": self.SID,
                    })
                break
        # 对第二个 kp 答错 3 题
        kp2 = kps[1]["kp_id"]
        for q in qs:
            if q["kp_id"] == kp2:
                for _ in range(3):
                    client.post("/api/answers", json={
                        "q_id": q["q_id"], "kp_id": kp2,
                        "chapter_id": q.get("chapter_id", ""),
                        "difficulty": q["difficulty"],
                        "selected_answer": "Z",
                        "is_correct": False, "time_spent": 120,
                        "student_id": self.SID,
                    })
                break

    def test_weak_points_analysis(self, client):
        r = client.get(f"/api/analysis/weak-points?student_id={self.SID}")
        assert r.status_code == 200
        data = r.json()
        assert "weak_points" in data
        assert data["total_analyzed"] >= 1
        wps = data["weak_points"]
        assert len(wps) >= 1
        assert "accuracy" in wps[0]
        assert "status" in wps[0]

    def test_weak_points_no_data(self, client):
        r = client.get("/api/analysis/weak-points?student_id=nobody")
        assert r.status_code == 200
        assert r.json()["total_analyzed"] == 0
        assert r.json()["weak_points"] == []

    def test_recommendations(self, client):
        r = client.get(f"/api/analysis/recommendations?student_id={self.SID}&max_count=3")
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert "weak_kps_count" in data

    def test_recommendations_no_data(self, client):
        r = client.get("/api/analysis/recommendations?student_id=nobody")
        assert r.status_code == 200
        assert "暂无薄弱知识点" in r.json().get("message", "")

    def test_learning_path(self, client):
        r = client.get(f"/api/analysis/learning-path?student_id={self.SID}")
        assert r.status_code == 200
        data = r.json()
        assert "learning_path" in data
        assert "next_to_study" in data
        assert data["total_kps"] >= 1
        for item in data["learning_path"]:
            assert item["status"] in ("mastered", "ready", "blocked", "no_data")

    def test_learning_path_no_data(self, client):
        r = client.get("/api/analysis/learning-path?student_id=nobody")
        assert r.status_code == 200
        assert r.json()["mastered"] == 0

    def test_review_schedule(self, client):
        r = client.get(f"/api/analysis/review-schedule?student_id={self.SID}")
        assert r.status_code == 200
        data = r.json()
        assert "reviews" in data
        assert "due_count" in data
        assert "total_kps" in data

    def test_review_schedule_no_data(self, client):
        r = client.get("/api/analysis/review-schedule?student_id=nobody")
        assert r.status_code == 200
        assert r.json()["due_count"] == 0

    def test_learning_report_weekly(self, client):
        r = client.get(f"/api/analysis/learning-report?student_id={self.SID}&period=weekly")
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == "周报"
        assert "accuracy" in data
        assert "chapter_summary" in data

    def test_learning_report_monthly(self, client):
        r = client.get(f"/api/analysis/learning-report?student_id={self.SID}&period=monthly")
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == "月报"
        assert data["period_days"] == 30

    def test_learning_report_invalid_period(self, client):
        r = client.get(f"/api/analysis/learning-report?student_id=test&period=yearly")
        assert r.status_code == 422

    def test_learning_report_no_data(self, client):
        r = client.get("/api/analysis/learning-report?student_id=nobody&period=weekly")
        assert r.status_code == 200
        data = r.json()
        assert data["total_questions"] == 0
        assert data["accuracy"] == 0.0


# ──────────────────── 10. 自适应题目 ────────────────────

class TestAdaptive:
    def test_no_history_returns_star_difficulty(self, client):
        kps = client.get("/api/knowledge-points").json()
        kp = kps[0]["kp_id"]
        r = client.get(f"/api/adaptive-questions?kp_id={kp}&student_id=brand_new")
        assert r.status_code == 200
        assert r.json()["suggested_difficulty"] == "★"
        assert len(r.json()["questions"]) >= 1

    def test_returns_empty_for_invalid_kp_id(self, client):
        r = client.get("/api/adaptive-questions?kp_id=FAKE_KP&student_id=x")
        assert r.status_code == 200
        assert r.json()["questions"] == []

    def test_respects_count_limit(self, client):
        kps = client.get("/api/knowledge-points").json()
        kp = kps[0]["kp_id"]
        r = client.get(f"/api/adaptive-questions?kp_id={kp}&student_id=new&count=1")
        assert r.status_code == 200
        assert len(r.json()["questions"]) <= 1

    def test_excludes_already_answered(self, client):
        kps = client.get("/api/knowledge-points").json()
        kp = kps[0]["kp_id"]
        # 先回答一道题
        qs = client.get(f"/api/questions?kp_id={kp}").json()
        if qs:
            client.post("/api/answers", json={
                "q_id": qs[0]["q_id"], "kp_id": kp, "chapter_id": qs[0].get("chapter_id", ""),
                "difficulty": qs[0]["difficulty"], "selected_answer": qs[0]["correct_answer"],
                "is_correct": True, "time_spent": 30, "student_id": "adaptive_test",
            })
        r = client.get(f"/api/adaptive-questions?kp_id={kp}&student_id=adaptive_test")
        assert r.status_code == 200
        # 已答的题不应出现
        answered_ids = {qs[0]["q_id"]} if qs else set()
        for q in r.json()["questions"]:
            assert q["q_id"] not in answered_ids


# ──────────────────── 11. 管理台 CRUD ────────────────────

class TestAdminCRUD:
    def test_update_question_partial(self, client):
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        r = client.put(f"/api/questions/{qid}", json={"analysis": "测试更新分析"})
        assert r.status_code == 200
        # 验证
        updated = client.get("/api/questions").json()
        for q in updated:
            if q["q_id"] == qid:
                assert q["analysis"] == "测试更新分析"
                break

    def test_update_nonexistent_question(self, client):
        r = client.put("/api/questions/NO_SUCH_Q", json={"analysis": "x"})
        assert r.status_code == 404

    def test_delete_question(self, client):
        # 找一题来删除
        qs = client.get("/api/questions").json()
        qid = qs[0]["q_id"]
        count_before = len(qs)
        r = client.delete(f"/api/questions/{qid}")
        assert r.status_code == 200
        after = client.get("/api/questions").json()
        assert len(after) == count_before - 1

    def test_delete_nonexistent_question(self, client):
        r = client.delete("/api/questions/NO_SUCH_Q")
        assert r.status_code == 404

    def test_update_knowledge_point(self, client):
        kps = client.get("/api/knowledge-points").json()
        kp_id = kps[0]["kp_id"]
        r = client.put(f"/api/knowledge-points/{kp_id}", json={"difficulty": "★★★"})
        assert r.status_code == 200

    def test_update_knowledge_point_not_found(self, client):
        r = client.put("/api/knowledge-points/FAKE", json={"difficulty": "★"})
        assert r.status_code == 404

    def test_update_learning_method(self, client):
        ms = client.get("/api/learning-methods").json()
        if ms:
            kp_id = ms[0]["kp_id"]
            r = client.put(f"/api/learning-methods/{kp_id}", json={"method_name": "测试方法"})
            assert r.status_code == 200

    def test_update_learning_method_not_found(self, client):
        r = client.put("/api/learning-methods/FAKE", json={"method_name": "x"})
        assert r.status_code == 404

    def test_export_questions(self, client):
        r = client.get("/api/questions/export")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "questions" in data
        assert len(data["questions"]) == data["total"]

    def test_import_questions_empty(self, client):
        r = client.post("/api/questions/import", json={"questions": []})
        assert r.status_code == 400

    def test_import_questions(self, client):
        new_q = {
            "q_id": "TEST_IMPORT_Q001",
            "kp_id": "MATH8_CH01_SEC01_KP01",
            "kp_name": "勾股定理",
            "question_type": "choice",
            "difficulty": "★",
            "score": 3,
            "question_text": "导入测试题",
            "options": {"A": "正确", "B": "错误", "C": "可能", "D": "不一定"},
            "correct_answer": "A",
            "analysis": "导入测试解析",
            "solution_steps": [],
            "chapter_id": "CH01",
            "section_id": "CH01_S01",
        }
        count_before = len(client.get("/api/questions").json())
        r = client.post("/api/questions/import", json={"questions": [new_q]})
        assert r.status_code == 200
        assert r.json()["added"] == 1
        assert len(client.get("/api/questions").json()) == count_before + 1

    def test_import_duplicate_skips(self, client):
        qs = client.get("/api/questions").json()
        existing_q = {"q_id": qs[0]["q_id"], "question_text": "dup"}
        count_before = len(qs)
        r = client.post("/api/questions/import", json={"questions": [existing_q]})
        assert r.status_code == 200
        assert r.json()["added"] == 0


# ──────────────────── 12. 用户认证 ────────────────────

class TestAuth:
    USERNAME = "testuser_api"
    PASSWORD = "Test1234abcd"  # 满足密码强度：8位+大小写+数字

    def test_register_new_user(self, raw_client):
        r = raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
            "name": "测试用户",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "token" in data
        assert data["user"]["username"] == self.USERNAME
        assert data["user"]["role"] == "student"  # P0-2: 强制 student

    def test_register_duplicate_username(self, raw_client):
        raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        })
        r = raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": "Other1234",
        })
        assert r.status_code == 400
        assert "已存在" in r.json()["error"]["message"]

    def test_register_weak_password_rejected(self, raw_client):
        """P1-12: 弱密码被拒绝"""
        r = raw_client.post("/api/auth/register", json={
            "username": "weakpw", "password": "123",
        })
        assert r.status_code == 400

    def test_login_correct(self, raw_client):
        raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        })
        r = raw_client.post("/api/auth/login", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        })
        assert r.status_code == 200
        data = r.json()
        assert "token" in data

    def test_login_wrong_password(self, raw_client):
        raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        })
        r = raw_client.post("/api/auth/login", json={
            "username": self.USERNAME, "password": "WrongPass",
        })
        assert r.status_code == 401
        assert "用户名或密码错误" in r.json()["error"]["message"]

    def test_login_nonexistent_user(self, raw_client):
        r = raw_client.post("/api/auth/login", json={
            "username": "ghost_user", "password": "Ghost1234",
        })
        assert r.status_code == 401

    def test_me_without_token_returns_401(self, raw_client):
        """P0-8: 不带 token 访问 /me 返回 401"""
        r = raw_client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_with_invalid_token_returns_401(self, raw_client):
        r = raw_client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})
        assert r.status_code == 401

    def test_me_with_valid_token(self, raw_client):
        reg = raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        }).json()
        r = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {reg['token']}"})
        assert r.status_code == 200
        assert r.json()["username"] == self.USERNAME

    def test_logout(self, raw_client):
        reg = raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        }).json()
        token = reg["token"]
        r = raw_client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        # 验证令牌失效
        r2 = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 401

    def test_register_auto_login(self, raw_client):
        r = raw_client.post("/api/auth/register", json={
            "username": self.USERNAME, "password": self.PASSWORD,
        })
        assert r.status_code == 200
        token = r.json()["token"]
        me = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200

    def test_admin_cannot_self_register(self, raw_client):
        """P0-2: 注册不能自选 admin 角色"""
        r = raw_client.post("/api/auth/register", json={
            "username": "hacker", "password": self.PASSWORD, "role": "admin",
        })
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "student"  # 强制 student


# ──────────────────── 13. 班级管理 ────────────────────

class TestClasses:
    TEACHER = "u_teacher_test"
    STUDENT = "u_student_test"

    def test_create_class(self, client):
        r = client.post("/api/classes", json={
            "name": "测试班级", "teacher_id": self.TEACHER,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        cls = r.json()["class"]
        assert cls["class_name"] == "测试班级"
        assert len(cls["join_code"]) == 6

    def test_join_class_with_valid_code(self, client):
        create = client.post("/api/classes", json={
            "name": "测试班", "teacher_id": self.TEACHER,
        }).json()
        code = create["class"]["join_code"]
        r = client.post("/api/classes/join", json={
            "join_code": code, "student_id": self.STUDENT,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_join_class_invalid_code(self, client):
        r = client.post("/api/classes/join", json={
            "join_code": "ZZZZZZ", "student_id": self.STUDENT,
        })
        assert r.status_code == 404
        assert "无效" in r.json()["error"]["message"]

    def test_list_classes(self, client):
        create = client.post("/api/classes", json={
            "name": "列表测试", "teacher_id": self.TEACHER,
        }).json()
        code = create["class"]["join_code"]
        client.post("/api/classes/join", json={
            "join_code": code, "student_id": self.STUDENT,
        })
        r = client.get(f"/api/classes?user_id={self.STUDENT}")
        assert r.status_code == 200
        assert len(r.json()) >= 1
        assert r.json()[0]["class_name"] == "列表测试"


# ──────────────────── 14. 积分 & 勋章 ────────────────────

class TestScores:
    SID = "u_score_test"

    def test_get_badges(self, client):
        r = client.get("/api/scores/badges")
        assert r.status_code == 200
        badges = r.json()["badges"]
        assert len(badges) >= 4
        assert any(b["id"] == "新手" for b in badges)

    def test_get_score_new_student(self, client):
        r = client.get(f"/api/scores/{self.SID}")
        assert r.status_code == 200
        assert r.json()["points"] == 0

    def test_award_points(self, client):
        r = client.post("/api/scores/award", json={
            "student_id": self.SID, "points": 10, "streak": 1,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["points"] >= 10

    def test_award_points_cumulative(self, client):
        client.post("/api/scores/award", json={
            "student_id": self.SID, "points": 10, "streak": 1,
        })
        client.post("/api/scores/award", json={
            "student_id": self.SID, "points": 20, "streak": 2,
        })
        r = client.get(f"/api/scores/{self.SID}")
        assert r.json()["points"] == 30

    def test_leaderboard(self, client):
        for i in range(3):
            client.post("/api/scores/award", json={
                "student_id": f"u_leader_{i}", "points": (i + 1) * 10, "streak": i,
            })
        r = client.get("/api/leaderboard?limit=10")
        assert r.status_code == 200
        board = r.json()["leaderboard"]
        assert len(board) >= 3
        assert board[0]["points"] >= board[1]["points"]  # 降序


# ──────────────────── 15. 家长关联 ────────────────────

class TestParents:
    PARENT = "u_parent_test"
    CHILD = "u_child_test"

    def test_link_parent_child(self, client):
        r = client.post("/api/parents/link", json={
            "parent_id": self.PARENT, "child_id": self.CHILD,
        })
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_link_duplicate_is_idempotent(self, client):
        client.post("/api/parents/link", json={
            "parent_id": self.PARENT, "child_id": self.CHILD,
        })
        r = client.post("/api/parents/link", json={
            "parent_id": self.PARENT, "child_id": self.CHILD,
        })
        assert r.status_code == 200

    def test_get_children(self, client):
        client.post("/api/parents/link", json={
            "parent_id": self.PARENT, "child_id": self.CHILD,
        })
        r = client.get(f"/api/parents/children?parent_id={self.PARENT}")
        assert r.status_code == 200
        children = r.json()["children"]
        assert len(children) >= 1
        assert children[0]["user_id"] == self.CHILD

    def test_get_children_empty(self, client):
        r = client.get("/api/parents/children?parent_id=no_kids")
        assert r.status_code == 200
        assert r.json()["children"] == []


# ──────────────────── 16. stats 字段 bug 验证 ────────────────────

def test_stats_methods_key_bug(client):
    """验证 get_stats 中 methods 字段正确读取 learning_methods 数据"""
    r = client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["methods"] == 72  # 修复后应为 72 个学习方法


# ──────────────────── 17. P0 安全修复验证 ────────────────────

class TestSecurityFixes:
    """验证 P0 安全修复效果"""

    def test_unauthorized_access_blocked(self, raw_client):
        """P0-1: 未认证访问受保护端点返回 401"""
        endpoints = [
            ("GET", "/api/wrong-questions?student_id=x"),
            ("GET", "/api/favorites?student_id=x"),
            ("GET", "/api/answers?student_id=x"),
            ("GET", "/api/analysis/weak-points?student_id=x"),
            ("GET", "/api/adaptive-questions?kp_id=x&student_id=x"),
            ("GET", "/api/scores/x"),
            ("POST", "/api/scores/award"),
        ]
        for method, path in endpoints:
            r = raw_client.request(method, path, json={})
            assert r.status_code == 401, f"{method} {path} 应返回 401，实际 {r.status_code}"

    def test_admin_crud_requires_admin(self, student_client):
        """P0-7: 管理台 CRUD 需要 admin 角色"""
        r = student_client.put("/api/questions/q1", json={"analysis": "hack"})
        assert r.status_code == 403

        r = student_client.delete("/api/questions/q1")
        assert r.status_code == 403

        r = student_client.get("/api/questions/export")
        assert r.status_code == 403

    def test_idor_student_cannot_access_others(self, student_client):
        """P0-6: 学生不能访问其他学生的数据"""
        # 学生尝试传其他 student_id
        r = student_client.get("/api/wrong-questions?student_id=u_test_admin")
        # 应该返回自己的数据（不是 admin 的），status 200 但数据为空
        assert r.status_code == 200
        assert r.json() == []  # student 自己没有错题

    def test_admin_can_access_any_student(self, client):
        """admin 可以访问任意学生数据"""
        r = client.get("/api/wrong-questions?student_id=u_test_student")
        assert r.status_code == 200

    def test_token_in_header_not_url(self, raw_client):
        """P0-8: token 通过 URL 传递不再有效"""
        # 用 URL query 传 token 应该无效
        r = raw_client.get("/api/auth/me?token=tok_test_admin_0001")
        assert r.status_code == 401  # URL token 不再被接受
