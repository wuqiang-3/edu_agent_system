import { Routes, Route, Navigate } from 'react-router-dom'
import StudentHome from './pages/StudentHome'
import Quiz from './pages/Quiz'
import WrongBook from './pages/WrongBook'
import AdminHome from './pages/admin/AdminHome'
import AdminQuestions from './pages/admin/AdminQuestions'
import Navbar from './components/Navbar'

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        {/* 学生端 */}
        <Route path="/" element={<Navigate to="/student" replace />} />
        <Route path="/student" element={<StudentHome />} />
        <Route path="/student/quiz/:kpId" element={<Quiz />} />
        <Route path="/student/wrong" element={<WrongBook />} />

        {/* 管理台 */}
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/questions" element={<AdminQuestions />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </div>
  )
}

export default App
