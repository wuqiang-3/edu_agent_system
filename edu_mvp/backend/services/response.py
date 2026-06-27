"""
统一响应格式（P1-18 修复）

提供：
- success_response: 成功 envelope
- error_response: 错误 envelope
"""
from fastapi.responses import JSONResponse


def success_response(data=None, message: str = "ok"):
    """成功响应 envelope"""
    return {"success": True, "data": data, "message": message}


def error_response(code: int, message: str, detail=None):
    """错误响应 envelope（统一格式）"""
    return JSONResponse(
        status_code=code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "detail": detail,
            },
        },
    )
