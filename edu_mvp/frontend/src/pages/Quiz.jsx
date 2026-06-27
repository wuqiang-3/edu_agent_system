import { useParams, useNavigate } from 'react-router-dom'
import { Spin, Alert, Button, Progress } from 'antd'
import useQuiz from '../hooks/useQuiz'

/**
 * 答题页面（P1-16 重构：useReducer + useQuiz hook）
 *
 * 状态机：loading → empty/error/answering → checking → (answering|finished)
 */
export default function Quiz() {
  const { kpId } = useParams()
  const navigate = useNavigate()

  const {
    // 状态
    phase, questions, kp, currentIndex, selectedAnswer, textAnswer,
    showCard, elapsed, adaptiveMode, suggestedDiff, diffStats,
    allAnswered, reviewMode, learningMethod, error,
    isFav, currentQ,
    // 派生
    correctCount, wrongCount, unansweredCount, accuracy, formatTime,
    answers,
    // 操作
    handleAnswer, handleTextSubmit, nextQuestion, jumpTo,
    toggleCard, toggleMode, handleToggleFav, setTextAnswer, fetchData,
  } = useQuiz(kpId)

  // ============================================================
  // 渲染：加载 / 错误 / 空
  // ============================================================

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="正在加载题目..." />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Alert message="加载失败" description={error} type="error" showIcon
          action={<Button type="primary" onClick={fetchData}>重试</Button>}
          style={{ maxWidth: 500 }}
        />
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🤔</div>
          <p className="text-2xl">该知识点暂无题目</p>
          <button onClick={() => navigate('/student')}
            className="mt-8 bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
            ← 返回首页
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // 渲染：结束统计
  // ============================================================

  if (phase === 'finished') {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-7xl mb-4">{accuracy === 100 ? '🎉' : '💪'}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">刷题完成！</h2>
            <p className="text-gray-500">{kp?.kp_name}</p>
            {reviewMode && (
              <p className="text-amber-600 text-sm mt-1 font-medium">
                📖 复习模式 — 已全部答过，下次会出不同题
              </p>
            )}

            <div className="grid grid-cols-3 gap-4 mb-8 mt-8">
              <div className="bg-blue-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-blue-600">{formatTime(elapsed)}</div>
                <div className="text-xs text-gray-500 mt-1">用时</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
                <div className="text-xs text-gray-500 mt-1">正确率</div>
              </div>
              <div className={`rounded-2xl p-4 ${accuracy >= 80 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <div className="text-3xl font-bold" style={{ color: accuracy >= 80 ? '#d97706' : '#dc2626' }}>
                  {wrongCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">错题数</div>
              </div>
            </div>

            <div className="text-left mb-8">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>✅ 正确 {correctCount} 题</span>
                <span>❌ 错误 {wrongCount} 题</span>
                <span>⬜ 未答 {unansweredCount} 题</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                {correctCount > 0 && (
                  <div className="h-full bg-green-400 transition-all duration-500"
                    style={{ width: `${(correctCount / questions.length) * 100}%` }} />
                )}
                {wrongCount > 0 && (
                  <div className="h-full bg-red-400 transition-all duration-500"
                    style={{ width: `${(wrongCount / questions.length) * 100}%` }} />
                )}
              </div>
            </div>

            <div className="text-left mb-8">
              <p className="font-semibold text-gray-700 mb-3">📋 答题详情</p>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {answers.map((a, idx) => (
                  <button key={idx} onClick={() => jumpTo(idx)}
                    className={`p-3 rounded-xl text-center transition-all hover:scale-110 ${
                      a === null || !a.answered ? 'bg-gray-100 text-gray-500' :
                      a.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    <div className="text-sm font-bold">{idx + 1}</div>
                    <div className="text-xs">{!a?.answered ? '⬜' : a.isCorrect ? '✅' : '❌'}</div>
                  </button>
                ))}
              </div>
            </div>

            {wrongCount > 0 && (
              <div className="text-left mb-8">
                <p className="font-semibold text-gray-700 mb-3">📕 错题回顾</p>
                {answers.map((a, idx) => {
                  if (!a || !a.answered || a.isCorrect) return null
                  const q = questions[idx]
                  return (
                    <div key={idx} className="border border-red-100 rounded-xl p-4 mb-3">
                      <p className="text-sm font-bold text-red-600 mb-1">第 {idx + 1} 题</p>
                      <p className="text-gray-800 text-sm mb-2">{q.question_text}</p>
                      <p className="text-green-700 text-xs">✅ {q.correct_answer}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {learningMethod && (
              <FinishedMethodCard learningMethod={learningMethod} />
            )}

            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/student')}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                ← 返回首页
              </button>
              <button onClick={() => navigate('/student/wrong')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold hover:shadow-lg transition-all">
                📕 查看错题本
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // 渲染：刷题主界面
  // ============================================================

  const q = currentQ
  if (!q) return null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {kp?.kp_name || '刷题练习'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                第 {currentIndex + 1} 题 / 共 {questions.length} 题
                <span className="ml-4">⏱ {formatTime(elapsed)}</span>
                {adaptiveMode && suggestedDiff && (
                  <span className="ml-4 text-green-600 font-medium">🤖 建议难度 {suggestedDiff}</span>
                )}
                {reviewMode && (
                  <span className="ml-4 text-amber-600 font-medium">📖 复习模式 — 已全部答过，再来一轮</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggleFav(q.q_id)}
                className={`px-3 py-2 rounded-xl text-xl transition-all hover:scale-110 ${
                  isFav ? 'bg-amber-100' : 'bg-gray-100 hover:bg-amber-50'
                }`} title={isFav ? '取消收藏' : '收藏本题'}>
                {isFav ? '⭐' : '☆'}
              </button>
              <button onClick={toggleMode}
                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  adaptiveMode ? 'bg-green-100 text-green-700 ring-2 ring-green-300' : 'bg-gray-100 text-gray-500'
                }`} title={adaptiveMode ? '自适应：根据你的水平自动选题' : '切换为自适应模式'}>
                🤖 {adaptiveMode ? '自适应' : '普通'}
              </button>
              <button onClick={toggleCard}
                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  showCard ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-indigo-50'
                }`}>
                📋 答题卡
              </button>
              <span className={`px-3 py-2 rounded-full text-sm font-bold ${
                q.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                q.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>{q.difficulty}</span>
            </div>
          </div>

          {/* ── 答题卡面板 ── */}
          {showCard && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-600">📋 答题卡</span>
                <span className="text-xs text-gray-400">
                  ✅ {correctCount}  ❌ {wrongCount}  ⬜ {unansweredCount}
                </span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {questions.map((_, idx) => (
                  <button key={idx} onClick={() => jumpTo(idx)}
                    className={`p-2 rounded-xl text-center transition-all hover:scale-110 ${
                      idx === currentIndex ? 'ring-2 ring-indigo-400' : ''
                    } ${
                      answers[idx] === null || !answers[idx]?.answered
                        ? 'bg-gray-200 text-gray-500'
                        : answers[idx].isCorrect
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                    <div className="text-sm font-bold">{idx + 1}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Progress ── */}
          <Progress
            percent={Math.round(((currentIndex + 1) / questions.length) * 100)}
            status="active"
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
            className="mb-6"
          />

          {/* ── 题干 ── */}
          <div className="mb-8">
            <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-line">
              {q.question_text}
            </p>
          </div>

          {/* ── 选项 / 填空 ── */}
          {q.options && q.options.length > 0 ? (
            <div className="space-y-4 mb-8">
              {q.options.map((opt) => {
                let btnClass = 'w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 '
                const isChecking = phase === 'checking'
                if (!isChecking) {
                  btnClass += 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                } else if (opt.is_correct) {
                  btnClass += 'border-green-500 bg-green-50'
                } else if (selectedAnswer === opt) {
                  btnClass += 'border-red-500 bg-red-50'
                } else {
                  btnClass += 'border-gray-200 opacity-50'
                }
                return (
                  <button key={opt.label} onClick={() => handleAnswer(opt)}
                    className={btnClass} disabled={isChecking}>
                    <span className="font-bold mr-3">{opt.label}.</span>
                    {opt.content}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="mb-8">
              <textarea
                className="w-full p-4 border-2 border-gray-300 rounded-2xl focus:border-indigo-500 focus:outline-none"
                rows={4} placeholder="请输入你的答案..."
                value={textAnswer}
                onChange={e => setTextAnswer(e.target.value)}
                disabled={phase === 'checking'}
              />
              {phase !== 'checking' && (
                <button onClick={handleTextSubmit} disabled={!textAnswer.trim()}
                  className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  确认提交
                </button>
              )}
            </div>
          )}

          {/* ── 解析 ── */}
          {phase === 'checking' && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selectedAnswer?.is_correct ? '✅' : '❌'}</span>
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

          {/* ── 操作按钮 ── */}
          <div className="flex justify-between">
            <button onClick={() => navigate('/student')}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
              ← 返回
            </button>
            {phase === 'checking' && currentIndex < questions.length - 1 && (
              <button onClick={nextQuestion}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                下一题 →
              </button>
            )}
            {phase === 'checking' && currentIndex === questions.length - 1 && (
              <button onClick={nextQuestion}
                className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                📊 查看结果
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// 子组件
// ============================================================

function FinishedMethodCard({ learningMethod }) {
  return (
    <div className="text-left mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6">
      <p className="font-semibold text-gray-700 mb-3">🧠 {learningMethod.kp_name} · 学习方法</p>
      {learningMethod.memory_trick?.content && (
        <div className="bg-white rounded-xl p-3 mb-4">
          <span className="text-xs text-indigo-500 font-bold">💡 记忆口诀</span>
          <p className="text-sm text-gray-700 mt-1">{learningMethod.memory_trick.content}</p>
        </div>
      )}
      {learningMethod.learning_steps && learningMethod.learning_steps.length > 0 && (
        <div>
          <span className="text-xs text-gray-500 font-bold">📝 学习步骤</span>
          <div className="mt-2 space-y-2">
            {learningMethod.learning_steps.map((s, i) => (
              <div key={i} className="flex gap-3 bg-white rounded-xl p-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {s.step || i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{s.action}</p>
                  {s.duration_min && (
                    <p className="text-xs text-gray-400 mt-0.5">约 {s.duration_min} 分钟</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
