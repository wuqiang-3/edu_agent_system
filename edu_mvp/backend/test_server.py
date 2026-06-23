"""
最小测试服务器
"""
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
def health():
    return {"status": "ok", "msg": "test server working"}

@app.get("/api/test")
def test():
    return {"test": "success"}
