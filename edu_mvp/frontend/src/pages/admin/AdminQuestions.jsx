import { useState, useEffect, useRef } from 'react'
import { Spin, Alert, Button, message, Modal } from 'antd'
import { fetchQuestions, fetchKnowledgePoints, updateQuestion, deleteQuestion, exportQuestions, importQuestions } from '../../api'

const typeLabels = { choice: '选择题', fill_blank: '填空题', calculation: '计算题', application: '应用题' }
const typeOptions = ['choice', 'fill_blank', 'calculation', 'application']
const difficultyOptions = ['★', '★★', '★★★']

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([])
  const [kps, setKps] = useState([])
  const [filter, setFilter] = useState({ kpId: '', type: '' })
  const [editing, setEditing] = useState(null)   // 正在编辑的题目的深拷贝
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const fileRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [qs, ks] = await Promise.all([fetchQuestions(), fetchKnowledgePoints()])
      setQuestions(qs)
      setKps(ks)
      setError(null)
    } catch (err) {
      setError('无法加载数据，请确保后端已启动')
    } finally { setLoading(false) }
  }

  // 筛选 + 分页
  const filtered = questions.filter(q => {
    if (filter.kpId && q.kp_id !== filter.kpId) return false
    if (filter.type && q.question_type !== filter.type) return false
    return true
  })
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const kpMap = Object.fromEntries(kps.map(k => [k.kp_id, k.kp_name]))

  // ============================================================
  // 编辑
  // ============================================================

  const openEdit = (q) => {
    setEditing(JSON.parse(JSON.stringify(q)))  // 深拷贝
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const { q_id, ...changes } = editing
      const res = await updateQuestion(q_id, changes)
      if (res.status === 'ok') {
        message.success('保存成功')
        setQuestions(prev => prev.map(q => q.q_id === q_id ? { ...q, ...changes } : q))
        setEditing(null)
      } else {
        message.error('保存失败：' + JSON.stringify(res))
      }
    } catch (err) {
      message.error('保存失败：' + err.message)
    } finally { setSaving(false) }
  }

  // ============================================================
  // 删除
  // ============================================================

  const handleDelete = (qId) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这道题吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteQuestion(qId)
          if (res.status === 'ok') {
            message.success('已删除')
            setQuestions(prev => prev.filter(q => q.q_id !== qId))
          } else {
            message.error('删除失败')
          }
        } catch (err) {
          message.error('删除失败：' + err.message)
        }
      },
    })
  }

  // ============================================================
  // 导出
  // ============================================================

  const handleExport = async () => {
    try {
      const data = await exportQuestions()
      const blob = new Blob([JSON.stringify(data.questions, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `questions_export_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success(`已导出 ${data.total} 道题`)
    } catch (err) {
      message.error('导出失败：' + err.message)
    }
  }

  // ============================================================
  // 导入
  // ============================================================

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        message.error('JSON 格式错误，请检查文件')
        return
      }
      const arr = Array.isArray(parsed) ? parsed : parsed.questions
      if (!Array.isArray(arr) || arr.length === 0) {
        message.error('文件中未找到题目数据')
        return
      }
      const res = await importQuestions(arr)
      message.success(`成功导入 ${res.added || 0} 道题（重复的已自动跳过）`)
      fetchData()  // 刷新列表
    } catch (err) {
      message.error('导入失败：' + err.message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ============================================================
  // 渲染
  // ============================================================

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Spin size="large" tip="正在加载..." />
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
      {/* 顶部栏 */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📝 题库管理</h1>
        <div className="flex gap-3">
          <button onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            📥 导出 JSON
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            📤 导入
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport}
            className="hidden" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* 筛选栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-center">
          <select value={filter.kpId}
            onChange={e => { setFilter(f => ({ ...f, kpId: e.target.value })); setPage(0) }}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">全部知识点</option>
            {kps.map(kp => (
              <option key={kp.kp_id} value={kp.kp_id}>{kp.kp_name}</option>
            ))}
          </select>
          <select value={filter.type}
            onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0) }}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">全部题型</option>
            {typeOptions.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </select>
        </div>

        {/* 题目表格 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium w-16">#</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">题型</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">难度</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">知识点</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">题目</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400">暂无题目</td></tr>
              ) : (
                paged.map((q, i) => (
                  <tr key={q.q_id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{page * pageSize + i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {typeLabels[q.question_type] || q.question_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{q.difficulty}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{kpMap[q.kp_id] || q.kp_id}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[360px] truncate">{q.question_text}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(q)}
                        className="text-blue-600 hover:underline text-xs mr-3">编辑</button>
                      <button onClick={() => handleDelete(q.q_id)}
                        className="text-red-600 hover:underline text-xs">删除</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 bg-white rounded-lg shadow px-4 py-3">
            {/* 左侧：总数 + 每页条数 */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>共 <b className="text-gray-700">{filtered.length}</b> 题</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}
                className="border rounded px-2 py-1 text-xs bg-white cursor-pointer hover:border-blue-400"
              >
                {[10, 20, 50, 100].map(s => (
                  <option key={s} value={s}>{s} 条/页</option>
                ))}
              </select>
            </div>

            {/* 中间：页码 */}
            <div className="flex items-center gap-1">
              {/* 上一页 */}
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1.5 text-sm rounded border border-gray-200 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ‹
              </button>

              {/* 页码按钮 */}
              {(() => {
                const pages = []
                const total = totalPages
                const current = page
                const delta = 2 // 当前页前后各显示2页

                let start = Math.max(0, current - delta)
                let end = Math.min(total - 1, current + delta)

                // 保证至少显示5个页码（如果总数够）
                if (end - start < 4) {
                  if (start === 0) end = Math.min(total - 1, start + 4)
                  else start = Math.max(0, end - 4)
                }

                // 第一页
                if (start > 0) {
                  pages.push(
                    <button key={0} onClick={() => setPage(0)}
                      className="min-w-[32px] h-8 text-sm rounded border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >1</button>
                  )
                  if (start > 1) {
                    pages.push(<span key="ellipsis1" className="px-1 text-gray-400 text-xs">…</span>)
                  }
                }

                // 中间页码
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button key={i} onClick={() => setPage(i)}
                      className={`min-w-[32px] h-8 text-sm rounded transition-colors ${
                        i === current
                          ? 'bg-blue-600 text-white border border-blue-600 font-medium shadow-sm'
                          : 'border border-gray-200 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >{i + 1}</button>
                  )
                }

                // 最后一页
                if (end < total - 1) {
                  if (end < total - 2) {
                    pages.push(<span key="ellipsis2" className="px-1 text-gray-400 text-xs">…</span>)
                  }
                  pages.push(
                    <button key={total - 1} onClick={() => setPage(total - 1)}
                      className="min-w-[32px] h-8 text-sm rounded border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >{total}</button>
                  )
                }

                return pages
              })()}

              {/* 下一页 */}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1.5 text-sm rounded border border-gray-200 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ›
              </button>
            </div>

            {/* 右侧：跳转 */}
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>前往</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue=""
                placeholder={`1-${totalPages}`}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = parseInt(e.target.value)
                    if (v >= 1 && v <= totalPages) {
                      setPage(v - 1)
                      e.target.value = ''
                    }
                  }
                }}
                className="w-14 border rounded px-2 py-1 text-xs text-center"
              />
              <span>页</span>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">✏️ 编辑题目</h3>

            <div className="space-y-4">
              {/* 题目标题 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">题目内容</label>
                <textarea value={editing.question_text || ''}
                  onChange={e => setEditing({ ...editing, question_text: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm" rows={3} />
              </div>

              {/* 难度 + 分数 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">难度</label>
                  <select value={editing.difficulty || '★'}
                    onChange={e => setEditing({ ...editing, difficulty: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm">
                    {difficultyOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">分数</label>
                  <input value={editing.score || 3}
                    onChange={e => setEditing({ ...editing, score: parseInt(e.target.value) || 3 })}
                    className="w-full border rounded-lg p-2 text-sm" type="number" min={1} max={20} />
                </div>
              </div>

              {/* 选择题选项 */}
              {editing.question_type === 'choice' && editing.options && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">选项</label>
                  {editing.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm w-6">{opt.label}.</span>
                      <input value={opt.content || ''}
                        onChange={e => {
                          const opts = [...editing.options]
                          opts[idx] = { ...opts[idx], content: e.target.value }
                          setEditing({ ...editing, options: opts })
                        }}
                        className="flex-1 border rounded-lg p-2 text-sm" />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input type="radio" name="correct_opt"
                          checked={opt.is_correct}
                          onChange={() => {
                            const opts = editing.options.map((o, i) => ({ ...o, is_correct: i === idx }))
                            setEditing({ ...editing, options: opts, correct_answer: opt.label })
                          }} />
                        正确答案
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* 正确答案 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">正确答案</label>
                <input value={editing.correct_answer || ''}
                  onChange={e => setEditing({ ...editing, correct_answer: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm" />
              </div>

              {/* 解析 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">解析</label>
                <textarea value={editing.analysis || ''}
                  onChange={e => setEditing({ ...editing, analysis: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm" rows={3} />
              </div>

              {/* 解题步骤 */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  解题步骤
                  <button onClick={() => {
                    const steps = [...(editing.solution_steps || []), { step: (editing.solution_steps || []).length + 1, description: '' }]
                    setEditing({ ...editing, solution_steps: steps })
                  }}
                    className="ml-2 text-xs text-indigo-500 hover:text-indigo-700 underline">+ 添加步骤</button>
                </label>
                <div className="space-y-2">
                  {(editing.solution_steps || []).map((s, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-xs text-gray-400 mt-2 w-5">{s.step || idx + 1}.</span>
                      <input
                        value={s.description || ''}
                        onChange={e => {
                          const steps = [...editing.solution_steps]
                          steps[idx] = { ...steps[idx], description: e.target.value }
                          setEditing({ ...editing, solution_steps: steps })
                        }}
                        className="flex-1 border rounded-lg p-2 text-xs" placeholder="步骤描述" />
                      <button onClick={() => {
                        const steps = editing.solution_steps.filter((_, i) => i !== idx)
                        setEditing({ ...editing, solution_steps: steps })
                      }}
                        className="text-red-400 hover:text-red-600 text-xs mt-2">✕</button>
                    </div>
                  ))}
                  {(!editing.solution_steps || editing.solution_steps.length === 0) && (
                    <p className="text-xs text-gray-400 py-2">暂无步骤，点击上方添加</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? '保存中...' : '💾 保存'}
              </button>
              <button onClick={() => setEditing(null)}
                className="px-6 py-2 border rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
