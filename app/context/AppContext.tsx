'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { fetchAppData } from '@/app/_shared/_services/syncService'
import { useRouter } from 'next/navigation'


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
}
const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const userIdRef = useRef('')
  const lastSyncRef = useRef(0)
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
  const setUserIdSafe = (id: string) => {
    userIdRef.current = id
    setUserId(id)
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_user_id', id)
    }
  }

  const addTempTodo = useCallback((content: string): string => {
    const tempId = 'temp_' + Date.now()
    const tempTodo = {
      id: tempId,
      title: content.slice(0, 12) + (content.length > 12 ? '...' : ''),
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
    const now = Date.now()
  if (now - lastSyncRef.current < 2000) return  // ← 加这行
  lastSyncRef.current = now
    try {
      const uid = forceUid || userIdRef.current || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
      if (!uid) return
      const { kids, todos, hotspots } = await fetchAppData(uid)
      if (kids.length) setKids(kids)
      setTodos(todos)
      setHotspots(hotspots)
    } catch (e) { console.error('sync error', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserIdSafe(session.user.id)
        sync(session.user.id)
        // 推送订阅
if ('Notification' in window && 'serviceWorker' in navigator) {
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, user_id: session.user.id })
      })
    }
  } catch (e) {
    console.error('推送订阅失败:', e)
  }
}
        return
      }
      if ('caches' in window) {
        try {
          const cache = await caches.open('auth-v1')
          const response = await cache.match('/auth/user-id')
          if (response) {
            const uid = await response.text()
            if (uid) {
              const res = await fetch('/api/auth/refresh-pwa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid })
              })
              const { access_token, refresh_token } = await res.json()
              if (access_token) {
                const { data: { session: s } } = await supabase.auth.setSession({ access_token, refresh_token })
                if (s?.user?.id) { setUserIdSafe(s.user.id); sync(s.user.id); return }
              }
            }
          }
        } catch (e) { console.error(e) }
      }
      const { data: refreshData } = await supabase.auth.refreshSession()
      if (refreshData.session?.user?.id) {
        setUserIdSafe(refreshData.session.user.id)
        sync(refreshData.session.user.id)
        return
      }
      setTimeout(() => { if (!userIdRef.current) router.push('/auth') }, 3000)
    }
    void initSession()
    const channel = supabase.channel('app_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items' }, () => sync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspot_items' }, () => sync())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => sync())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
  useEffect(() => {
  if (!userId) return
  const interval = setInterval(() => {
    sync(userId)
  }, 30000)
  return () => clearInterval(interval)
}, [userId])
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
}, [userId])
  return (
   <AppContext.Provider value={{ userId, userIdRef, kids, todos, hotspots, loading, sync, setUserIdSafe, addTempTodo, removeTempTodo, processStatus, setProcessStatus, activeKid, setActiveKid, modalOpen, setModalOpen }}>
      {children}
    </AppContext.Provider>
  )
}
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
