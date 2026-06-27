import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminQuestions from '../../pages/admin/AdminQuestions'

const mockQuestions = [
  {
    q_id: 'q1',
    kp_id: 'kp1',
    question_type: 'choice',
    difficulty: '★',
    question_text: '什么是三角形？',
    score: 5,
  },
]

const mockKps = [
  { kp_id: 'kp1', kp_name: '三角形的概念' },
]

function mockFetchResponse(url) {
  if (url.includes('/api/knowledge-points')) {
    return mockKps
  }
  if (url.includes('/api/questions')) {
    return mockQuestions
  }
  return []
}

describe('AdminQuestions 页面测试', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
    fetch.mockImplementation((url) =>
      Promise.resolve({ ok: true, json: () => mockFetchResponse(url) })
    )
  })

  test('1. 加载状态时显示加载指示器', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))

    render(<AdminQuestions />)
    expect(screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示题目表格', async () => {
    render(<AdminQuestions />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
  })

  test('3. 可以按知识点筛选', async () => {
    const user = userEvent.setup()

    render(<AdminQuestions />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })

    // 应该有知识点筛选下拉框
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
  })

  test('4. 点击编辑按钮显示编辑弹窗', async () => {
    const user = userEvent.setup()
    render(<AdminQuestions />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })

    const editButton = screen.getByText(/编辑/i)
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/编辑题目/i)).toBeInTheDocument()
    })
  })

  test('5. API 调用失败时报错', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API 连接失败')))

    render(<AdminQuestions />)

    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
