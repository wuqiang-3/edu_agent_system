import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button, message } from 'antd'

const API_BASE = 'http://localhost:8000'

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([])
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [filter, setFilter] = useState({ kpId: '', type: '' })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [questionsRes, kpsRes] = await Promise.all([
        fetch(`${API_BASE}/api/questions`),
        fetch(`${API_BASE}/api/knowledge-points`),
      ])
      const questionsData = questionsRes.ok ? await questionsRes.json() : []
      const kpsData = kpsRes.ok ? await kpsRes.json() : []
      setQuestions(questionsData)
      setKnowledgePoints(kpsData)
      setError(null)
    } catch (err) {
      setError('无法加载题目，请确保后端已启动（运行 bash start_backend.sh）')
      console.error('API 连接失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 知识点 ID → 名称映射
  const kpMap = {}
  knowledgePoints.forEach((kp) => {
    kpMap[kp.kp_id] = kp.kp_name
  })

  // 筛选题目
  const filtered = questions.filter((q) => {
    if (filter.kpId && q.kp_id !== filter.kpId) return false
    if (filter.type && q.question_type !== filter.type) return false
    return true
  })

  // 题型标签映射
  const typeLabels = {
    choice: '选择题',
    fill_blank: '填空题',
    calculation: '计算题',
    application: '应用题',
    true_false: '判断题',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" tip="正在加载题目..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={fetchData}>
              重试
            </Button>
          }
          style={{ maxWidth: 500 }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">题库管理</h1>
        <button
          onClick={() => alert('导入功能开发中')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          + 批量导入
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-center">
          <select
            value={filter.kpId}
            onChange={(e) => setFilter({ ...filter, kpId: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">全部知识点</option>
            {knowledgePoints.map((kp) => (
              <option key={kp.kp_id} value={kp.kp_id}>
                {kp.kp_name}
              </option>
            ))}
          </select>

          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">全部题型</option>
            <option value="choice">选择题</option>
            <option value="fill_blank">填空题</option>
            <option value="calculation">计算题</option>
            <option value="application">应用题</option>
            <option value="true_false">判断题</option>
          </select>

          <span className="text-sm text-gray-500 ml-auto">
            共 {filtered.length} 题
          </span>
        </div>

        {/* 题目表格 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">ID</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">知识点</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">题型</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">难度</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">题目预览</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                    暂无题目，请调整筛选条件或导入新题目
                  </td>
                </tr>
              ) : (
                filtered.map((q, i) => (
                  <tr key={q.q_id || i} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{q.q_id}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[150px] truncate">
                      {kpMap[q.kp_id] || q.kp_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {typeLabels[q.question_type] || q.question_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {'★'.repeat(q.difficulty === '★' ? 1 : q.difficulty === '★★' ? 2 : 3)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">
                      {q.question_text}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditing(q)}
                        className="text-blue-600 hover:underline text-xs mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => alert('删除功能开发中')}
                        className="text-red-600 hover:underline text-xs"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">编辑题目</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">题目内容</label>
                <textarea
                  value={editing.question_text}
                  onChange={(e) => setEditing({ ...editing, question_text: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">正确答案</label>
                <input
                  value={editing.correct_answer || ''}
                  onChange={(e) => setEditing({ ...editing, correct_answer: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setQuestions(questions.map((q) => (q.q_id === editing.q_id ? editing : q)))
                  setEditing(null)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                保存
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
