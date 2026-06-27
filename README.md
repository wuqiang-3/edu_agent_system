# 🎓 教育学习系统 (Edu Agent System)

基于 AI Agent 的初中数学学习系统，利用 LangGraph 多 Agent 编排 + DeepSeek API，自动从教材中提取知识点、生成学习方法卡片和智能题库。

## ✨ 功能

- **知识点提取** — AI 自动从教材章节中提取结构化的知识点
- **学习方法卡片** — 为每个知识点生成对应的高效学习方法
- **智能出题** — 每个知识点自动生成 3 道不同难度的题目
- **学生端** — 章节选择 → 刷题 → 实时对错反馈 → 解析查看 → 错题本
- **管理台** — 章节管理、题库浏览、知识点管理

## 🚀 快速启动

```bash
# 1. 配置 API 密钥（在 edu_mvp/.env 中填入）
# DEEPSEEK_API_KEY=sk-xxxxx

# 2. 生成数据
cd edu_mvp && python mvp_main.py

# 3. 一键启动
bash edu_mvp/start_all.sh
```

## 📱 访问地址

| 服务 | 地址 |
|------|------|
| 学生端 | http://localhost:5173 |
| 管理台 | http://localhost:5173/admin |
| API 文档 | http://localhost:8000/docs |
| 后端 API | http://localhost:8000 |

## 🛠 技术栈

- **后端**: Python 3.10+ / FastAPI / LangGraph
- **前端**: React 18 / Vite / Tailwind CSS / Ant Design 6
- **AI**: DeepSeek Chat API
- **测试**: Jest + React Testing Library

## 📊 开发进度

详见 [edu_mvp/TODO.md](edu_mvp/TODO.md)

当前阶段：Phase 1 — 完善 MVP 基础（前后端联调 ✅ / 扩展章节 ✅ / 错题本持久化 ⬜）

## 📁 项目结构

```
edu_mvp/
├── mvp_main.py         # AI 数据生成主程序（4 Agent 编排）
├── backend/            # FastAPI 后端（端口 8000）
├── frontend/           # React 前端（端口 5173）
├── data/               # 教材种子数据
├── output/             # AI 生成结果
├── start_all.sh        # 一键启动脚本
└── stop_all.sh         # 一键停止脚本
```
