/**
 * API 工具模块
 * 统一管理后端地址、认证 Token、API 调用
 *
 * P0-8 修复：Token 改为 Authorization: Bearer Header 传递
 * P0-2 修复：注册不再传 role 参数
 * P0-6 修复：student_id 仍传但后端从 token 提取（IDOR 防护）
 */
const API_BASE = 'http://localhost:8000'

// ============================================================
// 认证
// ============================================================

/** 获取 auth token */
export function getToken() {
  return localStorage.getItem('auth_token') || ''
}

/** 获取当前登录用户 */
export function getCurrentUser() {
  const raw = localStorage.getItem('auth_user')
  return raw ? JSON.parse(raw) : null
}

/** 获取/创建学生 ID。已登录返回 user_id，未登录回退到本地生成 */
export function getStudentId() {
  const user = getCurrentUser()
  if (user && user.user_id) return user.user_id
  let sid = localStorage.getItem('student_id')
  if (!sid) {
    sid = 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    localStorage.setItem('student_id', sid)
  }
  return sid
}

/** 检查是否已登录 */
export function isLoggedIn() {
  return !!getToken()
}

/**
 * 构建认证 Headers（P0-8 修复：Token 通过 Authorization Bearer Header 传递）
 */
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * 统一的 fetch 封装 — 自动携带 Authorization Header
 */
async function fetchWithAuth(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  })
  return res.json()
}

/** 注册 — 不再传 role 参数（P0-2 修复） */
export async function registerUser(username, password, name) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, name }),
  })
  return res.json()
}

/** 登录 */
export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

/** 登出 — 通过 Authorization Header 认证（P0-8 修复） */
export async function logoutUser() {
  const token = getToken()
  if (token) {
    await fetchWithAuth('/api/auth/logout', { method: 'POST' })
  }
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

/** 验证 token 有效性，返回用户信息 — 通过 Authorization Header（P0-8 修复） */
export async function fetchMe() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ============================================================
// 章节 & 知识点（公开，无需认证）
// ============================================================

export async function fetchChapters() {
  const res = await fetch(`${API_BASE}/api/chapters`)
  return res.json()
}

export async function fetchKnowledgePoints(chapterId) {
  const params = chapterId ? `?chapter_id=${chapterId}` : ''
  const res = await fetch(`${API_BASE}/api/knowledge-points${params}`)
  return res.json()
}

export async function fetchQuestions(kpId) {
  const params = kpId ? `?kp_id=${kpId}` : ''
  const res = await fetch(`${API_BASE}/api/questions${params}`)
  return res.json()
}

// ============================================================
// 错题本 API（P0-8 修复：使用 fetchWithAuth 携带 Header）
// ============================================================

/** 记录错题 */
export async function addWrongQuestion(qId) {
  return fetchWithAuth('/api/wrong-questions', {
    method: 'POST',
    body: JSON.stringify({ q_id: qId, student_id: getStudentId() }),
  })
}

/** 获取当前学生的错题 ID 列表 */
export async function fetchWrongIds() {
  return fetchWithAuth(`/api/wrong-questions?student_id=${getStudentId()}`)
}

/** 移除一道错题 */
export async function removeWrongQuestion(qId) {
  return fetchWithAuth(`/api/wrong-questions/${qId}?student_id=${getStudentId()}`, {
    method: 'DELETE',
  })
}

/** 清空所有错题 */
export async function clearWrongQuestions() {
  return fetchWithAuth(`/api/wrong-questions?student_id=${getStudentId()}`, {
    method: 'DELETE',
  })
}

// ============================================================
// 收藏 API（P0-8 修复）
// ============================================================

/** 切换收藏状态 */
export async function toggleFavorite(qId) {
  return fetchWithAuth('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ q_id: qId, student_id: getStudentId() }),
  })
}

/** 获取收藏列表 */
export async function fetchFavoriteIds() {
  return fetchWithAuth(`/api/favorites?student_id=${getStudentId()}`)
}

// ============================================================
// 答题记录 + 分析 API（P0-8 修复）
// ============================================================

/** 记录一次答题 */
export async function recordAnswer({ qId, kpId, chapterId, difficulty, selectedAnswer, isCorrect, timeSpent }) {
  return fetchWithAuth('/api/answers', {
    method: 'POST',
    body: JSON.stringify({
      q_id: qId, kp_id: kpId, chapter_id: chapterId,
      difficulty, selected_answer: selectedAnswer,
      is_correct: isCorrect, time_spent: timeSpent,
      student_id: getStudentId(),
    }),
  })
}

