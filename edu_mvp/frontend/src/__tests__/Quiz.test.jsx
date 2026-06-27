import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Quiz from '../pages/Quiz'

// Mock react-router-dom 的 useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ kpId: 'kp1' }),
  useNavigate: () => jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

const mockQuestions = [
  {
    q_id: 'q1',
    kp_id: 'kp1',
    question_text: '什么是三角形？',
    options: [
      { label: 'A', content: '三个角', is_correct: true },
      { label: 'B', content: '两个角', is_correct: false },
    ],
    difficulty: '★',
    score: 5,
  },
]

function mockFetchResponse(url) {
  if (url.includes('/api/knowledge-points')) {
    return [{ kp_id: 'kp1', kp_name: '三角形的概念' }]
  }
  if (url.includes('/api/favorites')) {
    return []
  }
  if (url.includes('/api/adaptive-questions')) {
    return { questions: mockQuestions, suggested_difficulty: '★', diff_stats: {} }
  }
  return []
}

describe('Quiz 页面测试', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
    fetch.mockImplementation((url) =>
      Promise.resolve({ ok: true, json: () => mockFetchResponse(url) })
    )
  })

  test('1. 加载状态时显示加载指示器', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))

    render(<Quiz />)
    expect(screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示题目', async () => {
    render(<Quiz />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
  })

  test('3. 点击选项后显示结果', async () => {
    const user = userEvent.setup()
    render(<Quiz />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })

    const optionA = screen.getByText('三个角')
    await user.click(optionA)

    await waitFor(() => {
      expect(screen.getByText(/回答正确/i)).toBeInTheDocument()
    })
  })

  test('4. 答错后记录', async () => {
    const user = userEvent.setup()

    // 让第一题正确答案不是 A
    fetch.mockReset()
    fetch.mockImplementation((url) => {
      if (url.includes('/api/knowledge-points')) {
        return Promise.resolve({ ok: true, json: () => [{ kp_id: 'kp1', kp_name: '三角形的概念' }] })
      }
      if (url.includes('/api/favorites')) {
        return Promise.resolve({ ok: true, json: () => [] })
      }
      if (url.includes('/api/adaptive-questions')) {
        return Promise.resolve({
          ok: true,
          json: () => ({
            questions: [{
              q_id: 'q1',
              kp_id: 'kp1',
              question_text: '什么是三角形？',
              options: [
                { label: 'A', content: '三个角', is_correct: false },
                { label: 'B', content: '两个角', is_correct: true },
              ],
            }],
            suggested_difficulty: '★',
            diff_stats: {},
          }),
        })
      }
      return Promise.resolve({ ok: true, json: () => [] })
    })

    render(<Quiz />)

    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })

    const optionA = screen.getByText('三个角')
    await user.click(optionA)

    await waitFor(() => {
      expect(screen.getByText(/回答错误/i)).toBeInTheDocument()
    })
  })
})
