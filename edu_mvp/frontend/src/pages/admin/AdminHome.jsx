import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button, message } from 'antd'
import { fetchChapters, fetchKnowledgePoints, fetchQuestions, fetchMethods, updateKnowledgePoint, updateLearningMethod } from '../../api'

const typeLabels = { choice: '选择题', fill_blank: '填空题', calculation: '计算题', application: '应用题' }
const diffOptions = ['★', '★★', '★★★']
const impOptions = ['核心考点', '重要', '了解']
const freqOptions = ['高频', '中频', '低频']

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [chapters, setChapters] = useState([])
  const [kps, setKps] = useState([])
  const [questions, setQuestions] = useState([])
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editKp, setEditKp] = useState(null)
  const [editMethod, setEditMethod] = useState(null)  // 编辑学习方法
  const [kpPage, setKpPage] = useState(0)
  const [qPage, setQPage] = useState(0)
  const pageSize = 15

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [chs, kpsD, qs, ms] = await Promise.all([
        fetchChapters(), fetchKnowledgePoints(), fetchQuestions(), fetchMethods(),
      ])
      setChapters(chs)
      setKps(kpsD)
      setQuestions(qs)
      setMethods(ms)
      setError(null)
    } catch (err) {
      setError('无法加载数据')
    } finally { setLoading(false) }
  }

  // 统计
  const diffDist = { '★': 0, '★★': 0, '★★★': 0 }
  questions.forEach(q => { if (diffDist[q.difficulty] !== undefined) diffDist[q.difficulty]++ })
  const typeDist = {}
  questions.forEach(q => { typeDist[q.question_type] = (typeDist[q.question_type] || 0) + 1 })

  // 分页
  const kpPaged = kps.slice(kpPage * pageSize, (kpPage + 1) * pageSize)
  const kpTotalPages = Math.ceil(kps.length / pageSize)
  const qPaged = questions.slice(qPage * pageSize, (qPage + 1) * pageSize)
  const qTotalPages = Math.ceil(questions.length / pageSize)

  // KP 编辑
  const handleKpSave = async () => {
    if (!editKp) return
    try {
      const { kp_id, difficulty, importance, exam_frequency, prerequisites, typical_errors } = editKp
      const res = await updateKnowledgePoint(kp_id, { difficulty, importance, exam_frequency, prerequisites, typical_errors })
      if (res.status === 'ok') {
        message.success('已保存')
        setKps(prev => prev.map(k => k.kp_id === kp_id ? { ...k, ...editKp } : k))
        setEditKp(null)
      } else {
        message.error('保存失败')
      }
    } catch (err) {
      message.error('保存失败：' + err.message)
    }
  }

  // 学习方法编辑
  const handleMethodSave = async () => {
    if (!editMethod) return
    try {
      const { kp_id, method_type, memory_trick, learning_steps } = editMethod
      const res = await updateLearningMethod(kp_id, { method_type, memory_trick, learning_steps })
      if (res.status === 'ok') {
        message.success('已保存')
        setMethods(prev => prev.map(m => m.kp_id === kp_id ? { ...m, ...editMethod } : m))
        setEditMethod(null)
      } else {
        message.error('保存失败')
      }
    } catch (err) {
      message.error('保存失败：' + err.message)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spin size="large" tip="正在加载数据..." />
    </div>
  }
  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Alert message="加载失败" description={error} type="error" showIcon
        action={<Button type="primary" onClick={fetchData}>重试</Button>} style={{ maxWidth: 500 }} />
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚙️ 管理控制台</h1>
          <p className="text-gray-500 mt-2">陕西省 · 8年级 · 数学（北师大版）</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: '章节', value: chapters.length, icon: '📚', color: 'bg-blue-500' },
            { label: '知识点', value: kps.length, icon: '🎯', color: 'bg-green-500' },
            { label: '题目', value: questions.length, icon: '📝', color: 'bg-amber-500' },
            { label: '学习方法', value: methods.length, icon: '🧠', color: 'bg-purple-500' },
            { label: '错题数', value: 0, icon: '📕', color: 'bg-red-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`${s.color} text-white text-2xl p-3 rounded-xl`}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div className="bg-white rounded-2xl shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-6 px-6 overflow-x-auto">
              {[
                { key: 'overview', label: '📊 概览' },
                { key: 'kps', label: '🎯 知识点' },
                { key: 'questions', label: '📝 题目' },
                { key: 'methods', label: '🧠 方法' },
              ].map(tab => (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setEditKp(null) }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>{tab.label}</button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* === 概览 === */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-3">按难度分布</p>
                  <div className="flex gap-3">
                    {['★', '★★', '★★★'].map(d => (
                      <div key={d} className="flex-1 bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{diffDist[d] || 0}</p>
                        <p className="text-xs text-gray-500">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-3">按题型分布</p>
                  <div className="flex gap-3 flex-wrap">
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <div key={k} className="flex-1 min-w-[80px] bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold">{typeDist[k] || 0}</p>
                        <p className="text-xs text-gray-500">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === 知识点 === */}
            {activeTab === 'kps' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">🎯 知识点列表</h3>
                  <span className="text-sm text-gray-400">
                    第 {kpPage + 1}/{kpTotalPages} 页 · 共 {kps.length} 个
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500 font-medium">知识点</th>
                      <th className="text-left py-2 text-gray-500 font-medium">难度</th>
                      <th className="text-left py-2 text-gray-500 font-medium">重要性</th>
                      <th className="text-left py-2 text-gray-500 font-medium">考频</th>
                      <th className="text-right py-2 text-gray-500 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpPaged.map(kp => (
                      <tr key={kp.kp_id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-medium">{kp.kp_name}</p>
                          <p className="text-xs text-gray-400">{kp.kp_id}</p>
                        </td>
                        <td className="py-3">{kp.difficulty}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${kp.importance === '核心考点' ? 'bg-red-100 text-red-700' : kp.importance === '重要' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                            {kp.importance}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{kp.exam_frequency}</td>
                        <td className="py-3 text-right">
                          <button onClick={() => setEditKp(JSON.parse(JSON.stringify(kp)))}
                            className="text-blue-600 hover:underline text-xs">编辑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {kpTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button onClick={() => setKpPage(p => Math.max(0, p - 1))} disabled={kpPage === 0}
                      className="px-3 py-1 rounded border text-xs disabled:opacity-30">←</button>
                    {Array.from({ length: kpTotalPages }, (_, i) => (
                      <button key={i} onClick={() => setKpPage(i)}
                        className={`px-3 py-1 rounded text-xs ${kpPage === i ? 'bg-indigo-500 text-white' : 'border'}`}>{i + 1}</button>
                    ))}
                    <button onClick={() => setKpPage(p => Math.min(kpTotalPages - 1, p + 1))} disabled={kpPage >= kpTotalPages - 1}
                      className="px-3 py-1 rounded border text-xs disabled:opacity-30">→</button>
                  </div>
                )}

                {/* KP 编辑弹窗 */}
                {editKp && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setEditKp(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                      <h3 className="font-bold mb-4">✏️ 编辑知识点</h3>
                      <p className="text-sm text-gray-500 mb-4">{editKp.kp_id} - {editKp.kp_name}</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">难度</label>
                          <select value={editKp.difficulty || '★'}
                            onChange={e => setEditKp({ ...editKp, difficulty: e.target.value })}
                            className="w-full border rounded-lg p-2 text-sm">
                            {diffOptions.map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">重要性</label>
                          <select value={editKp.importance || '了解'}
                            onChange={e => setEditKp({ ...editKp, importance: e.target.value })}
                            className="w-full border rounded-lg p-2 text-sm">
                            {impOptions.map(v => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">考频</label>
                          <select value={editKp.exam_frequency || '中频'}
                            onChange={e => setEditKp({ ...editKp, exam_frequency: e.target.value })}
                            className="w-full border rounded-lg p-2 text-sm">
                            {freqOptions.map(v => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button onClick={handleKpSave}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">💾 保存</button>
                        <button onClick={() => setEditKp(null)}
                          className="px-4 py-2 border rounded-lg text-sm">取消</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === 题目 === */}
            {activeTab === 'questions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">📝 题目列表</h3>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-gray-400">
                      第 {qPage + 1}/{qTotalPages} 页 · 共 {questions.length} 题
                    </span>
                    <Link to="/admin/questions"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">完整管理 →</Link>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-500 font-medium">题型</th>
                      <th className="text-left py-2 text-gray-500 font-medium">难度</th>
                      <th className="text-left py-2 text-gray-500 font-medium">题目</th>
                      <th className="text-right py-2 text-gray-500 font-medium">分数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qPaged.map(q => (
                      <tr key={q.q_id} className="border-b hover:bg-gray-50">
                        <td className="py-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {typeLabels[q.question_type] || q.question_type}
                          </span>
                        </td>
                        <td className="py-2">{q.difficulty}</td>
                        <td className="py-2 text-gray-700 max-w-md truncate">{q.question_text}</td>
                        <td className="py-2 text-right text-gray-500">{q.score}分</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {qTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button onClick={() => setQPage(p => Math.max(0, p - 1))} disabled={qPage === 0}
                      className="px-3 py-1 rounded border text-xs disabled:opacity-30">←</button>
                    {Array.from({ length: qTotalPages }, (_, i) => (
                      <button key={i} onClick={() => setQPage(i)}
                        className={`px-3 py-1 rounded text-xs ${qPage === i ? 'bg-indigo-500 text-white' : 'border'}`}>{i + 1}</button>
                    ))}
                    <button onClick={() => setQPage(p => Math.min(qTotalPages - 1, p + 1))} disabled={qPage >= qTotalPages - 1}
                      className="px-3 py-1 rounded border text-xs disabled:opacity-30">→</button>
                  </div>
                )}
              </div>
            )}

            {/* === 学习方法 === */}
            {activeTab === 'methods' && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4">🧠 学习方法 · 点击卡片编辑</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {methods.map(m => (
                    <div key={m.kp_id}
                      onClick={() => setEditMethod(JSON.parse(JSON.stringify(m)))}
                      className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-300 transition-all">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-gray-900">{m.kp_name}</p>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          m.method_type === '理解型' ? 'bg-blue-100 text-blue-700' :
                          m.method_type === '运算型' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>{m.method_type}</span>
                      </div>
                      {m.memory_trick?.content && (
                        <p className="text-sm text-indigo-600 mt-2">💡 {m.memory_trick.content}</p>
                      )}
                      {m.learning_steps && (
                        <div className="mt-2 text-xs text-gray-500">
                          共 {m.learning_steps.length} 步 · 建议 {m.learning_steps.reduce((s, st) => s + (st.duration_min || 0), 0)} 分钟
                        </div>
                      )}
                      <p className="text-xs text-indigo-400 mt-2 opacity-0 group-hover:opacity-100">点击编辑 →</p>
                    </div>
                  ))}
                </div>

                {/* 学习方法编辑弹窗 */}
                {editMethod && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setEditMethod(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <h3 className="font-bold mb-4">✏️ 编辑学习方法</h3>
                      <p className="text-sm text-gray-500 mb-4">{editMethod.kp_id} - {editMethod.kp_name}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">方法类型</label>
                          <select value={editMethod.method_type || '理解型'}
                            onChange={e => setEditMethod({ ...editMethod, method_type: e.target.value })}
                            className="w-full border rounded-lg p-2 text-sm">
                            {['理解型', '运算型', '记忆型'].map(v => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">记忆技巧/口诀</label>
                          <textarea value={editMethod.memory_trick?.content || ''}
                            onChange={e => setEditMethod({ ...editMethod, memory_trick: { ...editMethod.memory_trick, content: e.target.value } })}
                            className="w-full border rounded-lg p-2 text-sm" rows={3}
                            placeholder="例如：勾三股四弦五" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-2">
                            学习步骤
                            <button onClick={() => {
                              const steps = [...(editMethod.learning_steps || []), { step: (editMethod.learning_steps || []).length + 1, action: '', duration_min: 5 }]
                              setEditMethod({ ...editMethod, learning_steps: steps })
                            }}
                              className="ml-2 text-xs text-indigo-500 hover:text-indigo-700 underline">+ 添加步骤</button>
                          </label>
                          <div className="space-y-2">
                            {(editMethod.learning_steps || []).map((step, idx) => (
                              <div key={idx} className="flex gap-2 items-start">
                                <span className="text-xs text-gray-400 mt-2 w-5">{step.step || idx + 1}.</span>
                                <input
                                  value={step.action || ''}
                                  onChange={e => {
                                    const steps = [...editMethod.learning_steps]
                                    steps[idx] = { ...steps[idx], action: e.target.value }
                                    setEditMethod({ ...editMethod, learning_steps: steps })
                                  }}
                                  className="flex-1 border rounded-lg p-2 text-xs" placeholder="这步做什么" />
                                <input
                                  type="number" min={1}
                                  value={step.duration_min || 5}
                                  onChange={e => {
                                    const steps = [...editMethod.learning_steps]
                                    steps[idx] = { ...steps[idx], duration_min: parseInt(e.target.value) || 5 }
                                    setEditMethod({ ...editMethod, learning_steps: steps })
                                  }}
                                  className="w-16 border rounded-lg p-2 text-xs text-center" />
                                <span className="text-xs text-gray-400 mt-2">分钟</span>
                                <button onClick={() => {
                                  const steps = editMethod.learning_steps.filter((_, i) => i !== idx)
                                  setEditMethod({ ...editMethod, learning_steps: steps })
                                }}
                                  className="text-red-400 hover:text-red-600 text-xs mt-2">✕</button>
                              </div>
                            ))}
                            {(!editMethod.learning_steps || editMethod.learning_steps.length === 0) && (
                              <p className="text-xs text-gray-400 py-2">暂无步骤，点击上方添加</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6">
                        <button onClick={handleMethodSave}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">💾 保存</button>
                        <button onClick={() => setEditMethod(null)}
                          className="px-4 py-2 border rounded-lg text-sm">取消</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
