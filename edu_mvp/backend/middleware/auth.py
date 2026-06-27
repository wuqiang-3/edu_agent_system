"""
认证中间件 — Depends 依赖注入

提供：
- get_current_user: 从 Authorization: Bearer <token> 解析当前用户
- require_admin: 要求管理员角色
- _resolve_student_id: IDOR 防护，非管理员只能操作自己数据
"""
import hashlib
import re
import secrets
import time
import logging
from typing import Optional

from fastapi import Depends, HTTPException, Header

try:
    import bcrypt
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False

from dal import load_users, save_users, load_sessions

logger = logging.getLogger("edu_api")

TOKEN_EXPIRY_HOURS = 24


# ============================================================
# 密码哈希
# ============================================================

def hash_password(password: str) -> str:
    """bcrypt 哈希（P0-3 修复）"""
    if HAS_BCRYPT:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"sha256${salt}${h}"


def verify_password(password: str, stored: str, salt: str = None) -> bool:
    """验证密码 — 兼容 bcrypt 新格式和 SHA-256 旧格式"""
    if HAS_BCRYPT and (stored.startswith("$2b$") or stored.startswith("$2a$")):
        return bcrypt.checkpw(password.encode(), stored.encode())
    if stored.startswith("sha256$"):
        parts = stored.split("$", 2)
        h = hashlib.sha256((parts[1] + password).encode()).hexdigest()
        return h == parts[2]
    if salt:
        h = hashlib.sha256((salt + password).encode()).hexdigest()
        return h == stored
    return False


def validate_password(password: str):
    """密码强度验证（P1-12 修复）"""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="密码至少 8 位")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="密码需包含大写字母")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="密码需包含小写字母")
    if not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="密码需包含数字")


# ============================================================
# 认证依赖
# ============================================================

def get_user_by_token(token: str) -> Optional[dict]:
    """通过 token 查找用户"""
    sessions = load_sessions()
    now = int(time.time() * 1000)
    for s in sessions.get("sessions", []):
        if s.get("token") == token:
            expires_at = s.get("expires_at", 0)
            if expires_at and expires_at < now:
                return None
            users = load_users()
            for u in users.get("users", []):
                if u.get("user_id") == s.get("user_id"):
                    return {k: v for k, v in u.items() if k not in ("password_hash", "salt")}
    return None


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """认证依赖：从 Authorization: Bearer <token> 解析当前用户"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录，请提供有效的 Authorization Header")
    token = authorization[7:]
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """授权依赖：要求管理员角色"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="仅管理员可操作")
    return user


def resolve_student_id(user: dict, client_student_id: str = None) -> str:
    """IDOR 防护：非管理员只能操作自己的数据"""
    if user.get("role") == "admin" and client_student_id:
        return client_student_id
    return user["user_id"]
