import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '../components/Navbar'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: '/student' }),
  useNavigate: () => mockNavigate,
}))

describe('Navbar 组件测试', () => {
  const mockOnLogout = jest.fn()

  beforeEach(() => {
    mockOnLogout.mockClear()
    mockNavigate.mockClear()
  })

  test('1. 显示系统标题和导航链接', () => {
    render(<Navbar user={{ username: '测试', role: 'student' }} onLogout={mockOnLogout} />)

    expect(screen.getByText(/初中学习系统/)).toBeInTheDocument()
    expect(screen.getByText(/学生端/)).toBeInTheDocument()
    expect(screen.getByText(/退出/)).toBeInTheDocument()
  })

  test('2. 管理员角色显示管理台链接', () => {
    render(<Navbar user={{ name: '管理员', role: 'admin' }} onLogout={mockOnLogout} />)

    expect(screen.getByText(/管理台/)).toBeInTheDocument()
  })

  test('3. 非管理员不显示管理台链接', () => {
    render(<Navbar user={{ name: '学生', role: 'student' }} onLogout={mockOnLogout} />)

    expect(screen.queryByText(/管理台/)).toBeNull()
  })

  test('4. 显示用户名和角色', () => {
    render(<Navbar user={{ name: '张三', role: 'student' }} onLogout={mockOnLogout} />)

    expect(screen.getByText(/张三/)).toBeInTheDocument()
    // "学生端"链接和"(学生)"角色标签都包含"学生"
    const studentTexts = screen.getAllByText(/学生/)
    expect(studentTexts.length).toBeGreaterThanOrEqual(2)
  })

  test('5. 点击退出按钮调用 onLogout 并导航', async () => {
    const user = userEvent.setup()
    render(<Navbar user={{ username: 'test', role: 'student' }} onLogout={mockOnLogout} />)

    await user.click(screen.getByText('退出'))

    expect(mockOnLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
