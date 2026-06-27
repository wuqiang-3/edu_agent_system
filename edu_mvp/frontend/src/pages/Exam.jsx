import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, Alert, Button, Progress, Modal } from 'antd'

const API_BASE = 'http://localhost:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token') || ''
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

/**
 * 模拟考试页面
 *
 * 体验规则：
 *  - 倒计时 90 分钟，超时自动交卷
 *  - 不可回退（模拟真实考试）
 *  - 答题卡实时标记 + 未做题提醒
 *  - 交卷后展示成绩 + 每题解析
 */
export default function Exam() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading')
  const [exam, setExam] = useState(null)
  const [chapters, setChapters] = useState([])         // 全部章节列表
  const [selectedChapters, setSelectedChapters] = useState([]) // 选中的章节 ID
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answersMap, setAnswersMap] = useState({})
  const [textInputs, setTextInputs] = useState({})
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(90 * 60)
  const [grading, setGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const timerRef = useRef(null)

  // ── 加载章节 + 生成试卷 ──
  useEffect(() => {
    loadChapters()
    return () => clearInterval(timerRef.current)
  }, [])

  async function loadChapters() {
    try {
      const res = await fetch(`${API_BASE}/api/chapters`)
      const chs = await res.json()
      setChapters(chs)
    } catch { /* ignore */ }
    generateExam([])  // 默认全册
  }

  async function generateExam(chapterIds) {
    try {
      setPhase('loading')
      const res = await fetch(`${API_BASE}/api/exam/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chapter_ids: chapterIds }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setPhase('error')
        return
      }
      setExam(data)
      setPhase('confirm')
    } catch (err) {
      setError('无法生成试卷，请确保后端已启动')
      setPhase('error')
    }
  }

  function toggleChapter(chId) {
    setSelectedChapters(prev =>
      prev.includes(chId) ? prev.filter(c => c !== chId) : [...prev, chId]
    )
  }

  function regenerateExam() {
    generateExam(selectedChapters)
  }

  function startExam() {
    setPhase('taking')
    // 启动倒计时
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          submitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── 答题 ──
  function selectAnswer(qId, answer) {
    setAnswersMap(prev => ({ ...prev, [qId]: answer }))
  }

  function setTextAnswer(qId, value) {
    setTextInputs(prev => ({ ...prev, [qId]: value }))
    setAnswersMap(prev => ({ ...prev, [qId]: value }))
  }

  const currentAnswer = (qId) => answersMap[qId] || textInputs[qId] || ''

  function goTo(idx) {
    if (idx >= 0 && idx < exam.questions.length) {
      setCurrentIndex(idx)
    }
  }

  // ── 交卷 ──
  async function submitExam() {
    clearInterval(timerRef.current)
    setGrading(true)
    setPhase('submitted')

    const answers = exam.questions.map(q => ({
      q_id: q.q_id,
      answer: answersMap[q.q_id] || '',
    }))

    try {
      const res = await fetch(`${API_BASE}/api/exam/grade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      setGradeResult(data)
    } catch (err) {
      setError('评分失败')
    } finally {
      setGrading(false)
    }
  }

  const answeredCount = Object.values(answersMap).filter(v => v?.trim()).length
  const unansweredCount = exam ? exam.questions.length - answeredCount : 0

  // ── 确认页面 ──
  if (phase === 'confirm' && exam) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">模拟考试</h2>
            <p className="text-gray-500 mb-8">陕西 · 8年级数学（北师大版）</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-blue-600">{exam.total_questions}</div>
                <div className="text-xs text-gray-500 mt-1">题目数量</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-green-600">{exam.total_score}</div>
                <div className="text-xs text-gray-500 mt-1">满分</div>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-yellow-600">90</div>
                <div className="text-xs text-gray-500 mt-1">分钟</div>
              </div>
            </div>

            <div className="text-left bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="font-semibold text-gray-700 mb-2">📋 试卷结构</p>
              <p className="text-sm text-gray-600">选择题 10 道 × 3 分 = 30 分</p>
              <p className="text-sm text-gray-600">填空题 6 道 × 5 分 = 30 分</p>
              <p className="text-sm text-gray-600">计算题 6 道 × 8 分 = 48 分</p>
              <p className="text-xs text-gray-400 mt-3">
                覆盖 {exam.chapter_coverage} 个章节 · 难度 5:3:2 配比
              </p>
            </div>

            {/* 章节选择器 */}
            {chapters.length > 0 && (
              <div className="text-left mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  📚 指定章节范围（不选=全册）
                </p>
                <div className="flex flex-wrap gap-2">
                  {chapters.map(ch => (
                    <button key={ch.chapter_id}
                      onClick={() => toggleChapter(ch.chapter_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedChapters.includes(ch.chapter_id)
                          ? 'bg-indigo-500 text-white shadow'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}>
                      {ch.chapter_title}
                    </button>
                  ))}
                </div>
                {selectedChapters.length > 0 && (
                  <button onClick={regenerateExam}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline">
                    🎯 按所选 {selectedChapters.length} 个章节重新组卷
                  </button>
                )}
                {selectedChapters.length === 0 && (
                  <button onClick={() => generateExam([])}
                    className="mt-2 text-xs text-gray-400 hover:text-indigo-600 underline">
                    🎲 随机换一套全册试卷
                  </button>
                )}
              </div>
            )}

            <div className="text-left text-sm text-gray-500 mb-8 space-y-2">
              <p>⚠️ 考试规则：</p>
              <p>· 总时长 90 分钟，倒计时结束自动交卷</p>
              <p>· 不可回退上一题（模拟真实考试）</p>
              <p>· 请认真作答，交卷后不可修改</p>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/student')}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50">
                暂不考试
              </button>
              <button onClick={startExam}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:shadow-lg">
                开始考试 →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 考试中 ──
  if (phase === 'taking' && exam) {
    const q = exam.questions[currentIndex]
    if (!q) return null

    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-4">

            {/* 顶部信息栏 */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">📝 模拟考试</h2>
                <p className="text-sm text-gray-500">第 {currentIndex + 1} / {exam.questions.length} 题</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'
                }`}>
                  ⏱ {formatTime(timeLeft)}
                </span>
                <button onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold hover:bg-red-200">
                  交卷
                </button>
              </div>
            </div>

            {/* 答题卡 */}
            <div className="bg-gray-50 rounded-xl p-3 mb-6 flex gap-1 flex-wrap">
              {exam.questions.map((_, idx) => (
                <button key={idx}
                  onClick={() => goTo(idx)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                    idx === currentIndex ? 'ring-2 ring-indigo-500 scale-110' : ''
                  } ${
                    answersMap[exam.questions[idx].q_id]?.trim()
                      ? 'bg-green-200 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* 题目类型标签 */}
            <div className="flex gap-2 mb-4">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                q.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                q.difficulty === '★★' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>{q.difficulty}</span>
              <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-700 font-bold">
                {q.question_type === 'choice' ? '选择题' : q.question_type === 'fill_blank' ? '填空题' : '计算题'}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                {q.exam_score} 分
              </span>
              <span className="px-2 py-1 rounded text-xs bg-purple-50 text-purple-600">
                {q.chapter_title || q.kp_name}
              </span>
            </div>

            {/* 题干 */}
            <div className="mb-8">
              <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-line">
                {q.question_text}
              </p>
            </div>

            {/* 选项 / 填空 / 计算 */}
            {q.question_type === 'choice' && q.options && q.options.length > 0 ? (
              <div className="space-y-3 mb-8">
                {q.options.map(opt => (
                  <button key={opt.label}
                    onClick={() => selectAnswer(q.q_id, opt.label)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      currentAnswer(q.q_id) === opt.label
                        ? 'border-indigo-500 bg-indigo-50 font-bold'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}>
                    <span className="font-bold mr-3">{opt.label}.</span>
                    {opt.content}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-8">
                <textarea
                  value={textInputs[q.q_id] || ''}
                  onChange={e => setTextAnswer(q.q_id, e.target.value)}
                  placeholder={q.question_type === 'fill_blank' ? '请填写答案...' : '请写出计算过程及答案...'}
                  className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none"
                  rows={q.question_type === 'calculation' ? 6 : 3}
                />
              </div>
            )}

            {/* 底部导航 */}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="px-6 py-2 rounded-xl border border-gray-300 text-gray-500 disabled:opacity-30">
                ← 上一题
              </button>
              <span className="text-sm text-gray-400 flex items-center">
                {answeredCount}/{exam.questions.length} 已答 {unansweredCount > 0 && `· ${unansweredCount} 未答`}
              </span>
              {currentIndex < exam.questions.length - 1 ? (
                <button onClick={() => goTo(currentIndex + 1)}
                  className="px-6 py-2 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600">
                  下一题 →
                </button>
              ) : (
                <button onClick={() => setShowSubmitModal(true)}
                  className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600">
                  交卷 📝
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 交卷确认弹窗 */}
        <Modal open={showSubmitModal} onCancel={() => setShowSubmitModal(false)}
          footer={null} centered title="确认交卷">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-lg font-bold text-gray-800 mb-2">确认提交试卷？</p>
            <p className="text-sm text-gray-500 mb-1">已答 {answeredCount} / {exam.questions.length} 题</p>
            {unansweredCount > 0 && (
              <p className="text-sm text-red-500 mb-4">⚠️ 还有 {unansweredCount} 题未答</p>
            )}
            <div className="flex gap-3 justify-center mt-4">
              <button onClick={() => setShowSubmitModal(false)}
                className="px-6 py-2 rounded-xl border border-gray-300 text-gray-600">
                继续答题
              </button>
              <button onClick={() => { setShowSubmitModal(false); submitExam() }}
                className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold">
                确认交卷
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // ── 成绩页面 ──
  if (phase === 'submitted') {
    if (grading) {
      return (
        <div className="min-h-screen flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="text-center text-white">
            <Spin size="large" />
            <p className="mt-4 text-lg">正在评分...</p>
          </div>
        </div>
      )
    }

    if (!gradeResult) return null

    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center">

            <div className="text-7xl mb-4">
              {gradeResult.accuracy >= 90 ? '🏆' : gradeResult.accuracy >= 70 ? '💪' : '📚'}
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">考试结束！</h2>
            <p className="text-gray-500 mb-8">模拟考试 · 陕西 8年级数学</p>

            {/* 核心成绩 */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`rounded-2xl p-4 ${gradeResult.accuracy >= 80 ? 'bg-green-50' : gradeResult.accuracy >= 60 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <div className="text-3xl font-bold"
                  style={{ color: gradeResult.accuracy >= 80 ? '#16a34a' : gradeResult.accuracy >= 60 ? '#d97706' : '#dc2626' }}>
                  {gradeResult.total_score}
                </div>
                <div className="text-xs text-gray-500 mt-1">得分 / {gradeResult.max_score}</div>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-blue-600">{gradeResult.accuracy}%</div>
                <div className="text-xs text-gray-500 mt-1">正确率</div>
              </div>
              <div className={`rounded-2xl p-4 ${gradeResult.wrong_count > 5 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className="text-3xl font-bold" style={{ color: gradeResult.wrong_count > 5 ? '#dc2626' : '#6b7280' }}>
                  {gradeResult.wrong_count}
                </div>
                <div className="text-xs text-gray-500 mt-1">错题数</div>
              </div>
            </div>

            {/* 逐题结果 */}
            <div className="text-left mb-8">
              <p className="font-semibold text-gray-700 mb-3">📋 逐题回顾</p>
              <div className="space-y-2">
                {gradeResult.details.map((d, idx) => (
                  <div key={d.q_id} className={`p-4 rounded-xl ${
                    d.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">
                        {idx + 1}. {d.kp_name}
                        <span className="ml-2 text-xs text-gray-400">({d.difficulty})</span>
                      </span>
                      <span className={`font-bold ${d.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                        {d.is_correct ? `✅ +${d.score}分` : '❌ 0分'}
                      </span>
                    </div>
                    {!d.is_correct && (
                      <div className="mt-2 text-sm">
                        <p className="text-red-700">你的答案：{d.student_answer || '（未作答）'}</p>
                        <p className="text-green-700">正确答案：{d.correct_answer}</p>
                        {d.analysis && (
                          <p className="text-gray-500 mt-1 text-xs">💡 {d.analysis}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 薄弱章节 */}
            {gradeResult.weak_chapters.length > 0 && (
              <div className="text-left mb-8">
                <p className="font-semibold text-gray-700 mb-3">⚠️ 需要加强的章节</p>
                <div className="space-y-2">
                  {gradeResult.weak_chapters.map(ch => (
                    <div key={ch.chapter_id} className="flex justify-between bg-amber-50 rounded-xl p-3">
                      <span className="text-sm text-gray-700">{ch.chapter_id}</span>
                      <span className="text-sm font-bold text-amber-700">正确率 {ch.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/student')}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50">
                ← 返回首页
              </button>
              <button onClick={() => navigate('/student/wrong')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold hover:shadow-lg">
                📕 查看错题本
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 加载/错误 ──
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="正在组卷..." />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="bg-white rounded-3xl p-8 max-w-md text-center">
          <div className="text-4xl mb-3">😞</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <Button type="primary" onClick={generateExam}>重试</Button>
        </div>
      </div>
    )
  }

  return null
}