/** 获取薄弱知识点分析 */
export async function fetchWeakPoints() {
  return fetchWithAuth(`/api/analysis/weak-points?student_id=${getStudentId()}`)
}

/** 获取推荐练习 */
export async function fetchRecommendations() {
  return fetchWithAuth(`/api/analysis/recommendations?student_id=${getStudentId()}`)
}

/** 获取自适应难度题目 */
export async function fetchAdaptiveQuestions(kpId, count = 3) {
  return fetchWithAuth(`/api/adaptive-questions?kp_id=${kpId}&student_id=${getStudentId()}&count=${count}`)
}

/** 获取学习方法（公开） */
export async function fetchMethods(chapterId) {
  const params = chapterId ? `?chapter_id=${chapterId}` : ''
  const res = await fetch(`${API_BASE}/api/learning-methods${params}`)
  return res.json()
}

/** 获取学习路径 */
export async function fetchLearningPath() {
  return fetchWithAuth(`/api/analysis/learning-path?student_id=${getStudentId()}`)
}

/** 获取复习计划 */
export async function fetchReviewSchedule() {
  return fetchWithAuth(`/api/analysis/review-schedule?student_id=${getStudentId()}`)
}

/** 获取学习报告 */
export async function fetchLearningReport(period = 'weekly') {
  return fetchWithAuth(`/api/analysis/learning-report?student_id=${getStudentId()}&period=${period}`)
}

// ============================================================
// 班级 API（P0-8 修复）
// ============================================================

export async function createClass(name, teacherId) {
  return fetchWithAuth('/api/classes', {
    method: 'POST',
    body: JSON.stringify({ name, teacher_id: teacherId }),
  })
}

export async function joinClass(joinCode) {
  return fetchWithAuth('/api/classes/join', {
    method: 'POST',
    body: JSON.stringify({ join_code: joinCode, student_id: getStudentId() }),
  })
}

export async function listClasses(userId) {
  return fetchWithAuth(`/api/classes?user_id=${userId || getStudentId()}`)
}

// ============================================================
// 积分/排行 API（P0-8 修复）
// ============================================================

export async function fetchStudentScore() {
  return fetchWithAuth(`/api/scores/${getStudentId()}`)
}

export async function awardPoints(points, streak = 0) {
  return fetchWithAuth('/api/scores/award', {
    method: 'POST',
    body: JSON.stringify({ student_id: getStudentId(), points, streak }),
  })
}

/** 排行榜（公开，无需认证） */
export async function fetchLeaderboard() {
  const res = await fetch(`${API_BASE}/api/leaderboard?limit=30`)
  return res.json()
}

/** 勋章定义（公开） */
export async function fetchBadges() {
  const res = await fetch(`${API_BASE}/api/scores/badges`)
  return res.json()
}

// ============================================================
// 家长 API（P0-8 修复）
// ============================================================

export async function linkParent(parentId, childId) {
  return fetchWithAuth('/api/parents/link', {
    method: 'POST',
    body: JSON.stringify({ parent_id: parentId, child_id: childId }),
  })
}

export async function fetchChildren(parentId) {
  return fetchWithAuth(`/api/parents/children?parent_id=${parentId}`)
}

// ============================================================
// 管理台 CRUD API（P0-7, P0-8 修复：携带认证 Header）
// ============================================================

/** 更新题目（部分更新） */
export async function updateQuestion(qId, body) {
  return fetchWithAuth(`/api/questions/${qId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** 删除题目 */
export async function deleteQuestion(qId) {
  return fetchWithAuth(`/api/questions/${qId}`, { method: 'DELETE' })
}

/** 更新知识点 */
export async function updateKnowledgePoint(kpId, body) {
  return fetchWithAuth(`/api/knowledge-points/${kpId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** 更新学习方法 */
export async function updateLearningMethod(kpId, body) {
  return fetchWithAuth(`/api/learning-methods/${kpId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/** 导出题目 */
export async function exportQuestions() {
  return fetchWithAuth('/api/questions/export')
}

/** 导入题目 */
export async function importQuestions(questions) {
  return fetchWithAuth('/api/questions/import', {
    method: 'POST',
    body: JSON.stringify({ questions }),
  })
}

export default API_BASE
