'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { fetchAppData } from '@/app/_shared/_services/syncService'
import { useSpeech } from '@/app/_shared/_hooks/useSpeech'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { subscribePushIfPermitted } from '@/lib/push/subscribePushClient'
import { signOutWithPushCleanup } from '@/lib/auth/signOutClient'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { phIdentify } from '@/lib/analytics/posthog'

async function subscribePush(session: Session) {
  await subscribePushIfPermitted(session)
}

type AppContextType = {
  userId: string
  userIdRef: React.MutableRefObject<string>
  kids: any[]
  todos: any[]
  hotspots: any[]
  loading: boolean
  sync: (uid?: string) => Promise<void>
  setUserIdSafe: (id: string) => void
  addTempTodo: (content: string) => string
  removeTempTodo: (id: string) => void
  processStatus: { status: 'processing' | 'done' | 'failed' | null; message: string; tools?: any[] } | null
  setProcessStatus: (status: { status: 'processing' | 'done' | 'failed' | null; message: string; tools?: any[] } | null) => void
  activeKid: any | null
  setActiveKid: (kid: any) => void
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
  speak: (text: string) => void
  stop: () => void
  speechEnabled: boolean
  toggleSpeech: () => void
  sessionReady: boolean
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
  signOut: () => Promise<void>
}
const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const userIdRef = useRef('')
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncAbortRef = useRef<AbortController | null>(null)
  const syncGenRef = useRef(0)
  const [kids, setKids] = useState<any[]>([])
  const [todos, setTodos] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processStatus, setProcessStatus] = useState<{
    status: 'processing' | 'done' | 'failed' | null
    message: string
    tools?: any[]
  } | null>(null)

  const [activeKid, setActiveKidState] = useState<any | null>(null)
