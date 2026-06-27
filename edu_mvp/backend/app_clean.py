"""
Edu Agent API — 应用入口

⚠️ 本文件已重构为薄入口层（P1-17 模块拆分）
- 数据访问层：dal/
- 认证中间件：middleware/
- 业务路由：routers/
- 统一响应：services/

向后兼容：保持 `from app_clean import app` 可用，所有原有端点路径不变。
"""
import os
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ============================================================
# 日志配置
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("edu_api")

# ============================================================
# FastAPI 应用
# ============================================================
app = FastAPI(title="Edu Agent API")

# ============================================================
# CORS 白名单（P0-4 修复）
# ============================================================
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 统一异常处理（P1-18 修复）
# ============================================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": str(exc.detail),
                "detail": None,
            },
        },
    )

# ============================================================
# 健康检查
# ============================================================
@app.get("/")
def root():
    return {"msg": "Edu Agent API is running!"}


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Backend is running"}


# ============================================================
# 注册所有路由模块
# ============================================================
from routers.auth import router as auth_router, cleanup_expired_sessions
from routers.content import router as content_router
from routers.practice import router as practice_router
from routers.analysis import router as analysis_router
from routers.admin import router as admin_router
from routers.social import router as social_router
from routers.exam import router as exam_router

app.include_router(auth_router)
app.include_router(content_router)
app.include_router(practice_router)
app.include_router(analysis_router)
app.include_router(admin_router)
app.include_router(social_router)
app.include_router(exam_router)

# ============================================================
# 启动事件
# ============================================================
@app.on_event("startup")
def on_startup():
    cleanup_expired_sessions()
    logger.info("Edu Agent API 启动完成")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
