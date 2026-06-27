# 教育学习系统 (Edu Agent System)

初中数学学习 AI 系统，基于 LangGraph 多 Agent 编排 + DeepSeek API 实现教材知识点提取、学习方法生成和智能出题。

## 技术栈

| 层 | 技术 |
|------|--------|
| 后端 | Python 3.10+ / FastAPI / Uvicorn |
| 前端 | React 18 / Vite / Tailwind CSS / Ant Design 6 |
| AI | DeepSeek Chat API / LangGraph Agent 编排 |
| 测试 | Jest + React Testing Library |
| 数据 | JSON 文件（MVP）/ 待迁移 PostgreSQL |

## 项目结构

```
edu_agent_system/
├── CLAUDE.md
├── .gitignore
└── edu_mvp/                      # 主项目目录
    ├── mvp_main.py               # MVP 主程序（4 Agent 编排 + 数据生成）
    ├── backend/
    │   ├── app_clean.py          # FastAPI 后端主入口（推荐）
    │   ├── app.py                # 旧版后端
    │   └── start.sh
    ├── frontend/
    │   ├── src/
    │   │   ├── App.jsx           # 路由入口
    │   │   ├── pages/            # 页面组件
    │   │   │   ├── StudentHome.jsx      # 学生端首页
    │   │   │   ├── Quiz.jsx             # 刷题页
    │   │   │   ├── WrongBook.jsx        # 错题本
    │   │   │   └── admin/               # 管理台页面
    │   │   ├── components/       # 通用组件
    │   │   └── __tests__/        # 测试用例
    │   └── vite.config.js        # Vite 配置（端口 5173）
    ├── data/seed_data.json       # 教材章节种子数据
    ├── output/                   # 生成结果（已 gitignore）
    ├── start_all.sh              # 一键启动
    ├── stop_all.sh               # 一键停止
    └── .env                      # API 密钥（已 gitignore）
```

## 常用命令

```bash
# 生成知识点 + 题目数据
cd edu_mvp && python mvp_main.py

# 启动后端（FastAPI，端口 8000）
bash edu_mvp/start_backend.sh

# 启动前端（Vite，端口 5173）
bash edu_mvp/start_frontend.sh

# 一键启动全部
bash edu_mvp/start_all.sh

# 停止全部
bash edu_mvp/stop_all.sh

# 前端测试
cd edu_mvp/frontend && npm test
```

## 后端 API

运行后端后访问 `http://localhost:8000/docs` 查看 Swagger 文档。

主要接口：
- `GET /api/chapters` — 获取章节列表
- `GET /api/knowledge-points?chapter_id=X` — 获取知识点
- `GET /api/questions?chapter_id=X` — 获取题目
- `POST /api/check-answer` — 提交答案并返回对错 + 解析
- `GET /api/learning-methods?chapter_id=X` — 获取学习方法

## 约定

- 后端使用 `app_clean.py`（最新版），`app.py`、`app_v2.py`、`app_flask.py` 为历史版本
- `.env` 中配置 `DEEPSEEK_API_KEY`
- 代码用中文注释，变量名用英文
- Phase 1 调试阶段，前端 url 可写死为 `http://localhost:8000`

## 开发阶段

当前 Phase 1（完善 MVP），详见 `edu_mvp/TODO.md`。
