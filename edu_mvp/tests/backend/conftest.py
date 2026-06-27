"""
pytest 配置 — 提供带认证的 TestClient fixtures

由于 P0-1 修复后所有非公开端点需要 Authorization Header，
这里提供：
- client: 带 admin token 的 client（大部分测试用）
- raw_client: 不带 token 的 client（认证测试用）
- student_client: 带 student token 的 client
"""
import json
import shutil
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# 确保 backend 在 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app_clean import app
from middleware import hash_password

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"
BACKUP_DIR = Path(__file__).resolve().parent.parent.parent / "output_backup_test"

ADMIN_USER = {
    "user_id": "u_test_admin",
    "username": "testadmin",
    "name": "测试管理员",
    "role": "admin",
    "password_hash": "",  # 在 fixture 中设置
    "salt": "",
    "created_at": 0,
}

STUDENT_USER = {
    "user_id": "u_test_student",
    "username": "teststudent",
    "name": "测试学生",
    "role": "student",
    "password_hash": "",
    "salt": "",
    "created_at": 0,
}

ADMIN_PASSWORD = "Admin1234"
STUDENT_PASSWORD = "Student123"


@pytest.fixture(autouse=True)
def backup_and_restore():
    """每个测试前后备份/恢复 output 目录，保证测试隔离"""
    if OUTPUT_DIR.exists():
        if BACKUP_DIR.exists():
            shutil.rmtree(BACKUP_DIR)
        shutil.copytree(OUTPUT_DIR, BACKUP_DIR)
    # 重置速率限制器（避免测试间相互影响）
    from routers.auth import _rate_limit_store
    _rate_limit_store.clear()
    yield
    if BACKUP_DIR.exists():
        if OUTPUT_DIR.exists():
            shutil.rmtree(OUTPUT_DIR)
        shutil.copytree(BACKUP_DIR, OUTPUT_DIR)
        shutil.rmtree(BACKUP_DIR)


def _seed_test_users():
    """直接写入 users.json 创建 admin 和 student 测试用户"""
    users_file = OUTPUT_DIR / "users.json"
    sessions_file = OUTPUT_DIR / "sessions.json"

    # 创建用户
    admin = dict(ADMIN_USER)
    admin["password_hash"] = hash_password(ADMIN_PASSWORD)
    admin["created_at"] = int(time.time() * 1000)

    student = dict(STUDENT_USER)
    student["password_hash"] = hash_password(STUDENT_PASSWORD)
    student["created_at"] = int(time.time() * 1000)

    users_data = {"users": [admin, student]}
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump(users_data, f, ensure_ascii=False, indent=2)

    # 创建 sessions
    admin_token = "tok_test_admin_0001"
    student_token = "tok_test_student_0001"
    now_ms = int(time.time() * 1000)
    sessions_data = {"sessions": [
        {"token": admin_token, "user_id": admin["user_id"], "created_at": now_ms,
         "expires_at": now_ms + 24 * 3600 * 1000},
        {"token": student_token, "user_id": student["user_id"], "created_at": now_ms,
         "expires_at": now_ms + 24 * 3600 * 1000},
    ]}
    with open(sessions_file, "w", encoding="utf-8") as f:
        json.dump(sessions_data, f, ensure_ascii=False, indent=2)

    return admin_token, student_token


@pytest.fixture
def client():
    """带 admin token 的 client（大部分测试用）"""
    admin_token, _ = _seed_test_users()
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {admin_token}"})
    return c


@pytest.fixture
def raw_client():
    """不带 token 的 client（认证测试用）"""
    _seed_test_users()
    return TestClient(app)


@pytest.fixture
def student_client():
    """带 student token 的 client"""
    _, student_token = _seed_test_users()
    c = TestClient(app)
    c.headers.update({"Authorization": f"Bearer {student_token}"})
    return c
