import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button, Card, Progress } from 'antd'

const API_BASE = 'http://localhost:8000'

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [chapters, setChapters] = useState([])
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [questions, setQuestions] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [statsRes, chaptersRes, kpsRes, questionsRes, methodsRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/api/chapters`),
        fetch(`${API_BASE}/api/knowledge-points`),
        fetch(`${API_BASE}/api/questions`),
        fetch(`${API_BASE}/api/methods`),
      ])

      const statsData = statsRes.ok ? await statsRes.json() : null
      const chaptersData = chaptersRes.ok ? await chaptersRes.json() : []
      const kpsData = kpsRes.ok ? await kpsRes.json() : []
      const questionsData = questionsRes.ok ? await questionsRes.json() : []
      const methodsData = methodsRes.ok ? await methodsRes.json() : []

      setStats(statsData)
      setChapters(chaptersData)
      setKnowledgePoints(kpsData)
      setQuestions(questionsData)
      setMethods(methodsData)
      setError(null)
    } catch (err) {
      setError('无法连接后端 API，请确保后端已启动（运行 bash start_backend.sh）')
      console.error('API 连接失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" tip="正在加载数据..." />
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

  // 统计卡片数据
  const statsCards = stats ? [
    { label: '章节数', value: stats.total_chapters || 0, icon: '📚', color: 'bg-blue-500' },
    { label: '知识点数', value: stats.total_knowledge_points || 0, icon: '🎯', color: 'bg-green-500' },
    { label: '题目数', value: stats.total_questions || 0, icon: '📝', color: 'bg-amber-500' },
    { label: '学习方法', value: stats.total_methods || 0, icon: '🧠', color: 'bg-purple-500' },
  ] : [
    { label: '章节数', value: chapters.length, icon: '📚', color: 'bg-blue-500' },
    { label: '知识点数', value: knowledgePoints.length, icon: '🎯', color: 'bg-green-500' },
    { label: '题目数', value: questions.length, icon: '📝', color: 'bg-amber-500' },
    { label: '学习方法', value: methods.length, icon: '🧠', color: 'bg-purple-500' },
  ]

  // 题目难度分布
  const difficultyStats = {
    '★': questions.filter(q => q.difficulty === '★').length,
    '★★': questions.filter(q => q.difficulty === '★★').length,
    '★★★': questions.filter(q => q.difficulty === '★★★').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚙️ 管理控制台</h1>
          <p className="text-gray-500 mt-2">陕西省 · 8年级 · 数学（人教版）MVP</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} text-white text-3xl p-4 rounded-xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['overview', 'chapters', 'questions', 'methods'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {{ overview: '📊 概览', chapters: '📚 章节管理', questions: '📝 题库管理', methods: '🧠 学习方法' }[tab]}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">📈 数据概览</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">按难度分布（题目）</p>
                    <div className="flex gap-2">
                      {['★', '★★', '★★★'].map(diff => {
                        const count = difficultyStats[diff] || 0
                        return (
                          <div key={diff} className="flex-1 bg-white rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{count}</p>
                            <p className="text-xs text-gray-500">{diff}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">按题型分布（题目）</p>
                    <div className="flex gap-2">
                      {['choice', 'fill_blank', 'calculation', 'application'].map(type => {
                        const count = questions.filter(q => q.question_type === type).length || 0
                        const label = { choice: '选择题', fill_blank: '填空题', calculation: '计算题', application: '应用题' }[type]
                        return (
                          <div key={type} className="flex-1 bg-white rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{count}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chapters' && (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-500">章节</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">小节数</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">知识点数</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map(ch => {
                      const kpCount = knowledgePoints.filter(k => k.chapter_id === ch.chapter_id).length || 0
                      return (
                        <tr key={ch.chapter_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4">
                            <p className="font-medium text-gray-900">{ch.chapter_title}</p>
                            <p className="text-xs text-gray-400">ID: {ch.chapter_id}</p>
                          </td>
                          <td className="py-4 text-gray-600">{ch.sections?.length || 0}</td>
                          <td className="py-4 text-gray-600">{kpCount}</td>
                          <td className="py-4 text-right">
                            <Link
                              to="/admin/questions"
                              className="text-indigo-600 hover:text-indigo-800 text-sm"
                            >
                              查看题目 →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'questions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">📝 题目管理</h3>
                  <button className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600">
                    + 添加题目
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-500">ID</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">知识点</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">类型</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-500">难度</th>
                      <th className="text-right py-3 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.slice(0, 10).map(q => (
                      <tr key={q.q_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 text-xs text-gray-400">{q.q_id}</td>
                        <td className="py-3">
                          <p className="text-sm text-gray-900 truncate max-w-xs">{q.kp_name}</p>
                        </td>
                        <td className="py-3">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {q.question_type === 'choice' ? '选择题' :
                             q.question_type === 'fill_blank' ? '填空题' :
                             q.question_type === 'calculation' ? '计算题' :
                             q.question_type === 'application' ? '应用题' :
                             q.question_type}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            q.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                            q.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button className="text-indigo-600 hover:text-indigo-800 text-sm mr-4">编辑</button>
                          <button className="text-red-600 hover:text-red-800 text-sm">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {questions.length > 10 && (
                  <p className="text-center text-gray-400 text-sm mt-4">
                    仅显示前 10 题，共 {questions.length} 题
                  </p>
                )}
              </div>
            )}

            {activeTab === 'methods' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">🧠 学习方法管理</h3>
                <div className="space-y-4">
                  {methods.slice(0, 5).map(method => (
                    <div key={method.kp_id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{method.kp_name}</p>
                          <p className="text-sm text-gray-500 mt-1">类型：{method.method_type}</p>
                        </div>
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                          {method.memory_trick?.type || '口诀'}
                        </span>
                      </div>
                      {method.memory_trick && (
                        <div className="mt-3 bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">记忆口诀</p>
                          <p className="text-sm text-indigo-600 font-medium">{method.memory_trick.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
