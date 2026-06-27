"""
认证路由 — 注册/登录/登出/me

P0-2 强制 role=student
P0-3 bcrypt 哈希 + 老 SHA-256 自动迁移
P0-8 Token 通过 Authorization Bearer Header
P1-10 Token 24h 过期 + 启动清理
P1-11 登录/注册速率限制（内存限流器）
P1-12 密码强度要求
"""
import secrets
import time
import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from pydantic import BaseModel

from dal import load_users, save_users, load_sessions, save_sessions
from middleware import (
    get_current_user, hash_password, verify_password,
    validate_password, TOKEN_EXPIRY_HOURS,
)

logger = logging.getLogger("edu_api")
router = APIRouter(prefix="/api/auth", tags=["auth"])

# ============================================================
# 简单内存限流器（P1-11 修复）
# ============================================================
_rate_limit_store = defaultdict(list)

def _check_rate_limit(key: str, max_count: int, window_seconds: int):
    """检查速率限制。超限则 raise 429"""
    now = time.time()
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > now - window_seconds]
    if len(_rate_limit_store[key]) >= max_count:
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
    _rate_limit_store[key].append(now)


class RegisterBody(BaseModel):
    username: str
    password: str
    name: str = ""


class LoginBody(BaseModel):
    username: str
    password: str


@router.on_event("startup")
def cleanup_expired_sessions():
    """启动时清理过期 sessions"""
    now = int(time.time() * 1000)
    sessions = load_sessions()
    before = len(sessions.get("sessions", []))
    sessions["sessions"] = [
        s for s in sessions.get("sessions", [])
        if s.get("expires_at", 0) == 0 or s.get("expires_at", 0) >= now
    ]
    after = len(sessions["sessions"])
    if before != after:
        save_sessions(sessions)
        logger.info(f"启动清理：删除 {before - after} 个过期 session")


@router.post("/register")
def register(request: Request, body: RegisterBody):
    """注册新用户 — 强制 role=student，速率限制 3次/分钟/IP"""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(f"register:{client_ip}", max_count=3, window_seconds=60)
    try:
        validate_password(body.password)
    except HTTPException as e:
        from services import error_response
        return error_response(e.status_code, e.detail)

    data = load_users()
    for u in data.get("users", []):
        if u.get("username") == body.username:
            from services import error_response
            return error_response(400, "用户名已存在")

    pw_hash = hash_password(body.password)
    user = {
        "user_id": f"u_{secrets.token_hex(8)}",
        "username": body.username,
        "name": body.name or body.username,
        "role": "student",
        "password_hash": pw_hash,
        "salt": "",
        "created_at": int(time.time() * 1000),
    }
    data.setdefault("users", []).append(user)
    save_users(data)

    token = f"tok_{secrets.token_hex(24)}"
    now_ms = int(time.time() * 1000)
    sessions = load_sessions()
    sessions.setdefault("sessions", []).append({
        "token": token,
        "user_id": user["user_id"],
        "created_at": now_ms,
        "expires_at": now_ms + TOKEN_EXPIRY_HOURS * 3600 * 1000,
    })
    save_sessions(sessions)

    logger.info(f"新用户注册: {body.username} (student)")
    return {
        "status": "ok",
        "token": token,
        "user": {k: v for k, v in user.items() if k not in ("password_hash", "salt")},
    }


@router.post("/login")
def login(request: Request, body: LoginBody):
    """登录 — bcrypt 验证 + 兼容旧 SHA-256，速率限制 5次/分钟/IP"""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(f"login:{client_ip}", max_count=5, window_seconds=60)
    users_data = load_users()
    user = None
    need_upgrade = False
    for u in users_data.get("users", []):
        if u.get("username") == body.username:
            stored_hash = u.get("password_hash", "")
            salt = u.get("salt", "")
            if verify_password(body.password, stored_hash, salt if salt else None):
                user = u
                if not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$") or stored_hash.startswith("sha256$")):
                    need_upgrade = True
                break

    if not user:
        logger.warning(f"登录失败: {body.username}")
        from services import error_response
        return error_response(401, "用户名或密码错误")

    if need_upgrade:
        new_hash = hash_password(body.password)
        for u in users_data["users"]:
            if u["user_id"] == user["user_id"]:
                u["password_hash"] = new_hash
                u["salt"] = ""
                break
        save_users(users_data)
        logger.info(f"密码已自动升级为 bcrypt: {body.username}")

    token = f"tok_{secrets.token_hex(24)}"
    now_ms = int(time.time() * 1000)
    sessions = load_sessions()
    sessions.setdefault("sessions", []).append({
        "token": token,
        "user_id": user["user_id"],
        "created_at": now_ms,
        "expires_at": now_ms + TOKEN_EXPIRY_HOURS * 3600 * 1000,
    })
    save_sessions(sessions)

    logger.info(f"用户登录: {body.username}")
    return {
        "status": "ok",
        "token": token,
        "user": {k: v for k, v in user.items() if k not in ("password_hash", "salt")},
    }


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """通过 Authorization Header 获取当前用户信息"""
    return user


@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    """登出 — 删除该用户所有 session"""
    sessions = load_sessions()
    sessions["sessions"] = [s for s in sessions["sessions"] if s.get("user_id") != user["user_id"]]
    save_sessions(sessions)
    logger.info(f"用户登出: {user.get('username')}")
    return {"status": "ok"}
