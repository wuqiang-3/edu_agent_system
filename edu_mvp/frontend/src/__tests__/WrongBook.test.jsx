import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WrongBook from '../pages/WrongBook'

const mockQuestions = [
  {
    q_id: 'q1',
    kp_id: 'kp1',
    kp_name: '三角形的概念',
    question_text: '什么是三角形？',
    correct_answer: '三个角的图形',
    analysis: '三角形有三个角',
  },
]

describe('WrongBook 页面测试', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
  })

  test('1. 无错题时显示空状态', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/api/wrong-questions')) {
        return Promise.resolve({ ok: true, json: () => [] })
      }
      return Promise.resolve({ ok: true, json: () => mockQuestions })
    })

    render(<WrongBook />)

    await waitFor(() => {
      expect(screen.getByText(/暂无错题/i)).toBeInTheDocument()
    })
  })

  test('2. 有错题时加载并显示', async () => {
    let callCount = 0
    fetch.mockImplementation((url) => {
      if (url.includes('/api/wrong-questions')) {
        callCount++
        // 第一次调用返回错题 ID 列表
        return Promise.resolve({ ok: true, json: () => ['q1'] })
      }
      return Promise.resolve({ ok: true, json: () => mockQuestions })
    })

    render(<WrongBook />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
  })

  test('3. 点击清空错题', async () => {
    const user = userEvent.setup()
    fetch.mockImplementation((url) => {
      if (url.includes('/api/wrong-questions')) {
        return Promise.resolve({ ok: true, json: () => ['q1'] })
      }
      return Promise.resolve({ ok: true, json: () => mockQuestions })
    })

    render(<WrongBook />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })

    // 清空 API 也要 mock
    fetch.mockImplementation((url, options) => {
      if (options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => ({ status: 'ok' }) })
      }
      return Promise.resolve({ ok: true, json: () => [] })
    })

    const clearButton = screen.getByText(/清空错题/i)
    await user.click(clearButton)

    await waitFor(() => {
      expect(screen.getByText(/暂无错题/i)).toBeInTheDocument()
    })
  })

  test('4. API 调用失败时报错', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API 连接失败')))

    render(<WrongBook />)

    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
