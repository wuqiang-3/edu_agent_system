import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentHome from '../pages/StudentHome'

// 根据 URL 返回不同 mock 响应
function mockFetchResponse(url) {
  if (url.includes('/api/chapters')) {
    return Promise.resolve([
      { chapter_id: 'ch1', chapter_title: '第十一章 三角形' },
    ])
  }
  if (url.includes('/api/knowledge-points')) {
    return [{ kp_id: 'kp1', kp_name: '三角形的概念', chapter_id: 'ch1' }]
  }
  if (url.includes('/api/analysis/')) return []
  if (url.includes('/api/wrong-questions')) return []
  if (url.includes('/api/scores/')) return { score: 0, streak: 0 }
  if (url.includes('/api/classes')) return []
  return []
}

describe('StudentHome 页面测试', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
    fetch.mockImplementation((url) =>
      Promise.resolve({ ok: true, json: () => mockFetchResponse(url) })
    )
  })

  test('1. 加载状态时显示加载指示器', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {})) // 永不 resolve

    render(<StudentHome />)
    expect(screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示章节卡片', async () => {
    render(<StudentHome />)

    await waitFor(() => {
      expect(screen.getByText('第十一章 三角形')).toBeInTheDocument()
    })
  })

  test('3. API 调用失败时报错', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API 连接失败')))

    render(<StudentHome />)

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
  })

  test('4. 点击重试按钮重新加载', async () => {
    const user = userEvent.setup()

    // 第一次失败
    fetch.mockImplementation(() => Promise.reject(new Error('API 连接失败')))

    render(<StudentHome />)

    // 等待错误出现（antd v6 Alert 渲染 "重 试" 含空格）
    await waitFor(() => {
      const btns = screen.getAllByRole('button')
      const retryBtn = btns.find(b => b.textContent.includes('重'))
      expect(retryBtn).toBeTruthy()
    })

    // 恢复 mock
    fetch.mockReset()
    fetch.mockImplementation((url) =>
      Promise.resolve({ ok: true, json: () => mockFetchResponse(url) })
    )

    // 点击重试按钮
    const btns2 = screen.getAllByRole('button')
    const retryBtn2 = btns2.find(b => b.textContent.includes('重'))
    if (retryBtn2) await user.click(retryBtn2)

    // 重试后应该看到章节
    await waitFor(() => {
      expect(screen.getByText('第十一章 三角形')).toBeInTheDocument()
    })
  })
})
