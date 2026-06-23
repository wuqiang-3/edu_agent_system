import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminHome from '../../pages/admin/AdminHome'

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

describe('AdminHome 页面测试', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('1. 加载状态时显示 Spin 组件', () => {
    fetch.mockImplementationOnce(() => new Promise(() => {}))
    
    render(<AdminHome />)
    expect(screen.getByRole('status') || screen.getByText(/加载/i)).toBeInTheDocument()
  })

  test('2. 加载完成后显示统计卡片', async () => {
    render(<AdminHome />)
    
    await waitFor(() => {
      expect(screen.getByText(/章节数/i)).toBeInTheDocument()
    })
  })

  test('3. 可以切换 Tab', async () => {
    const user = userEvent.setup()
    render(<AdminHome />)
    
    await waitFor(() => {
      expect(screen.getByText(/概览/i)).toBeInTheDocument()
    })
    
    const chaptersTab = screen.getByText(/章节管理/i)
    await user.click(chaptersTab)
    
    await waitFor(() => {
      expect(screen.getByText('第十一章 三角形')).toBeInTheDocument()
    })
  })

  test('4. API 调用失败时报错', async () => {
    fetch.mockImplementationOnce(() => Promise.reject(new Error('API 连接失败')))
    
    render(<AdminHome />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })
})
