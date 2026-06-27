import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button } from 'antd'
import { fetchMethods, fetchChapters, fetchKnowledgePoints } from '../api'

export default function LearningMethods() {
  const [methods, setMethods] = useState([])
  const [chapters, setChapters] = useState([])
  const [kps, setKps] = useState([])
  const [filterChapter, setFilterChapter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [ms, chs, ks] = await Promise.all([
        fetchMethods(), fetchChapters(), fetchKnowledgePoints()
      ])
      setMethods(ms)
      setChapters(chs)
      setKps(ks)
      setError(null)
    } catch (err) {
      setError('无法连接后端，请确保后端已启动')
    } finally { setLoading(false) }
  }

  const kpMap = Object.fromEntries(kps.map(k => [k.kp_id, k.kp_name]))
  const chapterMap = Object.fromEntries(kps.map(k => [k.kp_id, k.chapter_id]))
  const chapterNameMap = Object.fromEntries(chapters.map(c => [c.chapter_id, c.chapter_title]))

  const filtered = filterChapter
    ? methods.filter(m => chapterMap[m.kp_id] === filterChapter)
    : methods

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Spin size="large" tip="加载学习方法..." />
    </div>
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Alert message="加载失败" description={error} type="error" showIcon
        action={<Button type="primary" onClick={fetchData}>重试</Button>} style={{ maxWidth: 500 }} />
    </div>
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* 章节筛选 */}
        <div className="mb-6 flex justify-center">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-gray-500 whitespace-nowrap">筛选章节：</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterChapter('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  !filterChapter ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >全部</button>
              {chapters.map(ch => (
                <button key={ch.chapter_id}
                  onClick={() => setFilterChapter(ch.chapter_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterChapter === ch.chapter_id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{ch.chapter_title}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 方法卡片网格 */}
        {filtered.length === 0 ? (
          <div className="text-center text-white/80 py-16">
            <p className="text-2xl mb-2">📭</p>
            <p>暂无学习方法数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => {
              const isOpen = expanded === m.kp_id
              const chId = chapterMap[m.kp_id]
              const totalMin = m.learning_steps?.reduce((s, st) => s + (st.duration_min || 0), 0) || 0
              return (
                <div key={m.kp_id}
                  onClick={() => setExpanded(isOpen ? null : m.kp_id)}
                  className={`bg-white/95 backdrop-blur-lg rounded-2xl shadow p-5 cursor-pointer transition-all duration-300 hover:shadow-xl ${
                    isOpen ? 'ring-2 ring-indigo-400 scale-[1.02]' : ''
                  }`}>
                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">{chId && chapterNameMap[chId]}</p>
                      <h3 className="font-bold text-gray-800 text-lg truncate">{kpMap[m.kp_id] || m.kp_id}</h3>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                      m.method_type === '理解型' ? 'bg-blue-100 text-blue-700' :
                      m.method_type === '运算型' ? 'bg-amber-100 text-amber-700' :
                      m.method_type === '记忆型' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>{m.method_type || '通用'}</span>
                  </div>

                  {/* 记忆口诀 */}
                  {m.memory_trick?.content && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">💡</span>
                        <span className="text-xs font-bold text-indigo-600">记忆口诀</span>
                      </div>
                      <p className="text-sm text-indigo-800 font-medium">{m.memory_trick.content}</p>
                    </div>
                  )}

                  {/* 学习步骤预览 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📋 {m.learning_steps?.length || 0} 个学习步骤</span>
                    {totalMin > 0 && <span>⏱ 约 {totalMin} 分钟</span>}
                    <span className="text-indigo-500">{isOpen ? '收起 ▲' : '展开 ▼'}</span>
                  </div>

                  {/* 展开的步骤详情 */}
                  {isOpen && m.learning_steps && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {m.learning_steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {step.step || idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{step.action}</p>
                            <p className="text-xs text-gray-400 mt-0.5">⏱ {step.duration_min || 0} 分钟</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <Link
                          to={`/student/quiz/${m.kp_id}`}
                          className="inline-block w-full text-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                        >
                          🎯 立即练习这个知识点 →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
