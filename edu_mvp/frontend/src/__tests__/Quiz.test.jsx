import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Quiz from '../pages/Quiz'

// Mock react-router-dom 的 useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ kpId: 'kp1' }),
  useNavigate: () => jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

// Mock API 响应
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          q_id: 'q1',
          question_text: '什么是三角形？',
          options: [
            { label: 'A', content: '三个角', is_correct: true },
            { label: 'B', content: '两个角', is_correct: false },
          ],
          difficulty: '★',
          score: 5,
        },
      ]),
  })
)

describe('Quiz 页面测试', () => {
  beforeEach(() => {
    fetch.mockClear()
    localStorage.clear()
  })

  test('1. 加载状态时显示 Spin 组件', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))
    
    render(<Quiz />)
    expect(screen.getByRole('status') || screen.getByText(/加载/i)).toBeInTheDocument()
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

  test('4. 答错后保存到 localStorage', async () => {
    const user = userEvent.setup()
    
    // Mock 错误答案的题目
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              q_id: 'q1',
              question_text: '什么是三角形？',
              options: [
                { label: 'A', content: '三个角', is_correct: false },
                { label: 'B', content: '两个角', is_correct: true },
              ],
            },
          ]),
      })
    )
    
    render(<Quiz />)
    
    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
    
    const optionA = screen.getByText('三个角')
    await user.click(optionA)
    
    await waitFor(() => {
      const wrong = JSON.parse(localStorage.getItem('wrongQuestions') || '[]')
      expect(wrong).toContain('q1')
    })
  })
})
