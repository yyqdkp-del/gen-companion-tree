'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { useSWRConfig } from 'swr'
import { fetchAppData, readAppCoreCache, writeAppCoreCache } from '@/app/_shared/_services/syncService'
import { enrichOneChild } from '@/app/_shared/_services/childService'
import { getTodayStr } from '@/lib/date/localDate'
import { useSpeech } from '@/app/_shared/_hooks/useSpeech'
import type { Session } from '@supabase/supabase-js'
import { subscribePushIfPermitted } from '@/lib/push/subscribePushClient'
import { signOutWithPushCleanup } from '@/lib/auth/signOutClient'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { phIdentify } from '@/lib/analytics/posthog'

async function subscribePush(session: Session) {
  await subscribePushIfPermitted(session)
}

type AppCoreData = {
  kids: any[]
  todos: any[]
  hotspots: any[]
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
  selectChild: (childId: string, opts?: { force?: boolean }) => Promise<void>
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
  const { mutate: globalMutate } = useSWRConfig()
  const [userId, setUserId] = useState('')
  const userIdRef = useRef('')
  const [tempTodos, setTempTodos] = useState<any[]>([])
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

  const fallbackData = useMemo((): AppCoreData | undefined => {
    if (!userId) return undefined
    const cached = readAppCoreCache(userId)
    if (!cached) return undefined
    return {
      kids: cached.kids as any[],
      todos: cached.todos as any[],
      hotspots: cached.hotspots as any[],
    }
  }, [userId])

  const { data, isLoading } = useSWR<AppCoreData>(
    userId ? (['app-core', userId] as const) : null,
    () => fetchAppData(userId),
    {
      dedupingInterval: 30000,
      revalidateOnFocus: true,
      fallbackData,
      onSuccess: (coreData) => {
        if (!userId) return
        writeAppCoreCache(userId, coreData)
        phIdentify(userId, { has_children: coreData.kids.length > 0 })
      },
      onError: (e) => logOrAlertNetworkError(e),
    },
  )

  const kids = data?.kids ?? []
  const hotspots = data?.hotspots ?? []
  const todos = useMemo(
    () => [...tempTodos, ...(data?.todos ?? [])],
    [tempTodos, data?.todos],
  )
  const loading = userId ? isLoading : !sessionReady

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

  const ensureEnriched = useCallback(async (childId: string, force = false) => {
    if (!userId || !childId) return null
    const base = kids.find((k: any) => k.id === childId)
    if (!base) return null

    const today = getTodayStr()
    const cacheKey = ['child-enriched', userId, childId, today] as const

    if (!force) {
      const cached = await globalMutate(
        cacheKey,
        undefined,
        { revalidate: false, populateCache: true },
      ).catch(() => undefined)
      if (cached && (cached as any)._enriched) return cached as any
    }

    const full = await globalMutate(
      cacheKey,
      () => enrichOneChild(base, userId, today),
      { revalidate: true },
    )
    return (full as any) ?? null
  }, [userId, kids, globalMutate])

  const selectChild = useCallback(async (childId: string, opts?: { force?: boolean }) => {
    const raw = kids.find((k: any) => k.id === childId)
    if (!raw) return
    setActiveKid(raw)
    const enriched = await ensureEnriched(childId, opts?.force ?? false)
    if (enriched) setActiveKid(enriched)
  }, [kids, setActiveKid, ensureEnriched])

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
    setTempTodos(prev => [tempTodo, ...prev])
    return tempId
  }, [])

  const removeTempTodo = useCallback((id: string) => {
    setTempTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const sync = useCallback(async (forceUid?: string) => {
    const uid = forceUid || userIdRef.current || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
    if (!uid) return
    await globalMutate(['app-core', uid])
  }, [globalMutate])

  const signOut = useCallback(async () => {
    await signOutWithPushCleanup()
  }, [])

  const clearStaleSession = useCallback(async () => {
    await supabase.auth.signOut()
    userIdRef.current = ''
    setUserId('')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_user_id')
      if ('caches' in window) {
        try {
          const cache = await caches.open('auth-v1')
          await cache.delete('/auth/session-bundle')
          await cache.delete('/auth/user-id')
        } catch {
          // ignore
        }
      }
    }
    router.push('/auth')
  }, [router])

  useEffect(() => {
    const bootLoggedIn = (uid: string, session: Session) => {
      setUserIdSafe(uid)
      setSessionReady(true)
      void subscribePush(session)
    }

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error?.code === 'refresh_token_not_found') {
          await clearStaleSession()
          return
        }
        if (session?.user?.id) {
          bootLoggedIn(session.user.id, session)
          return
        }

        if ('caches' in window) {
          try {
            const cache = await caches.open('auth-v1')
            const sessionRes = await cache.match('/auth/session-bundle')
            if (sessionRes) {
              const bundle = await sessionRes.json() as { access_token?: string; refresh_token?: string }
              if (bundle?.access_token && bundle?.refresh_token) {
                const { data: { session: s }, error: setError } = await supabase.auth.setSession({
                  access_token: bundle.access_token,
                  refresh_token: bundle.refresh_token,
                })
                if (setError?.code === 'refresh_token_not_found') {
                  await clearStaleSession()
                  return
                }
                if (s?.user?.id) {
                  bootLoggedIn(s.user.id, s)
                  return
                }
              }
            }
          } catch (e) { logOrAlertNetworkError(e) }
        }

        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError?.code === 'refresh_token_not_found') {
          await clearStaleSession()
          return
        }
        if (refreshData.session?.user?.id) {
          bootLoggedIn(refreshData.session.user.id, refreshData.session)
          return
        }

      } finally {
        setSessionReady(true)
      }
    }
    void initSession()
    // 仅启动时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearStaleSession])

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
    const revalidate = () => { void globalMutate(['app-core', userId]) }
    const channel = supabase.channel('app_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items' }, revalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspot_items' }, revalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, revalidate)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, globalMutate])

  useEffect(() => {
    if (!kids.length || typeof window === 'undefined') return

    const validActive = activeKid && kids.some((k: any) => k.id === activeKid.id)
    if (validActive) return

    const storedId = localStorage.getItem('active_child_id')
    const target = kids.find((k: any) => k.id === storedId) || kids[0]
    if (target) void selectChild(target.id)
  }, [kids, activeKid, selectChild])

  useEffect(() => {
    if (!userId) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void globalMutate(['app-core', userId])
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId, globalMutate])

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

          void globalMutate(['app-core', userId])
          setTimeout(() => setProcessStatus(null), 4000)
        }

        if (status === 'failed') {
          setProcessStatus({ status: 'failed', message: '整理失败，根会重试' })
          setTimeout(() => setProcessStatus(null), 3000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, globalMutate])

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
      selectChild,
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
      selectChild,
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
