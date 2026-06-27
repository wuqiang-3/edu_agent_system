import { useState, useEffect } from 'react'
import { Spin, Alert, Button } from 'antd'
import { fetchLeaderboard, fetchBadges, getCurrentUser } from '../api'

export default function Leaderboard() {
  const [board, setBoard] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const user = getCurrentUser()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [b, bg] = await Promise.all([fetchLeaderboard(), fetchBadges()])
      setBoard(b.leaderboard || [])
      setBadges(bg.badges || [])
    } catch (err) {
      setError('加载失败，请确保后端已启动')
    } finally { setLoading(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}><Spin size="large" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center p-8" style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
    <Alert message={error} type="error" action={<Button onClick={fetchData}>重试</Button>} /></div>

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🏆 排行榜</h2>

          {/* 勋章图鉴 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm font-semibold text-gray-600 mb-3">🎖 勋章图鉴</p>
            <div className="flex gap-3 flex-wrap">
              {badges.map(b => (
                <div key={b.id} className="bg-white rounded-xl px-3 py-2 text-center shadow-sm">
                  <div className="text-xl">{b.id === '新手' ? '🌱' : b.id === '达人' ? '💪' : b.id === '学霸' ? '🧠' : b.id === '全能' ? '👑' : b.id === '连胜' ? '🔥' : '⚡'}</div>
                  <p className="text-xs font-bold text-gray-700">{b.name}</p>
                  <p className="text-[10px] text-gray-400">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 排行列表 */}
          {board.length === 0 ? (
            <div className="text-center py-8 text-gray-400">暂无数据，快去刷题吧！</div>
          ) : (
            <div className="space-y-3">
              {board.map((p, i) => {
                const isMe = p.student_id === user?.user_id
                return (
                  <div key={p.student_id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isMe ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-gray-50 hover:bg-gray-100'
                    }`}>
                    <div className="w-10 text-center text-xl font-bold">
                      {i < 3 ? medals[i] : `#${p.rank}`}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{p.name} {isMe && '(我)'}</p>
                      <div className="flex gap-2 mt-1">
                        {p.badges?.map(b => (
                          <span key={b} className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{b}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-indigo-600">{p.points}</p>
                      <p className="text-xs text-gray-400">
                        {p.streak > 1 && `🔥 ${p.streak}连击`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
