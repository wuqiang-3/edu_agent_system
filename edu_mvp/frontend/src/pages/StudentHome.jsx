import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Spin, Alert, Button } from 'antd'
import { fetchChapters, fetchKnowledgePoints, fetchWeakPoints, fetchRecommendations, fetchLearningPath, fetchReviewSchedule, fetchLearningReport, fetchStudentScore, listClasses, joinClass } from '../api'

export default function StudentHome() {
  const [chapters, setChapters] = useState([])
  const [kps, setKps] = useState([])
  const [weakPoints, setWeakPoints] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [learningPath, setLearningPath] = useState(null)
  const [showPathDetail, setShowPathDetail] = useState(false)
  const [reviewSchedule, setReviewSchedule] = useState(null)
  const [learningReport, setLearningReport] = useState(null)
  const [reportPeriod, setReportPeriod] = useState('weekly')
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [score, setScore] = useState(null)
  const [myClasses, setMyClasses] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [joinMsg, setJoinMsg] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { fetchData() }, [reportPeriod])

  async function fetchData() {
    try {
      setLoading(true)
      const [chs, kpsD, wp, rec, lp, rs, lr, sc, cl] = await Promise.all([
        fetchChapters(), fetchKnowledgePoints(),
        fetchWeakPoints(), fetchRecommendations(),
        fetchLearningPath(), fetchReviewSchedule(),
        fetchLearningReport(reportPeriod),
        fetchStudentScore(), listClasses(''),
      ])
      setChapters(chs)
      setKps(kpsD)
      setWeakPoints(wp.weak_points || [])
      setTotalAnalyzed(wp.total_analyzed || 0)
      setRecommendations(rec.recommendations || [])
      setLearningPath(lp)
      setReviewSchedule(rs)
      setLearningReport(lr)
      setScore(sc)
      setMyClasses(cl)
      setError(null)
    } catch (err) {
      setError('无法连接后端 API，请确保后端已启动')
      console.error('API 连接失败:', err)
    } finally { setLoading(false) }
  }

  const weakCount = weakPoints.filter(w => w.status === 'weak').length
  const moderateCount = weakPoints.filter(w => w.status === 'moderate').length
  const strongCount = weakPoints.filter(w => w.status === 'strong').length

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
        <Alert message="加载失败" description={error} type="error" showIcon
          action={<Button type="primary" onClick={fetchData}>重试</Button>}
          style={{ maxWidth: 500 }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Hero Section */}
      <div className="pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-white">
          <h1 className="text-5xl font-extrabold mb-4">
            🚀 开始学习之旅
          </h1>
          <p className="text-xl opacity-90 mb-4">
            陕西省 · 8年级 · 数学（北师大版）
          </p>
          <div className="flex justify-center gap-4">
            <span className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-sm">
              📖 {chapters.length} 个章节
            </span>
            <span className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-sm">
              🎯 {kps.length} 个知识点
            </span>
            {totalAnalyzed > 0 && (
              <span className="bg-white/20 backdrop-blur-md rounded-full px-6 py-2 text-sm">
                📊 已答 {totalAnalyzed} 题
              </span>
            )}
          </div>
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <Link to="/student/exam"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-xl hover:scale-105 transition-all duration-200">
              📝 模拟考试
              <span className="text-sm font-normal opacity-80">· 22题 · 90分钟 · 108分</span>
            </Link>
            <Link to="/student/methods"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-400 to-indigo-500 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-xl hover:scale-105 transition-all duration-200">
              🧠 学习方法
              <span className="text-sm font-normal opacity-80">· 记忆口诀 · 分步学习</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        {/* 积分/班级/排行 */}
        <div className="grid grid-cols-3 gap-4">
          {score && (
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow p-4 flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <p className="text-xs text-gray-500">积分</p>
                <p className="text-xl font-bold text-indigo-600">{score.points || 0}</p>
                {score.badges?.length > 0 && (
                  <p className="text-xs text-gray-400">{score.badges.join(' · ')}</p>
                )}
              </div>
            </div>
          )}
          <Link to="/student/leaderboard"
            className="bg-white/95 backdrop-blur-lg rounded-2xl shadow p-4 flex items-center gap-3 hover:shadow-lg transition-all">
            <div className="text-3xl">📊</div>
            <div>
              <p className="text-xs text-gray-500">排行榜</p>
              <p className="text-sm font-bold text-gray-700">查看排名 →</p>
            </div>
          </Link>
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">🏫</div>
              <div>
                <p className="text-xs text-gray-500">班级</p>
                {myClasses.length > 0 ? (
                  <p className="text-sm font-bold text-gray-700">{myClasses[0].class_name}</p>
                ) : (
                  <button onClick={() => setShowJoin(!showJoin)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline">
                    {showJoin ? '取消' : '+ 加入班级'}
                  </button>
                )}
              </div>
            </div>
            {showJoin && !myClasses.length && (
              <div className="flex gap-2">
                <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
                  placeholder="输入班级码"
                  className="flex-1 border rounded-lg px-2 py-1 text-xs" />
                <button onClick={async () => {
                  const r = await joinClass(joinCode)
                  if (r.status === 'ok') { setJoinMsg('加入成功!'); setShowJoin(false); fetchData() }
                  else setJoinMsg(r.error || '加入失败')
                }}
                  className="px-3 py-1 bg-indigo-500 text-white rounded-lg text-xs">加入</button>
              </div>
            )}
            {joinMsg && <p className="text-xs text-green-600 mt-1">{joinMsg}</p>}
          </div>
        </div>

        {/* 学习分析 */}
        {totalAnalyzed > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 学习分析</h2>

            {/* 掌握度概览 */}
            <div className="flex gap-4 mb-6">
              {[
                { label: '薄弱', count: weakCount, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                { label: '待加强', count: moderateCount, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                { label: '已掌握', count: strongCount, color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={`flex-1 ${s.bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-3xl font-bold ${s.text}`}>{s.count}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* 薄弱知识点列表 */}
            {weakPoints.length > 0 && (
              <div className="mb-6">
                <p className="font-semibold text-gray-700 mb-3">📉 薄弱知识点（建议优先练习）</p>
                <div className="space-y-3">
                  {weakPoints.filter(w => w.status !== 'strong').slice(0, 5).map(wp => (
                    <div key={wp.kp_id} className={`rounded-xl p-4 flex items-center justify-between ${
                      wp.status === 'weak' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{wp.kp_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          答 {wp.total_attempts} 题 · 正确率 {wp.accuracy}% · 平均用时 {wp.avg_time_spent}s
                        </p>
                      </div>
                      <Link to={`/student/quiz/${wp.kp_id}`}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all">
                        去练习 →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 推荐练习 */}
            {recommendations.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-3">🎯 为你推荐</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recommendations.map(q => (
                    <Link key={q.q_id} to={`/student/quiz/${q.kp_id}`}
                      className="flex-shrink-0 w-56 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 hover:shadow-md transition-all">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        q.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                        q.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>{q.difficulty}</span>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{q.question_text}</p>
                      <p className="text-xs text-indigo-500 mt-2 font-medium">开始练习 →</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-right">
              <Link to="/student/wrong"
                className="text-sm text-red-500 hover:text-red-700 underline">
                📕 查看错题本
              </Link>
            </div>
          </div>
        )}

        {/* 学习路径 */}
        {learningPath && learningPath.total_kps > 0 && totalAnalyzed > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🧭 学习路径</h2>

            {/* 掌握度总览 */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>✅ 已掌握 {learningPath.mastered}</span>
                <span>📖 可学习 {learningPath.ready}</span>
                <span>🔒 被锁定 {learningPath.blocked}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                {learningPath.mastered > 0 && (
                  <div className="h-full bg-green-400" style={{ width: `${(learningPath.mastered / learningPath.total_kps) * 100}%` }} />
                )}
                {learningPath.ready > 0 && (
                  <div className="h-full bg-blue-400" style={{ width: `${(learningPath.ready / learningPath.total_kps) * 100}%` }} />
                )}
                {learningPath.blocked > 0 && (
                  <div className="h-full bg-gray-400" style={{ width: `${(learningPath.blocked / learningPath.total_kps) * 100}%` }} />
                )}
              </div>
            </div>

            {/* 下一步推荐 */}
            {learningPath.next_to_study && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-500 font-bold mb-1">👉 推荐下一个</p>
                    <p className="text-xl font-bold text-gray-800">{learningPath.next_to_study.kp_name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      难度 {learningPath.next_to_study.difficulty} · {learningPath.next_to_study.importance}
                    </p>
                  </div>
                  <Link to={`/student/quiz/${learningPath.next_to_study.kp_id}`}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                    开始学习 →
                  </Link>
                </div>
              </div>
            )}

            {/* 展开详情 */}
            <button onClick={() => setShowPathDetail(!showPathDetail)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              {showPathDetail ? '收起详情 ▲' : '查看全部知识点状态 ▼'}
            </button>

            {showPathDetail && learningPath.learning_path && (
              <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                {learningPath.learning_path.map(p => (
                  <div key={p.kp_id}
                    className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                      p.status === 'mastered' ? 'bg-green-50' :
                      p.status === 'ready' ? 'bg-blue-50' :
                      'bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {p.status === 'mastered' ? '✅' : p.status === 'ready' ? '📖' : '🔒'}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{p.kp_name}</p>
                        {p.prereq_blocked.length > 0 && (
                          <p className="text-xs text-gray-400">需先学：{p.prereq_blocked.join('、')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.accuracy !== null && (
                        <span className={`text-xs font-bold ${p.accuracy >= 80 ? 'text-green-600' : p.accuracy >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {p.accuracy}%
                        </span>
                      )}
                      {p.status === 'ready' && (
                        <Link to={`/student/quiz/${p.kp_id}`}
                          className="text-indigo-500 hover:text-indigo-700 text-xs font-medium">
                          去练 →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 复习提醒 */}
        {reviewSchedule && reviewSchedule.due_count > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🔔 复习提醒</h2>
            <p className="text-gray-500 text-sm mb-4">
              基于艾宾浩斯遗忘曲线，你有 <span className="font-bold text-red-600">{reviewSchedule.due_count}</span> 个知识点需要复习
            </p>
            <div className="space-y-3">
              {reviewSchedule.reviews.slice(0, 8).map((r, i) => (
                <div key={`${r.kp_id}-${i}`}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    r.overdue_hours > 48 ? 'bg-red-50 border border-red-200' :
                    r.overdue_hours > 24 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {r.overdue_hours > 48 ? '🔴' : r.overdue_hours > 24 ? '🟡' : '🔵'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{r.kp_name}</p>
                      <p className="text-xs text-gray-500">{r.review_label} · 已过期 {r.overdue_hours} 小时</p>
                    </div>
                  </div>
                  <Link to={`/student/quiz/${r.kp_id}`}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all">
                    去复习 →
                  </Link>
                </div>
              ))}
              {reviewSchedule.reviews.length > 8 && (
                <p className="text-center text-xs text-gray-400">还有 {reviewSchedule.reviews.length - 8} 个待复习...</p>
              )}
            </div>
          </div>
        )}

        {/* 学习报告 */}
        {learningReport && learningReport.total_questions > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📊 学习报告</h2>
              <div className="flex gap-2">
                <button onClick={() => setReportPeriod('weekly')}
                  className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                    reportPeriod === 'weekly' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>周报</button>
                <button onClick={() => setReportPeriod('monthly')}
                  className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
                    reportPeriod === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>月报</button>
              </div>
            </div>

            {/* 核心指标 */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: '答题数', value: learningReport.total_questions, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: '正确率', value: `${learningReport.accuracy}%`, color: 'text-green-600', bg: 'bg-green-50' },
                { label: '学习时长', value: `${learningReport.total_time_min}分`, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: '日均', value: `${learningReport.daily_avg}题`, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* 进步 / 退步 */}
            <div className="grid grid-cols-2 gap-4">
              {learningReport.improved_kps?.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-green-700 mb-2">📈 进步知识点</p>
                  {learningReport.improved_kps.map(kp => (
                    <div key={kp.kp_id} className="flex justify-between text-xs text-gray-600 py-1">
                      <span>{kp.kp_name}</span>
                      <span className="text-green-600">{kp.prev}% → {kp.current}%</span>
                    </div>
                  ))}
                </div>
              )}
              {learningReport.declined_kps?.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-700 mb-2">📉 退步知识点</p>
                  {learningReport.declined_kps.map(kp => (
                    <div key={kp.kp_id} className="flex justify-between text-xs text-gray-600 py-1">
                      <span>{kp.kp_name}</span>
                      <span className="text-red-600">{kp.prev}% → {kp.current}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 章节卡片 */}
        <div>
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
                // 该章节的薄弱分析
                const chWeak = weakPoints.filter(w =>
                  chapterKps.some(k => k.kp_id === w.kp_id) && w.status === 'weak'
                ).length
                const emojis = ['🔢', '📐', '📊', '🎲', '🧮', '📏', '📎', '🔺']
                return (
                  <div key={chapter.chapter_id}
                    className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300">
                    <div className="text-6xl mb-4">{emojis[idx % emojis.length]}</div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {chapter.chapter_title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                      {chapterKps.length} 个知识点
                      {chWeak > 0 && (
                        <span className="ml-2 text-red-500 font-bold">⚠ {chWeak} 个薄弱</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {chapterKps.slice(0, 6).map(kp => (
                        <Link key={kp.kp_id} to={`/student/quiz/${kp.kp_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs px-3 py-1 rounded-full hover:ring-2 hover:ring-indigo-300 transition-all ${
                            kp.difficulty === '★★★' ? 'bg-red-100 text-red-700' :
                            kp.difficulty === '★★' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {kp.kp_name}
                        </Link>
                      ))}
                      {chapterKps.length > 6 && (
                        <span className="text-xs text-gray-400 px-2 py-1">+{chapterKps.length - 6}</span>
                      )}
                    </div>
                    {chapterKps.length > 0 && (
                      <Link to={`/student/quiz/${chapterKps[0]?.kp_id}`}
                        className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200">
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
    </div>
  )
}
