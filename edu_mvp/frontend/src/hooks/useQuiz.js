/**
 * useQuiz — 答题状态机 Hook
 *
 * 将 Quiz 组件的 19 个 useState 收敛为 useReducer + 状态机：
 *   loading → empty/error/answering → checking → (answering|finished)
 *
 * 职责分离：
 *   - reducer: 纯状态计算
 *   - submitAnswer: API 副作用（记录答题、奖惩、错题本）
 *   - fetchData: 数据加载
 */
import { useReducer, useEffect, useRef, useCallback } from 'react'
import {
  recordAnswer, addWrongQuestion, fetchQuestions, fetchKnowledgePoints,
  toggleFavorite, fetchFavoriteIds, fetchAdaptiveQuestions, fetchMethods, awardPoints,
} from '../api'

// ============================================================
// State & Actions
// ============================================================

const DIFF_EMOJI = { '★': '⭐', '★★': '🌟🌟', '★★★': '🌟🌟🌟' }
const INITIAL = {
  questions: [],
  kp: null,
  learningMethod: null,
  currentIndex: 0,
  answers: [],
  favorites: new Set(),
  phase: 'loading',          // loading | empty | error | answering | checking | finished
  error: null,
  showCard: false,
  selectedAnswer: null,
  textAnswer: '',
  adaptiveMode: true,
  suggestedDiff: null,
  diffStats: {},
  allAnswered: false,
  reviewMode: false,
  elapsed: 0,
}

const ACTION = {
  SET_DATA: 'SET_DATA',
  SET_ERROR: 'SET_ERROR',
  SUBMIT_ANSWER: 'SUBMIT_ANSWER',
  NEXT_QUESTION: 'NEXT_QUESTION',
  JUMP_TO: 'JUMP_TO',
  FINISH: 'FINISH',
  TOGGLE_FAV: 'TOGGLE_FAV',
  SET_FAVORITES: 'SET_FAVORITES',
  TOGGLE_CARD: 'TOGGLE_CARD',
  TOGGLE_MODE: 'TOGGLE_MODE',
  SET_TEXT_ANSWER: 'SET_TEXT_ANSWER',
  TICK: 'TICK',
  RESET: 'RESET',
}

function quizReducer(state, action) {
  switch (action.type) {
    // ── 数据加载 ──
    case ACTION.SET_DATA:
      return {
        ...state,
        ...action.payload,
        phase: action.payload.questions.length === 0 ? 'empty' : 'answering',
        error: null,
      }

    case ACTION.SET_ERROR:
      return { ...state, phase: 'error', error: action.payload }

    // ── 答题 ──
    case ACTION.SUBMIT_ANSWER: {
      const { isCorrect, selectedAnswer } = action.payload
      const newAnswers = [...state.answers]
      newAnswers[state.currentIndex] = { answered: true, isCorrect }
      return {
        ...state,
        answers: newAnswers,
        selectedAnswer,
        phase: 'checking',
      }
    }

    // ── 导航 ──
    case ACTION.NEXT_QUESTION: {
      const nextIdx = state.currentIndex + 1
      if (nextIdx >= state.questions.length) {
        return { ...state, phase: 'finished', showCard: false }
      }
      return {
        ...state,
        currentIndex: nextIdx,
        selectedAnswer: null,
        textAnswer: '',
        phase: 'answering',
        showCard: false,
      }
    }

    case ACTION.JUMP_TO:
      return {
        ...state,
        currentIndex: action.payload,
        selectedAnswer: null,
        textAnswer: '',
        phase: 'answering',
        showCard: false,
      }

    case ACTION.FINISH:
      return { ...state, phase: 'finished' }

    // ── UI 开关 ──
    case ACTION.TOGGLE_FAV: {
      const { qId, favorited } = action.payload
      const newFavs = new Set(state.favorites)
      favorited ? newFavs.add(qId) : newFavs.delete(qId)
      return { ...state, favorites: newFavs }
    }

    case ACTION.SET_FAVORITES:
      return { ...state, favorites: action.payload }

    case ACTION.TOGGLE_CARD:
      return { ...state, showCard: !state.showCard }

    case ACTION.TOGGLE_MODE:
      return { ...state, adaptiveMode: !state.adaptiveMode, phase: 'loading' }

    // ── 输入 ──
    case ACTION.SET_TEXT_ANSWER:
      return { ...state, textAnswer: action.payload }

    case ACTION.TICK:
      return { ...state, elapsed: state.elapsed + 1 }

    case ACTION.RESET:
      return { ...state, currentIndex: 0, selectedAnswer: null, textAnswer: '',
               phase: 'answering', elapsed: 0 }

    default:
      return state
  }
}

// ============================================================
// Hook
// ============================================================

