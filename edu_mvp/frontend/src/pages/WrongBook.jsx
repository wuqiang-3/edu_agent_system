import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button, Empty } from 'antd'
import { fetchWrongIds, fetchQuestions, clearWrongQuestions, removeWrongQuestion } from '../api'

export default function WrongBook() {
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWrongQuestions()
  }, [])

  async function loadWrongQuestions() {
    try {
      setLoading(true)
      // 1. 从后端 API 获取错题 ID 列表
      const ids = await fetchWrongIds()
      if (ids.length === 0) {
        setWrongQuestions([])
        setLoading(false)
        return
      }

      // 2. 获取所有题目，过滤出错题
      const allQuestions = await fetchQuestions()
      const qs = allQuestions.filter(q => ids.includes(q.q_id))
      setWrongQuestions(qs)
      setError(null)
    } catch (err) {
      setError('无法加载错题，请确保后端已启动（运行 bash start_backend.sh）')
      console.error('API 连接失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearWrong = async () => {
    try {
      await clearWrongQuestions()
      setWrongQuestions([])
    } catch (err) {
      console.error('清空错题失败:', err)
    }
  }

  const removeOne = async (qId) => {
    try {
      await removeWrongQuestion(qId)
      setWrongQuestions(prev => prev.filter(q => q.q_id !== qId))
    } catch (err) {
      console.error('删除错题失败:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="正在加载错题..." />
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
            <Button type="primary" onClick={loadWrongQuestions}>
              重试
            </Button>
          }
          style={{ maxWidth: 500 }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              📕 我的错题本
            </h2>
            <div className="flex gap-4">
              <span className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-bold">
                {wrongQuestions.length} 道题
              </span>
              {wrongQuestions.length > 0 && (
                <button
                  onClick={clearWrong}
                  className="text-red-500 hover:text-red-700 text-sm underline"
                >
                  清空错题
                </button>
              )}
            </div>
          </div>

      {wrongQuestions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Empty description="暂无错题！继续保持！" />
          <Link
            to="/student"
            className="inline-block mt-8 bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            返回首页 →
          </Link>
        </div>
      ) : (
            <div className="space-y-6">
              {wrongQuestions.map((q, idx) => (
                <div key={q.q_id} className="border-2 border-red-100 rounded-2xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                      第 {idx + 1} 题
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">{q.kp_name}</span>
                      <button
                        onClick={() => removeOne(q.q_id)}
                        className="text-red-400 hover:text-red-600 text-xs underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 mb-4 leading-relaxed">{q.question_text}</p>
                  <div className="bg-green-50 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-green-800 mb-2">✅ 正确答案：</p>
                    <p className="text-green-700">{q.correct_answer}</p>
                  </div>
                  {q.analysis && (
                    <div className="bg-blue-50 rounded-xl p-4 text-sm mt-4">
                      <p className="font-semibold text-blue-800 mb-2">💡 解析：</p>
                      <p className="text-blue-700">{q.analysis}</p>
                    </div>
                  )}
                  {/* 行动按钮 */}
                  <div className="flex gap-3 mt-4">
                    <Link to={`/student/quiz/${q.kp_id}`}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all">
                      🔄 再做一次
                    </Link>
                    <Link to={`/student/quiz/${q.kp_id}`}
                      className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">
                      🎯 去练习该知识点
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
