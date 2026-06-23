import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentHome from '../pages/StudentHome'

// Mock API 响应
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        { chapter_id: 'ch1', chapter_title: '第十一章 三角形' },
      ]),
  })
)

describe('StudentHome 页面测试', () => {
  beforeEach(() => {
    fetch.mockClear()
    localStorage.clear()
  })

  test('1. 加载状态时显示 Spin 组件', () => {
    // Mock 延迟响应
    fetch.mockImplementationOnce(() => new Promise(() => {})) // 永不 resolve
    
    render(<StudentHome />)
    expect(screen.getByRole('status') || screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示章节卡片', async () => {
    render(<StudentHome />)
    
    await waitFor(() => {
      expect(screen.getByText('第十一章 三角形')).toBeInTheDocument()
    })
  })

  test('3. API 调用失败时报错', async () => {
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API 连接失败')))
    
    render(<StudentHome />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })

  test('4. 点击重试按钮重新加载', async () => {
    const user = userEvent.setup()
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API 连接失败')))
    
    render(<StudentHome />)
    
    await waitFor(() => {
      const retryButton = screen.getByText('重试')
      expect(retryButton).toBeInTheDocument()
    })
    
    const retryButton = screen.getByText('重试')
    await user.click(retryButton)
    
    expect(fetch).toHaveBeenCalledTimes(2) // 初始 + 重试
  })
})