export default function useQuiz(kpId) {
  const [state, dispatch] = useReducer(quizReducer, INITIAL)
  const timerRef = useRef(null)
  const questionStartRef = useRef(Date.now())

  // ── 数据加载 ──
  const fetchData = useCallback(async () => {
    try {
      const [kpsData, favIds] = await Promise.all([
        fetchKnowledgePoints(),
        fetchFavoriteIds(),
      ])
      dispatch({ type: ACTION.SET_FAVORITES, payload: new Set(favIds) })

      let qsData, suggestedDiff = null, diffStats = {}, allAnswered = false, reviewMode = false

      if (state.adaptiveMode) {
        const ad = await fetchAdaptiveQuestions(kpId)
        qsData = ad.questions || []
        suggestedDiff = ad.suggested_difficulty || null
        diffStats = ad.diff_stats || {}
        allAnswered = ad.all_answered || false
        reviewMode = ad.review_mode || false
      } else {
        qsData = await fetchQuestions(kpId)
      }

      let learningMethod = null
      try {
        const methods = await fetchMethods()
        learningMethod = methods.find(m => m.kp_id === kpId) || null
      } catch { /* ignore */ }

      dispatch({
        type: ACTION.SET_DATA,
        payload: {
          questions: qsData,
          kp: kpsData.find(k => k.kp_id === kpId) || null,
          learningMethod,
          answers: Array(qsData.length).fill(null),
          currentIndex: 0,
          selectedAnswer: null,
          textAnswer: '',
          suggestedDiff,
          diffStats,
          allAnswered,
          reviewMode,
        },
      })

      // 启动计时器
      clearInterval(timerRef.current)
      questionStartRef.current = Date.now()
      timerRef.current = setInterval(() => dispatch({ type: ACTION.TICK }), 1000)
    } catch {
      dispatch({ type: ACTION.SET_ERROR, payload: '无法加载题目，请确保后端已启动' })
    }
  }, [kpId, state.adaptiveMode])

  // 初始加载 & 模式切换重新加载
  useEffect(() => { fetchData() }, [kpId])
  useEffect(() => {
    if (state.phase !== 'loading') fetchData()
  }, [state.adaptiveMode])

  // 卸载清理
  useEffect(() => () => clearInterval(timerRef.current), [])

  // ── 统一答题提交（合并 handleAnswer + handleTextSubmit） ──
  const commitAnswer = useCallback((rawSelectedAnswer, isCorrect) => {
    const q = state.questions[state.currentIndex]
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000)

    dispatch({ type: ACTION.SUBMIT_ANSWER, payload: { isCorrect, selectedAnswer: rawSelectedAnswer } })

    // 记录答题
    recordAnswer({
      qId: q.q_id, kpId: q.kp_id, chapterId: q.chapter_id || '',
      difficulty: q.difficulty,
      selectedAnswer: rawSelectedAnswer.label || rawSelectedAnswer.content || rawSelectedAnswer,
      isCorrect, timeSpent,
    }).catch(err => console.error('记录答题失败:', err))

    // 奖惩
    if (isCorrect) {
      const streak = state.answers.filter(a => a?.isCorrect).length + 1
      awardPoints(10, streak).catch(err => console.error('加分失败:', err))
    } else {
      awardPoints(0, 0).catch(err => console.error('重置连击失败:', err))
      addWrongQuestion(q.q_id).catch(err => console.error('记录错题失败:', err))
    }
  }, [state.questions, state.currentIndex, state.answers])

  const handleAnswer = useCallback((option) => {
    if (state.phase !== 'answering') return
    commitAnswer(option, option.is_correct)
  }, [state.phase, commitAnswer])

  const handleTextSubmit = useCallback(() => {
    if (state.phase !== 'answering' || !state.textAnswer.trim()) return
    const q = state.questions[state.currentIndex]
    const userAnswer = state.textAnswer.trim()
    const isCorrect = userAnswer.replace(/\s+/g, '') === (q.correct_answer || '').replace(/\s+/g, '')
    commitAnswer({ label: userAnswer, content: userAnswer, is_correct: isCorrect }, isCorrect)
  }, [state.phase, state.textAnswer, state.questions, state.currentIndex, commitAnswer])

  const nextQuestion = useCallback(() => dispatch({ type: ACTION.NEXT_QUESTION }), [])
  const jumpTo = useCallback(idx => dispatch({ type: ACTION.JUMP_TO, payload: idx }), [])
  const toggleCard = useCallback(() => dispatch({ type: ACTION.TOGGLE_CARD }), [])
  const toggleMode = useCallback(() => dispatch({ type: ACTION.TOGGLE_MODE }), [])
  const setTextAnswer = useCallback(v => dispatch({ type: ACTION.SET_TEXT_ANSWER, payload: v }), [])

  const handleToggleFav = useCallback(async (qId) => {
    try {
      const result = await toggleFavorite(qId)
      dispatch({ type: ACTION.TOGGLE_FAV, payload: { qId, favorited: result.favorited } })
    } catch { /* ignore */ }
  }, [])

  // ── 派生统计（从 state 计算，不是额外 useState） ──
  const correctCount = state.answers.filter(a => a?.isCorrect).length
  const wrongCount = state.answers.filter(a => a?.answered === true && !a.isCorrect).length
  const unansweredCount = state.answers.filter(a => a === null || !a.answered).length
  const accuracy = state.questions.length > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) || 0
    : 0

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return {
    // 状态
    ...state,

    // 派生数据
    correctCount, wrongCount, unansweredCount, accuracy,
    formatTime,

    // 当前题目
    currentQ: state.questions[state.currentIndex],
    isFav: state.favorites.has(state.questions[state.currentIndex]?.q_id || ''),

    // 操作
    handleAnswer, handleTextSubmit, nextQuestion, jumpTo,
    toggleCard, toggleMode, handleToggleFav, setTextAnswer,
    fetchData,
  }
}
