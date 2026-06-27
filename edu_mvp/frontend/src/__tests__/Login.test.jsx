import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../pages/Login'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

/** 找到提交按钮（第二个 button，第一个是 Tab） */
function getSubmitBtn() {
  const btns = screen.getAllByRole('button')
  return btns.find(b => b.classList.contains('bg-gradient-to-r'))
}

describe('Login 页面测试', () => {
  const mockOnLogin = jest.fn()

  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
    mockOnLogin.mockClear()
    mockNavigate.mockClear()
  })

  test('1. 渲染登录和注册 Tab', () => {
    render(<Login onLogin={mockOnLogin} />)
    expect(screen.getByText('登录')).toBeInTheDocument()
    expect(screen.getByText('注册')).toBeInTheDocument()
  })

  test('2. 切换到注册 Tab 显示注册表单', async () => {
    const user = userEvent.setup()
    render(<Login onLogin={mockOnLogin} />)

    await user.click(screen.getByText('注册'))

    await waitFor(() => {
      expect(screen.getByText('昵称')).toBeInTheDocument()
    })
  })

  test('3. 注册成功后自动登录', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok_test', user: { user_id: 'u1', role: 'student' } }),
    })

    render(<Login onLogin={mockOnLogin} />)

    await user.click(screen.getByText('注册'))
    await user.type(screen.getByPlaceholderText('请输入用户名'), 'admin')
    await user.type(screen.getByPlaceholderText('请输入密码'), 'admin123')

    const submitBtn = getSubmitBtn()
    expect(submitBtn).toBeTruthy()
    if (submitBtn) await user.click(submitBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/student')
      expect(localStorage.getItem('auth_token')).toBe('tok_test')
    })
  })

  test('4. 登录失败显示错误信息', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: '用户名或密码错误' }),
    })

    render(<Login onLogin={mockOnLogin} />)

    await user.type(screen.getByPlaceholderText('请输入用户名'), 'wrong')
    await user.type(screen.getByPlaceholderText('请输入密码'), 'wrong')

    const submitBtn = getSubmitBtn()
    if (submitBtn) await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })
  })

  test('5. 学生登录后跳转到 /student', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok_test', user: { user_id: 'u2', role: 'student' } }),
    })

    render(<Login onLogin={mockOnLogin} />)

    await user.type(screen.getByPlaceholderText('请输入用户名'), 'student')
    await user.type(screen.getByPlaceholderText('请输入密码'), 'pass')

    const submitBtn = getSubmitBtn()
    if (submitBtn) await user.click(submitBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/student')
    })
  })

  test('6. 网络错误时显示提示', async () => {
    const user = userEvent.setup()
    fetch.mockRejectedValue(new Error('Network error'))

    render(<Login onLogin={mockOnLogin} />)

    await user.type(screen.getByPlaceholderText('请输入用户名'), 'test')
    await user.type(screen.getByPlaceholderText('请输入密码'), 'test')

    const submitBtn = getSubmitBtn()
    if (submitBtn) await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/网络错误/i)).toBeInTheDocument()
    })
  })
})
