import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import StudentHome from './pages/StudentHome'
import Quiz from './pages/Quiz'
import WrongBook from './pages/WrongBook'
import Leaderboard from './pages/Leaderboard'
import Exam from './pages/Exam'
import LearningMethods from './pages/LearningMethods'
import Login from './pages/Login'
import AdminHome from './pages/admin/AdminHome'
import AdminQuestions from './pages/admin/AdminQuestions'
import Navbar from './components/Navbar'
import { fetchMe, logoutUser, getCurrentUser, isLoggedIn } from './api'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    if (!isLoggedIn()) {
      setChecking(false)
      return
    }
    const u = await fetchMe()
    if (u) {
      setUser(u)
      localStorage.setItem('auth_user', JSON.stringify(u))
    } else {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    setChecking(false)
  }

  const handleLogin = (u) => setUser(u)

  const handleLogout = async () => {
    await logoutUser()
    setUser(null)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Spin size="large" tip="验证登录状态..." />
      </div>
    )
  }

  // 未登录 → 只显示登录页
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Navigate to="/student" replace />} />
        <Route path="/login" element={<Navigate to="/student" replace />} />

        {/* 学生端 */}
        <Route path="/student" element={<StudentHome />} />
        <Route path="/student/quiz/:kpId" element={<Quiz />} />
        <Route path="/student/wrong" element={<WrongBook />} />
        <Route path="/student/leaderboard" element={<Leaderboard />} />
        <Route path="/student/exam" element={<Exam />} />
        <Route path="/student/methods" element={<LearningMethods />} />

        {/* 管理台 */}
        <Route path="/admin" element={
          user.role === 'admin' ? <AdminHome /> : <Navigate to="/student" replace />
        } />
        <Route path="/admin/questions" element={
          user.role === 'admin' ? <AdminQuestions /> : <Navigate to="/student" replace />
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </div>
  )
}

export default App
