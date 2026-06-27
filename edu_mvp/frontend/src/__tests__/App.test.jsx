/**
 * App.jsx 测试
 * 覆盖：未登录显示登录页、已登录显示导航、登出、角色路由保护、token 失效清理
 */
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// mock api
jest.mock('../api', () => ({
  fetchMe: jest.fn(),
  logoutUser: jest.fn(),
  getCurrentUser: jest.fn(() => null),
  isLoggedIn: jest.fn(() => false),
}))

const { fetchMe, logoutUser, getCurrentUser, isLoggedIn } = require('../api')

// Navbar mock 避免依赖子组件
jest.mock('../components/Navbar', () => {
  return function Navbar({ user, onLogout }) {
    return (
      <nav data-testid="navbar">
        <span>{user?.name}</span>
        <button onClick={onLogout}>退出登录</button>
      </nav>
    )
  }
})

// StudentHome mock
jest.mock('../pages/StudentHome', () => {
  return function StudentHome() {
    return <div data-testid="student-home">学生首页</div>
  }
})

// Login mock
jest.mock('../pages/Login', () => {
  return function Login({ onLogin }) {
    return (
      <div data-testid="login-page">
        登录页
        <button onClick={() => onLogin({ user_id: 'u1', name: '测试', role: 'student' })}>
          模拟登录
        </button>
      </div>
    )
  }
})

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/student']}>
      <App />
    </MemoryRouter>
  )
}

describe('App 主应用组件', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    fetchMe.mockReset()
    logoutUser.mockReset()
    getCurrentUser.mockReturnValue(null)
    isLoggedIn.mockReturnValue(false)
  })

  test('1. 未登录时显示登录页', async () => {
    isLoggedIn.mockReturnValue(false)
    renderApp()
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  test('2. 已登录且 fetchMe 成功时显示主内容', async () => {
    isLoggedIn.mockReturnValue(true)
    getCurrentUser.mockReturnValue({ user_id: 'u1', name: '强子', role: 'student' })
    fetchMe.mockResolvedValue({ user_id: 'u1', name: '强子', role: 'student' })

    renderApp()
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
    })
  })

  test('3. token 失效时清理 localStorage 并显示登录页', async () => {
    isLoggedIn.mockReturnValue(true)
    localStorage.setItem('auth_token', 'expired_token')
    localStorage.setItem('auth_user', JSON.stringify({ user_id: 'u1' }))
    fetchMe.mockResolvedValue(null) // token 失效

    renderApp()
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_user')).toBeNull()
    })
  })

  test('4. 登出后清除用户状态并显示登录页', async () => {
    isLoggedIn.mockReturnValue(true)
    getCurrentUser.mockReturnValue({ user_id: 'u1', name: '强子', role: 'student' })
    fetchMe.mockResolvedValue({ user_id: 'u1', name: '强子', role: 'student' })
    logoutUser.mockResolvedValue({})

    renderApp()
    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
    })

    await act(async () => {
      await userEvent.click(screen.getByText('退出登录'))
    })

    await waitFor(() => {
      expect(logoutUser).toHaveBeenCalled()
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  test('5. Login 组件 onLogin 回调设置用户', async () => {
    isLoggedIn.mockReturnValue(false)
    renderApp()

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    await act(async () => {
      await userEvent.click(screen.getByText('模拟登录'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('navbar')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
    })
  })

  test('6. 无 token 时跳过 fetchMe 直接显示登录页', async () => {
    isLoggedIn.mockReturnValue(false)
    renderApp()

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
    expect(fetchMe).not.toHaveBeenCalled()
  })
})
