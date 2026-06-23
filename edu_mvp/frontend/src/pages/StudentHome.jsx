import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button } from 'antd'

const API_BASE = 'http://localhost:8000'

export default function StudentHome() {
  const [chapters, setChapters] = useState([])
  const [kps, setKps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [chaptersRes, kpsRes] = await Promise.all([
        fetch(`${API_BASE}/api/chapters`),
        fetch(`${API_BASE}/api/knowledge-points`),
      ])
      const chaptersData = await chaptersRes.json()
      const kpsData = await kpsRes.json()
      setChapters(chaptersData)
      setKps(kpsData)
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="正在加载知识点..." />
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

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Hero Section */}
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h1 className="text-5xl font-extrabold mb-4 animate-bounce">
            🚀 开始学习之旅
          </h1>
          <p className="text-xl opacity-90 mb-8">
            陕西省 · 8年级 · 数学（人教版）
          </p>
          <div className="flex justify-center gap-4">
            <span className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-sm">
              📖 {chapters.length} 个章节
            </span>
            <span className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-sm">
              🎯 {kps.length} 个知识点
            </span>
          </div>
        </div>
      </div>

      {/* Chapter Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          📚 选择章节开始学习
        </h2>
        {chapters.length === 0 ? (
          <div className="text-center text-white/80 text-lg py-12">
            暂无章节数据，请先运行 MVP 生成数据
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter, idx) => {
              const chapterKps = kps.filter(kp => kp.chapter_id === chapter.chapter_id)
              const emojis = ['🔢', '📐', '📊', '🎲', '🧮', '📏']
              return (
                <div
                  key={chapter.chapter_id}
                  className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="text-6xl mb-4">{emojis[idx % emojis.length]}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {chapter.chapter_title}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {chapterKps.length} 个知识点
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {chapterKps.map(kp => (
                      <span
                        key={kp.kp_id}
                        className={`text-xs px-3 py-1 rounded-full ${
                          kp.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                          kp.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {kp.kp_name}
                      </span>
                    ))}
                  </div>
                  {chapterKps.length > 0 && (
                    <Link
                      to={`/student/quiz/${chapterKps[0]?.kp_id}`}
                      className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                    >
                      🎯 开始刷题 →
                    </Link>
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
