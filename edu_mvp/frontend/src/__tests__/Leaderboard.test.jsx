/**
 * Leaderboard.jsx 测试
 * 覆盖：渲染、加载状态、错误状态、空数据、排行展示、勋章图鉴、当前用户高亮
 */
import { render, screen, waitFor } from '@testing-library/react'
import Leaderboard from '../pages/Leaderboard'

const mockData = {
  leaderboard: [
    { rank: 1, student_id: 'u1', name: '张三', points: 100, badges: ['新手', '达人'], streak: 3 },
    { rank: 2, student_id: 'u2', name: '李四', points: 80, badges: ['新手'], streak: 0 },
    { rank: 3, student_id: 'u3', name: '王五', points: 60, badges: [], streak: 5 },
  ],
  total: 3,
}

const mockBadges = {
  badges: [
    { id: '新手', name: '新手入门', desc: '答对第1题' },
    { id: '达人', name: '答题达人', desc: '答对50题' },
  ],
}

describe('Leaderboard 排行榜页面', () => {
  beforeEach(() => {
    fetch.mockReset()
    localStorage.clear()
  })

  test('1. 加载中显示 Spin', () => {
    fetch.mockImplementation(() => new Promise(() => {})) // 永不 resolve
    render(<Leaderboard />)
    expect(document.querySelector('.ant-spin')).toBeInTheDocument()
  })

  test('2. 加载成功后显示排行榜标题', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => mockData }
      }
      if (url.includes('badges')) {
        return { ok: true, json: async () => mockBadges }
      }
      return { ok: true, json: async () => ({}) }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('🏆 排行榜')).toBeInTheDocument()
    })
  })

  test('3. 网络错误时显示错误提示和重试按钮', async () => {
    fetch.mockRejectedValue(new Error('Network error'))
    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('加载失败，请确保后端已启动')).toBeInTheDocument()
      expect(screen.getByText('重试')).toBeInTheDocument()
    })
  })

  test('4. 排行榜为空时显示提示', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) {
        return { ok: true, json: async () => ({ leaderboard: [], total: 0 }) }
      }
      return { ok: true, json: async () => ({ badges: [] }) }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('暂无数据，快去刷题吧！')).toBeInTheDocument()
    })
  })

  test('5. 显示前三名奖牌 emoji', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) return { ok: true, json: async () => mockData }
      return { ok: true, json: async () => mockBadges }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument()
      expect(screen.getByText('🥈')).toBeInTheDocument()
      expect(screen.getByText('🥉')).toBeInTheDocument()
    })
  })

  test('6. 显示学生姓名和积分', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) return { ok: true, json: async () => mockData }
      return { ok: true, json: async () => mockBadges }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('张三')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('李四')).toBeInTheDocument()
    })
  })

  test('7. 勋章图鉴渲染', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) return { ok: true, json: async () => mockData }
      return { ok: true, json: async () => mockBadges }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('🎖 勋章图鉴')).toBeInTheDocument()
      expect(screen.getByText('新手入门')).toBeInTheDocument()
      expect(screen.getByText('答题达人')).toBeInTheDocument()
    })
  })

  test('8. 当前用户高亮显示（我）', async () => {
    localStorage.setItem('auth_user', JSON.stringify({ user_id: 'u2', name: '李四' }))
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) return { ok: true, json: async () => mockData }
      return { ok: true, json: async () => mockBadges }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText('(我)')).toBeInTheDocument()
    })
  })

  test('9. 连击数显示（>1 才显示）', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('leaderboard')) return { ok: true, json: async () => mockData }
      return { ok: true, json: async () => mockBadges }
    })

    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByText(/3连击/)).toBeInTheDocument()
      expect(screen.getByText(/5连击/)).toBeInTheDocument()
    })
  })
})
