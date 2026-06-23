import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import WrongBook from '../pages/WrongBook'

// Mock API 响应
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          q_id: 'q1',
          question_text: '什么是三角形？',
          correct_answer: '三个角的图形',
          analysis: '三角形有三个角',
          kp_name: '三角形的概念',
        },
      ]),
  })
)

describe('WrongBook 页面测试', () => {
  beforeEach(() => {
    fetch.mockClear()
    localStorage.clear()
  })

  test('1. localStorage 无错题时显示空状态', () => {
    render(<WrongBook />)
    
    expect(screen.getByText(/暂无错题/i) || screen.getByText(/继续保持/i)).toBeInTheDocument()
  })

  test('2. localStorage 有错题时加载并显示', async () => {
    // 先设置错题 ID
    localStorage.setItem('wrongQuestions', JSON.stringify(['q1']))
    
    render(<WrongBook />)
    
    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
  })

  test('3. 点击清空错题清除 localStorage', async () => {
    const user = userEvent.setup()
    localStorage.setItem('wrongQuestions', JSON.stringify(['q1']))
    
    render(<WrongBook />)
    
    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
    
    const clearButton = screen.getByText(/清空错题/i)
    await user.click(clearButton)
    
    expect(localStorage.getItem('wrongQuestions')).toEqual(JSON.stringify([]))
  })

  test('4. API 调用失败时报错', async () => {
    localStorage.setItem('wrongQuestions', JSON.stringify(['q1']))
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API 连接失败')))
    
    render(<WrongBook />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
