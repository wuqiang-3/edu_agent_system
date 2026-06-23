import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminQuestions from '../../pages/admin/AdminQuestions'

// Mock API 响应
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        {
          q_id: 'q1',
          kp_id: 'kp1',
          kp_name: '三角形的概念',
          question_type: 'choice',
          difficulty: '★',
          question_text: '什么是三角形？',
        },
      ]),
  })
)

describe('AdminQuestions 页面测试', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('1. 加载状态时显示 Spin 组件', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))
    
    render(<AdminQuestions />)
    expect(screen.getByRole('status') || screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示题目表格', async () => {
    render(<AdminQuestions />)
    
    await waitFor(() => {
      expect(screen.getByText('什么是三角形？')).toBeInTheDocument()
    })
  })

  test('3. 可以按知识点筛选', async () => {
    const user = userEvent.setup()
    
    // Mock knowledge points API
    fetch.mockImplementation((url) => {
      if (url.includes('/api/knowledge-points')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ kp_id: 'kp1', kp_name: '三角形的概念' }]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })
    
    render(<AdminQuestions />)
    
    await waitFor(() => {
      const filterSelect = screen.getByRole('combobox', { name: /知识点/i })
      expect(filterSelect).toBeInTheDocument()
    })
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
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API 连接失败')))
    
    render(<AdminQuestions />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
