# 🎓 教育学习系统 (Edu Agent System)

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://langchain.com/langgraph"><img src="https://img.shields.io/badge/LangGraph-Agent_Orchestration-1C3C3C?style=flat-square&logo=langchain&logoColor=white" alt="LangGraph"></a>
  <a href="https://deepseek.com/"><img src="https://img.shields.io/badge/DeepSeek-Chat_API-4D6BFE?style=flat-square&logo=openai&logoColor=white" alt="DeepSeek"></a>
  <a href="https://ant.design/"><img src="https://img.shields.io/badge/Ant_Design-6-0170FE?style=flat-square&logo=antdesign&logoColor=white" alt="Ant Design"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://jestjs.io/"><img src="https://img.shields.io/badge/Jest-128_tests-C21325?style=flat-square&logo=jest&logoColor=white" alt="Jest"></a>
  <a href="#"><img src="https://img.shields.io/badge/bcrypt-Password_Hash-4B8BBE?style=flat-square" alt="bcrypt"></a>
  <a href="#"><img src="https://img.shields.io/badge/Status-MVP_Phase_1-8A2BE2?style=flat-square" alt="Status"></a>
</p>

基于 AI Agent 的初中数学学习系统，利用 LangGraph 多 Agent 编排 + DeepSeek API，自动从教材中提取知识点、生成学习方法卡片和智能题库。

## ✨ 功能

- **知识点提取** — AI 自动从教材章节中提取结构化的知识点
- **学习方法卡片** — 为每个知识点生成对应的高效学习方法
- **智能出题** — 每个知识点自动生成 3 道不同难度的题目
- **学生端** — 章节选择 → 刷题 → 实时对错反馈 → 解析查看 → 错题本
- **管理台** — 章节管理、题库浏览、知识点管理

## 🏗️ 系统架构

![系统架构图](docs/architecture.svg)

### 架构分层

| 层 | 技术 | 说明 |
|---|---|---|
| 🖥️ **前端层** | React 18 + Vite + Ant Design 6 + Tailwind CSS | SPA 应用，9 个页面，useQuiz 状态机驱动刷题 |
| ⚙️ **后端层** | FastAPI + Uvicorn + bcrypt | 7 个路由模块，25+ API 端点，Bearer Token 认证 |
| 💾 **数据层** | JSON 文件 + 线程锁 + 原子写入 | 9 个独立数据文件，MVP 阶段，计划迁移 PostgreSQL |
| 🤖 **AI 管道** | LangGraph StateGraph + DeepSeek API | 4 Agent 线性流水线：注入→提取→方法→出题 |
| 🚀 **部署** | GitHub Actions + Render | CI 双端测试 + 一键云端部署 |

### Agent 流水线

```
seed_injector → knowledge_extractor → learning_method → question_generator → summary
 (注入章节)       (提取知识点)           (生成方法卡片)     (智能出题×3)       (汇总保存)
      ↓                ↓                     ↓                 ↓
  State 内存      kp_partial.json     methods_partial.json  questions_partial.json
                                                              (逐KP增量追加)
```

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

| 层 | 技术组件 | 用途 |
|---|---|---|
| **AI Agent** | ![LangGraph](https://img.shields.io/badge/LangGraph-编排引擎-1C3C3C?style=flat-square) ![DeepSeek](https://img.shields.io/badge/DeepSeek-Chat_API-4D6BFE?style=flat-square) ![json5](https://img.shields.io/badge/json5-容错解析-555?style=flat-square) | 4 Agent 编排、LLM 调用、非标准 JSON 容错 |
| **后端** | ![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square) ![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square) ![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI-2094f3?style=flat-square) | REST API、认证鉴权、业务逻辑 |
| **安全** | ![bcrypt](https://img.shields.io/badge/bcrypt-密码哈希-4B8BBE?style=flat-square) ![Token](https://img.shields.io/badge/Bearer-Token_24h过期-F40?style=flat-square) | 密码加密、会话管理、IDOR 防护、限流 |
| **前端** | ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square) ![AntD](https://img.shields.io/badge/Ant_Design-6-0170FE?style=flat-square) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square) ![Router](https://img.shields.io/badge/React_Router-6.20-CA4245?style=flat-square) | SPA 应用、组件库、路由 |
| **测试** | ![Jest](https://img.shields.io/badge/Jest-128用例-C21325?style=flat-square) ![RTL](https://img.shields.io/badge/Testing_Library-React-E33332?style=flat-square) ![pytest](https://img.shields.io/badge/pytest-后端测试-0A9EDC?style=flat-square) | 前端 128 用例全部通过 |
| **CI/CD** | ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=flat-square) ![Render](https://img.shields.io/badge/Render-部署-46E3B7?style=flat-square) | 双端自动测试 + 一键部署 |

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