const [modalOpen, setModalOpen] = useState(false)
const [sessionReady, setSessionReady] = useState(false)
const [showOnboarding, setShowOnboarding] = useState(false)
const { speak, stop, enabled: speechEnabled, toggle: toggleSpeech } = useSpeech()
const setActiveKid = useCallback((kid: any) => {
  setActiveKidState(kid)
  if (kid && typeof window !== 'undefined') {
    localStorage.setItem('active_child_id', kid.id)
    localStorage.setItem('active_child', JSON.stringify({
      id: kid.id, name: kid.name, grade: kid.grade,
      level: kid.chinese_level || kid.level || 'R2',
      emoji: kid.emoji || '👶🏻',
      school: kid.school_name || kid.school || '',
    }))
  }
}, [])
  const setUserIdSafe = useCallback((id: string) => {
    userIdRef.current = id
    setUserId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_user_id', id)
    }
  }, [])

  const addTempTodo = useCallback((content: string): string => {
    const tempId = 'temp_' + Date.now()
    let titleShort = content
    try {
      if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const seg = new Intl.Segmenter('zh', { granularity: 'grapheme' })
        const graphemes = [...seg.segment(content)].map(s => s.segment)
        titleShort = graphemes.slice(0, 12).join('') + (graphemes.length > 12 ? '...' : '')
      } else {
        titleShort = content.slice(0, 12) + (content.length > 12 ? '...' : '')
      }
    } catch {
      titleShort = content.slice(0, 12) + (content.length > 12 ? '...' : '')
    }
    const tempTodo = {
      id: tempId,
      title: titleShort,
      priority: 'yellow',
      status: 'pending',
      category: 'other',
      _isTemp: true,
      created_at: new Date().toISOString(),
    }
    setTodos(prev => [tempTodo, ...prev])
    return tempId
  }, [])

  const removeTempTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const sync = useCallback(async (forceUid?: string) => {
    const uid = forceUid || userIdRef.current || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
    if (!uid) {
      setLoading(false)
      return
    }

    syncAbortRef.current?.abort()
    const controller = new AbortController()
    syncAbortRef.current = controller
    const gen = ++syncGenRef.current

    try {
      const { kids, todos, hotspots } = await fetchAppData(uid, controller.signal)
      if (controller.signal.aborted) return
      if (gen !== syncGenRef.current) return
      setKids(kids)
      setTodos(todos)
      setHotspots(hotspots)
      phIdentify(uid, { has_children: kids.length > 0 })
    } catch (e: unknown) {
      if (controller.signal.aborted) return
      const name = e instanceof Error ? e.name : ''
      if (name === 'AbortError' || (e instanceof DOMException && e.name === 'AbortError')) return
      logOrAlertNetworkError(e)
    } finally {
      if (gen === syncGenRef.current) setLoading(false)
    }
  }, [])

  const debouncedSync = useCallback(() => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current)
    syncDebounceRef.current = setTimeout(() => {
      syncDebounceRef.current = null
      void sync()
    }, 800)
  }, [sync])

  const signOut = useCallback(async () => {
    await signOutWithPushCleanup()
  }, [])

  useEffect(() => () => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current)
  }, [])

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          setUserIdSafe(session.user.id)
          sync(session.user.id)
          void subscribePush(session)
          return
        }
        if ('caches' in window) {
          try {
            const cache = await caches.open('auth-v1')
            const sessionRes = await cache.match('/auth/session-bundle')
            if (sessionRes) {
              const bundle = await sessionRes.json() as { access_token?: string; refresh_token?: string }
              if (bundle?.access_token && bundle?.refresh_token) {
                const { data: { session: s } } = await supabase.auth.setSession({
                  access_token: bundle.access_token,
                  refresh_token: bundle.refresh_token,
                })
                if (s?.user?.id) {
                  setUserIdSafe(s.user.id)
                  sync(s.user.id)
                  void subscribePush(s)
                  return
                }
              }
            }
          } catch (e) { logOrAlertNetworkError(e) }
        }
        const { data: refreshData } = await supabase.auth.refreshSession()
        if (refreshData.session?.user?.id) {
          setUserIdSafe(refreshData.session.user.id)
          sync(refreshData.session.user.id)
          void subscribePush(refreshData.session)
          return
        }
        setTimeout(() => { if (!userIdRef.current) router.push('/auth') }, 3000)
      } finally {
        setSessionReady(true)
      }
    }
    void initSession()
  }, [])

  useEffect(() => {
    if (!sessionReady || loading || !userId) return
    if (typeof window === 'undefined') return

    const completed = localStorage.getItem('onboarding_completed')
    if (!completed && kids.length === 0) {
      const timer = setTimeout(() => setShowOnboarding(true), 500)
      return () => clearTimeout(timer)
    }
  }, [sessionReady, loading, userId, kids.length])

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel('app_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items' }, () => debouncedSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspot_items' }, () => debouncedSync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => debouncedSync())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, debouncedSync])
  useEffect(() => {
    if (!userId) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void sync(userId)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId, sync])
  useEffect(() => {
  if (!userId) return

  const channel = supabase
    .channel('process_status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'raw_inputs',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const { status, extracted_events } = payload.new

      if (status === 'processing') {
        setProcessStatus({ status: 'processing', message: '根正在整理中...' })
      }

      if (status === 'done') {
        const tools = extracted_events || []
        const todoCount = tools.filter((t: any) => t.tool === 'add_todo').length
        const scheduleCount = tools.filter((t: any) => t.tool === 'add_schedule').length
        const healthCount = tools.filter((t: any) => t.tool === 'add_health').length

        const parts = []
        if (todoCount > 0) parts.push(`${todoCount}件待办`)
        if (scheduleCount > 0) parts.push(`${scheduleCount}个日程`)
        if (healthCount > 0) parts.push(`${healthCount}条健康记录`)

        setProcessStatus({
          status: 'done',
          message: parts.length > 0 ? `整理完成 · 发现${parts.join('、')}` : '整理完成 ✓',
          tools,
        })

        sync(userId)
        setTimeout(() => setProcessStatus(null), 4000)
      }

      if (status === 'failed') {
        setProcessStatus({ status: 'failed', message: '整理失败，根会重试' })
        setTimeout(() => setProcessStatus(null), 3000)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId, sync])

  const value = useMemo<AppContextType>(
    () => ({
      userId,
      userIdRef,
      kids,
      todos,
      hotspots,
      loading,
      sync,
      setUserIdSafe,
      addTempTodo,
      removeTempTodo,
      processStatus,
      setProcessStatus,
      activeKid,
      setActiveKid,
      modalOpen,
      setModalOpen,
      speak,
      stop,
      speechEnabled,
      toggleSpeech,
      sessionReady,
      showOnboarding,
      setShowOnboarding,
      signOut,
    }),
    [
      userId,
      kids,
      todos,
      hotspots,
      loading,
      sync,
      setUserIdSafe,
      addTempTodo,
      removeTempTodo,
      processStatus,
      activeKid,
      setActiveKid,
      modalOpen,
      speak,
      stop,
      speechEnabled,
      toggleSpeech,
      sessionReady,
      showOnboarding,
      signOut,
    ],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
