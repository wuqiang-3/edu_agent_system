import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../api'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = tab === 'login'
        ? await loginUser(form.username, form.password)
        : await registerUser(form.username, form.password, form.name)

      if (res.token) {
        localStorage.setItem('auth_token', res.token)
        localStorage.setItem('auth_user', JSON.stringify(res.user))
        onLogin?.(res.user)
        navigate(res.user.role === 'admin' ? '/admin' : '/student')
      } else {
        // 兼容三种错误格式：{error:"msg"} / {error:{message:"msg"}} / {detail:"msg"}
        const msg = typeof res.error === 'string' ? res.error
          : res.error?.message || res.detail || '操作失败'
        setError(msg)
      }
    } catch (err) {
      setError('网络错误，请检查后端是否启动')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold text-gray-800">学习系统</h1>
        </div>

        {/* 切换标签 */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === 'login' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'
            }`}>登录</button>
          <button onClick={() => setTab('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === 'register' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500'
            }`}>注册</button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">昵称</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="请输入昵称" />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名</label>
            <input type="text" value={form.username} required
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="请输入用户名" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input type="password" value={form.password} required minLength={8}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder={tab === 'register' ? '至少8位，含大小写字母+数字' : '请输入密码'} />
            {tab === 'register' && (
              <p className="text-xs text-gray-400 mt-1">至少 8 位，需包含大写字母、小写字母和数字</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 text-center">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50">
            {loading ? '处理中...' : tab === 'login' ? '登  录' : '注  册'}
          </button>
        </form>
      </div>
    </div>
  )
}
