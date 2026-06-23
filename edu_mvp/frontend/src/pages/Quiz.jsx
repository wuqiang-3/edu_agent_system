import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spin, Alert, Button, Progress } from 'antd'

const API_BASE = 'http://localhost:8000'

export default function Quiz() {
  const { kpId } = useParams()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [kp, setKp] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [kpId])

  async function fetchData() {
    try {
      setLoading(true)
      const [questionsRes, kpsRes] = await Promise.all([
        fetch(`${API_BASE}/api/questions?kp_id=${kpId}`),
        fetch(`${API_BASE}/api/knowledge-points`),
      ])
      const questionsData = await questionsRes.json()
      const kpsData = await kpsRes.json()
      setQuestions(questionsData)
      setKp(kpsData.find(k => k.kp_id === kpId) || null)
      setError(null)
    } catch (err) {
      setError('无法加载题目，请确保后端已启动')
      console.error('API 连接失败:', err)
    } finally {
      setLoading(false)
      // 重置答题状态
      setCurrentQ(0)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  const handleAnswer = (option) => {
    if (showResult) return
    setSelectedAnswer(option)
    setShowResult(true)

    // 如果答错，加入错题本
    if (!option.is_correct) {
      setWrongQuestions(prev => [...prev, questions[currentQ].q_id])
      // 保存到 localStorage
      const wrong = JSON.parse(localStorage.getItem('wrongQuestions') || '[]')
      if (!wrong.includes(questions[currentQ].q_id)) {
        wrong.push(questions[currentQ].q_id)
        localStorage.setItem('wrongQuestions', JSON.stringify(wrong))
      }
    }
  }

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="正在加载题目..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🤔</div>
          <p className="text-2xl">该知识点暂无题目</p>
          <button
            onClick={() => navigate('/student')}
            className="mt-8 bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {kp?.kp_name || '刷题练习'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                第 {currentQ + 1} 题 / 共 {questions.length} 题
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                q.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                q.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {q.difficulty}
              </span>
              <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
                {q.score} 分
              </span>
            </div>
          </div>

          {/* Progress Bar - 使用 Ant Design Progress 组件 */}
          <Progress
            percent={Math.round(((currentQ + 1) / questions.length) * 100)}
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
            className="mb-6"
          />

          {/* Question */}
          <div className="mb-8">
            <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-line">
              {q.question_text}
            </p>
          </div>

          {/* Options */}
          {q.options && q.options.length > 0 ? (
            <div className="space-y-4 mb-8">
              {q.options.map((opt) => {
                let btnClass = 'w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 '
                if (!showResult) {
                  btnClass += 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                } else if (opt.is_correct) {
                  btnClass += 'border-green-500 bg-green-50'
                } else if (selectedAnswer === opt) {
                  btnClass += 'border-red-500 bg-red-50'
                } else {
                  btnClass += 'border-gray-200 opacity-50'
                }

                return (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswer(opt)}
                    className={btnClass}
                    disabled={showResult}
                  >
                    <span className="font-bold mr-3">{opt.label}.</span>
                    {opt.content}
                  </button>
                )
              })}
            </div>
          ) : (
            // 非选择题（填空/解答），显示输入框
            <div className="mb-8">
              <textarea
                className="w-full p-4 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none"
                rows={4}
                placeholder="请输入你的答案..."
                disabled={showResult}
              />
            </div>
          )}

          {/* Result */}
          {showResult && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">
                  {selectedAnswer?.is_correct ? '✅' : '❌'}
                </span>
                <span className="font-bold text-lg">
                  {selectedAnswer?.is_correct ? '回答正确！' : '回答错误'}
                </span>
              </div>
              <div className="text-gray-700 mb-4">
                <p className="font-semibold mb-2">💡 解析：</p>
                <p className="leading-relaxed">{q.analysis}</p>
              </div>
              {q.solution_steps && q.solution_steps.length > 0 && (
                <div className="text-gray-600 text-sm">
                  <p className="font-semibold mb-2">📝 解题步骤：</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {q.solution_steps.map((step, idx) => (
                      <li key={idx}>{step.description}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => navigate('/student')}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
            >
              ← 返回
            </button>
            {showResult && currentQ < questions.length - 1 && (
              <button
                onClick={nextQuestion}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                下一题 →
              </button>
            )}
            {showResult && currentQ === questions.length - 1 && (
              <button
                onClick={() => navigate('/student')}
                className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                🎉 完成！返回首页
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
