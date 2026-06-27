import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar({ user, onLogout }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAdmin = pathname.startsWith('/admin')

  const handleLogout = () => {
    onLogout?.()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/student" className="text-2xl font-bold text-indigo-600">
              📚 初中学习系统
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/student"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                !isAdmin ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              🎓 学生端
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isAdmin ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}>
                ⚙️ 管理台
              </Link>
            )}
            <span className="text-gray-400 text-sm">|</span>
            <span className="text-sm text-gray-600">
              👤 {user?.name || user?.username}
              <span className="text-xs text-gray-400 ml-1">
                ({user?.role === 'admin' ? '管理员' : user?.role === 'teacher' ? '老师' : '学生'})
              </span>
            </span>
            <button onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium">
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
