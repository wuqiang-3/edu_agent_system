/**
 * api.js 单元测试
 * 验证所有 API 函数能正确发出 HTTP 请求并处理响应
 */
import * as api from '../api'

const API_BASE = 'http://localhost:8000'

beforeEach(() => {
  fetch.mockReset()
})

describe('API 工具模块', () => {
  // ============================================================
  // 认证
  // ============================================================

  describe('认证', () => {
    test('registerUser 发送注册请求', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ token: 't1', user: { user_id: 'u1', role: 'student' } }) })

      const res = await api.registerUser('test', '1234', '测试')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/auth/register`, expect.objectContaining({ method: 'POST' }))
      expect(res.token).toBe('t1')
    })

    test('loginUser 发送登录请求', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ token: 't1', user: { user_id: 'u1', role: 'admin' } }) })

      const res = await api.loginUser('admin', 'admin')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/auth/login`, expect.objectContaining({ method: 'POST' }))
      expect(res.token).toBe('t1')
    })

    test('fetchMe 无 token 时返回 null', async () => {
      localStorage.removeItem('auth_token')
      const res = await api.fetchMe()
      expect(res).toBeNull()
    })
  })

  // ============================================================
  // 数据获取
  // ============================================================

  describe('数据获取', () => {
    test('fetchChapters 获取章节列表', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [{ chapter_id: 'ch1' }] })
      const res = await api.fetchChapters()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/chapters`)
      expect(res).toHaveLength(1)
    })

    test('fetchKnowledgePoints 带参数和不带参数', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [] })

      await api.fetchKnowledgePoints()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/knowledge-points`)

      await api.fetchKnowledgePoints('ch1')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/knowledge-points?chapter_id=ch1`)
    })

    test('fetchQuestions 带参数和不带参数', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [] })

      await api.fetchQuestions()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/questions`)

      await api.fetchQuestions('kp1')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/questions?kp_id=kp1`)
    })

    test('fetchMethods 获取学习方法', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [] })

      await api.fetchMethods()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/learning-methods`)

      await api.fetchMethods('ch1')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/learning-methods?chapter_id=ch1`)
    })
  })

  // ============================================================
  // 错题本
  // ============================================================

  describe('错题本', () => {
    test('addWrongQuestion 发送 POST', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
      await api.addWrongQuestion('q1')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/wrong-questions`, expect.objectContaining({ method: 'POST' }))
    })

    test('clearWrongQuestions 发送 DELETE', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
      await api.clearWrongQuestions()
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${API_BASE}/api/wrong-questions?student_id=`),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  // ============================================================
  // 管理台
  // ============================================================

  describe('管理台 CRUD', () => {
    test('updateQuestion 发送 PUT', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
      await api.updateQuestion('q1', { difficulty: '★★' })
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/questions/q1`, expect.objectContaining({ method: 'PUT' }))
    })

    test('deleteQuestion 发送 DELETE', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
      await api.deleteQuestion('q1')
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/questions/q1`, expect.objectContaining({ method: 'DELETE' }))
    })

    test('exportQuestions 获取导出数据', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ total: 5, questions: [] }) })
      const res = await api.exportQuestions()
      expect(res.total).toBe(5)
    })

    test('importQuestions 发送 POST', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => ({ added: 3 }) })
      const res = await api.importQuestions([{ q_id: 'q1' }])
      expect(res.added).toBe(3)
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/questions/import`, expect.objectContaining({ method: 'POST' }))
    })
  })

  // ============================================================
  // 积分 & 排行
  // ============================================================

  describe('积分与排行', () => {
    test('fetchLeaderboard 拉取排行', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [] })
      const res = await api.fetchLeaderboard()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/leaderboard?limit=30`)
    })

    test('fetchBadges 获取徽章', async () => {
      fetch.mockResolvedValue({ ok: true, json: async () => [] })
      await api.fetchBadges()
      expect(fetch).toHaveBeenCalledWith(`${API_BASE}/api/scores/badges`)
    })
  })
})
