import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminHome from '../../pages/admin/AdminHome'

const mockChapters = [{ chapter_id: 'ch1', chapter_title: '第十一章 三角形' }]
const mockKps = [{ kp_id: 'kp1', kp_name: '三角形的概念', difficulty: '★', importance: '核心考点', exam_frequency: '高频' }]
const mockQuestions = [
  { q_id: 'q1', kp_id: 'kp1', question_type: 'choice', difficulty: '★', question_text: '什么是三角形？', score: 5 },
]
const mockMethods = [{ kp_id: 'kp1', kp_name: '三角形的概念', method_type: '理解型' }]

function mockFetchResponse(url) {
  if (url.includes('/api/chapters')) return mockChapters
  if (url.includes('/api/knowledge-points')) return mockKps
  if (url.includes('/api/questions')) return mockQuestions
  if (url.includes('/api/learning-methods')) return mockMethods
  return []
}

describe('AdminHome 页面测试', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
    fetch.mockImplementation((url) =>
      Promise.resolve({ ok: true, json: () => mockFetchResponse(url) })
    )
  })

  test('1. 加载状态时显示加载指示器', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))

    render(<AdminHome />)
    expect(screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示统计卡片', async () => {
    render(<AdminHome />)

    await waitFor(() => {
      expect(screen.getByText('章节')).toBeInTheDocument()
    })
  })

  test('3. 可以切换 Tab 查看知识点', async () => {
    const user = userEvent.setup()
    render(<AdminHome />)

    await waitFor(() => {
      expect(screen.getByText(/管理控制台/)).toBeInTheDocument()
    })

    // 找到知识点 Tab 按钮（从 button 列表中过滤）
    const tabButtons = screen.getAllByRole('button')
    const kpTab = tabButtons.find(b => b.textContent.includes('知识点'))
    expect(kpTab).toBeTruthy()
    if (kpTab) await user.click(kpTab)

    await waitFor(() => {
      expect(screen.getByText('三角形的概念')).toBeInTheDocument()
    })
  })

  test('4. API 调用失败时报错', async () => {
    fetch.mockImplementation(() => Promise.reject(new Error('API 连接失败')))

    render(<AdminHome />)

    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
