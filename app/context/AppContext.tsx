'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

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
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const userIdRef = useRef('')
  const [kids, setKids] = useState<any[]>([])
  const [todos, setTodos] = useState<any[]>([])
  const [hotspots, setHotspots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    try {
      const uid = forceUid || userIdRef.current || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
      if (!uid) return
      const [childRes, todoRes, hotRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', uid),
        supabase.from('todo_items').select('*').eq('user_id', uid).neq('status', 'done').order('created_at', { ascending: false }).limit(50),
        supabase.from('hotspot_items').select('*').eq('status', 'unread').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
      ])
      if (childRes.data?.length) setKids(childRes.data)
      if (todoRes.data) setTodos(todoRes.data)
      setHotspots(hotRes.data || [])
    } catch (e) { console.error('sync error', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserIdSafe(session.user.id)
        sync(session.user.id)
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

  return (
    <AppContext.Provider value={{ userId, userIdRef, kids, todos, hotspots, loading, sync, setUserIdSafe, addTempTodo, removeTempTodo }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
