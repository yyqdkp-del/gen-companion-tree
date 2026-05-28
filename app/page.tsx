'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import InstallPWA from '@/app/components/InstallPWA'
import React, { Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import nextDynamic from 'next/dynamic'
import {
  X, Plus, ChevronRight, CheckCircle2, Bell,
  Zap, Heart, Clock, Loader, FileText,
  ShoppingCart, Plane, Pill, Building2, BookOpen,
  Mic, Camera, Phone, Send, Upload,
} from 'lucide-react'
export const dynamic = 'force-dynamic'
import TodoDetailModal from '@/app/rian/TodoDetailModal'
import ChildSheet from '@/app/rian/ChildSheet'
import HotspotSheet from '@/app/rian/HotspotSheet'
import Onboarding from '@/app/components/Onboarding'
import { useApp } from '@/app/context/AppContext'
import TodoSheet from '@/app/rian/TodoSheet'
import { THEME } from '@/app/_shared/_constants/theme'
import WaterDrop from '@/app/_shared/_components/WaterDrop'
import type { TodoItem, HotspotItem } from '@/app/_shared/_types'
import { useChildData } from '@/app/_shared/_hooks/useChildData'
import { useTodoActions } from '@/app/_shared/_hooks/useTodoActions'
import { useTodoEngine } from '@/app/_shared/_hooks/useTodoEngine'
import { useHotspotEngine } from '@/app/_shared/_hooks/useHotspotEngine'
import { track } from '@/lib/analytics/track'
import { addChild } from '@/app/_shared/_services/childService'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast } from '@/app/components/Toast'
import TourGuide, { type TourStep } from '@/app/components/TourGuide'
import { sanitizeFileName } from '@/lib/storage/sanitizeFileName'
import { useRouter } from 'next/navigation'
import HomeRefreshFromQuery from '@/app/components/HomeRefreshFromQuery'

const ChildAvatar = nextDynamic(() => import('@/app/components/ChildAvatar'), { ssr: false })

type ScheduleItem = { time: string; title: string; location?: string; requires_action?: string }
type UrgentItem = { title: string; level: 'red' | 'orange' | 'yellow' }
type PackingAlert = { item: string; level: 1 | 2 | 3 | 'today'; days_left?: number; need_buy: boolean }
type Greeting = { text: string; sub: string }

const getEnergyColor = (v: number) => v > 70 ? '#8ca88d' : v > 40 ? '#b88e5e' : '#d58074'

function getGreetingForHour(h: number): Greeting {
  if (h < 6) return { text: '深夜了，好好休息', sub: '树洞随时为你亮着' }
  if (h < 12) return { text: '早安', sub: '今天也是新的开始' }
  if (h < 18) return { text: '下午好', sub: '喝杯水，歇一歇' }
  if (h < 21) return { text: '晚上好', sub: '今天辛苦了' }
  return { text: '夜深了', sub: '放下今天，好好睡觉' }
}

function dropState(type: string, data: any) {
  if (type === 'child') {
    if (!data) return 'calm'
    if (data.health_status === 'sick') return 'red'
    if (data.urgent_items?.some((i: UrgentItem) => i.level === 'red')) return 'red'
    if (data.urgent_items?.some((i: UrgentItem) => i.level === 'orange')) return 'orange'
    if (data.urgent_items?.length) return 'yellow'
    return 'calm'
  }
  return 'calm'
}



function AddChildSheet({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👶🏻')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const emojis = ['👶🏻', '👦🏻', '👧🏻', '🧒🏻', '👦🏼', '👧🏼', '🧒', '👦', '👧', '🧒🏽', '👦🏽', '👧🏽']

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `children/${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      setAvatarUrl(urlData.publicUrl)
    } catch (e) { logOrAlertNetworkError(e) }
    finally { setUploading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(40px)', borderRadius: '28px 28px 0 0',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 -10px 60px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: THEME.text }}>添加孩子</h2>
          <motion.div whileTap={{ scale: 0.85 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }}>
            <X size={20} />
          </motion.div>
        </div>
        <div style={{ padding: '16px 20px 52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <div onClick={() => photoInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : 'rgba(164,99,85,0.08)',
                  border: '2px dashed rgba(164,99,85,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : uploading ? <Loader size={20} color={THEME.gold} />
                  : <div style={{ textAlign: 'center' }}>
                      <Camera size={20} color={THEME.gold} />
                      <div style={{ fontSize: 9, color: THEME.gold, marginTop: 3 }}>上传照片</div>
                    </div>}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>或选择头像</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {emojis.map(e => (
                  <motion.div key={e} whileTap={{ scale: 0.88 }}
                    onClick={() => { setEmoji(e); setAvatarUrl(null) }}
                    style={{ width: 36, height: 36, borderRadius: '50%', fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: emoji === e && !avatarUrl ? 'rgba(164,99,85,0.14)' : 'rgba(0,0,0,0.04)',
                      border: emoji === e && !avatarUrl ? '2px solid rgba(164,99,85,0.5)' : '2px solid transparent',
                      cursor: 'pointer' }}>
                    {e}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          {[
            { label: '孩子名字 *', val: name, set: setName, ph: '英文名或中文名' },
            { label: '学校名称',   val: school, set: setSchool, ph: 'Lanna International School' },
            { label: '年级班级',   val: grade,  set: setGrade,  ph: 'Grade 2 / 小学二年级' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.55)',
                  fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <motion.button whileTap={{ scale: 0.97 }} disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true)
              await onSave({ name: name.trim(), emoji, school_name: school, grade, avatar_url: avatarUrl })
              setSaving(false)
              onClose()
            }}
            style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none',
              background: name.trim() ? THEME.navy : 'rgba(0,0,0,0.08)',
              color: name.trim() ? '#fff' : THEME.muted,
              fontSize: 14, fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <Loader size={16} /> : null}{saving ? '保存中…' : '添加孩子'}
          </motion.button>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: THEME.muted }}>
            保存后可前往「孩子资料」补充课程表和健康信息
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InputSheet({ onClose, userId, onProcessing }: {
  onClose: () => void; userId: string; onProcessing?: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const headers = await getJsonAuthHeaders()
      if (!headers.Authorization) return
      await fetch('/api/rian/process', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: text.trim(), input_type: 'text' }),
      })
      onClose()
      onProcessing?.()
    } catch (e) { logOrAlertNetworkError(e) }
    setSending(false)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.38)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(40px)', borderRadius: '28px 28px 0 0',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 -10px 60px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: THEME.text }}>告诉根</h2>
          <motion.div whileTap={{ scale: 0.85 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }}>
            <X size={20} />
          </motion.div>
        </div>
        <div style={{ padding: '16px 20px 52px' }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="说什么都行，根来帮你整理…"
            style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.55)',
              fontSize: 14, color: THEME.text, outline: 'none', resize: 'none',
              boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
          <motion.button whileTap={{ scale: 0.97 }} disabled={!text.trim() || sending} onClick={handleSend}
            style={{ width: '100%', marginTop: 12, padding: '14px', borderRadius: 16, border: 'none',
              background: text.trim() ? THEME.navy : 'rgba(0,0,0,0.08)',
              color: text.trim() ? '#fff' : THEME.muted,
              fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
            {sending ? '发送中…' : '发送给根 →'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const HOME_TOUR: TourStep[] = [
  {
    id: 'water',
    title: '三颗水珠，你的家庭全貌',
    desc: '左边是孩子状态，中间是今日待办，右边是本地热点。点击水珠展开详情。',
    emoji: '💧',
    position: 'bottom',
    targetHint: '试试点击中间那颗水珠',
  },
  {
    id: 'hotspot',
    title: '根在帮你巡逻',
    desc: '每天三次，AI自动扫描本地天气、学校通知、签证政策，只推送对你重要的信息。',
    emoji: '⚡',
    position: 'center',
  },
  {
    id: 'nav',
    title: '底部导航',
    desc: '🏠首页 · 📚学字 · 📅日安 · 🌳树屋 · 👤档案，每个功能都为海外华人家庭设计。',
    emoji: '🧭',
    position: 'bottom',
    targetHint: '底部导航栏',
  },
]

export default function BasePage() {
  const router = useRouter()
  const { userId, kids, todos, hotspots, loading, sessionReady, sync: ctxSync,
    processStatus, setProcessStatus, activeKid, setActiveKid,
    modalOpen, setModalOpen, showOnboarding, setShowOnboarding } = useApp()
  const [time, setTime] = useState(new Date())
  const [modal, setModal] = useState<'child' | 'todo' | 'hotspot' | 'addChild' | 'oneTap' | 'input' | null>(null)

  const openModal = (m: typeof modal) => { setModal(m); setModalOpen(true) }
  const closeModal = () => { setModal(null); setModalOpen(false) }
  const [oneTapTodo, setOneTapTodo] = useState<TodoItem | null>(null)
  const [patrolling, setPatrolling] = useState(false)
  const patrolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState<Greeting | null>(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [showProfileBanner, setShowProfileBanner] = useState(false)

  const { enrichedKids, refresh: refreshKids } = useChildData(userId, { deferMs: 0 })
  const [optimisticDoneIds, setOptimisticDoneIds] = useState<Set<string>>(() => new Set())

  const optimisticRemove = useCallback((id: string) => {
    setOptimisticDoneIds(prev => new Set([...prev, id]))
  }, [])
  const optimisticRestore = useCallback((id: string) => {
    setOptimisticDoneIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const displayTodos = useMemo(
    () => todos.filter(t => !optimisticDoneIds.has(t.id)),
    [todos, optimisticDoneIds],
  )

  useEffect(() => {
    setOptimisticDoneIds(prev => {
      if (!prev.size) return prev
      const next = new Set([...prev].filter(id => todos.some(t => t.id === id)))
      return next.size === prev.size ? prev : next
    })
  }, [todos])

  const { markDone, snooze } = useTodoActions(todos, ctxSync, {
    remove: optimisticRemove,
    restore: optimisticRestore,
  })
  const todoEngine = useTodoEngine(displayTodos)
  const { groups: todoGroups } = todoEngine
  const hotspotEngine = useHotspotEngine(hotspots)

  // sync 完成后先用基础 kids 展示头像/姓名，不必等 enrich
  useEffect(() => {
    if (kids.length > 0 && !activeKid) {
      const storedId = localStorage.getItem('active_child_id')
      const current = kids.find((k: any) => k.id === storedId) || kids[0]
      setActiveKid(current)
    }
  }, [kids, activeKid, setActiveKid])

  // enrich 完成后升级 activeKid（精力、紧急项等）
  useEffect(() => {
    if (enrichedKids.length > 0) {
      const storedId = localStorage.getItem('active_child_id')
      const current = enrichedKids.find((c: any) => c.id === storedId) || enrichedKids[0]
      setActiveKid(current)
    }
  }, [enrichedKids, setActiveKid])

  useEffect(() => {
    const skipped = localStorage.getItem('onboarding_skipped')
    const hasKids = kids.length > 0
    setShowProfileBanner(!!skipped && !hasKids)
  }, [kids])

  useEffect(() => {
    setMounted(true)
    const updateClock = () => {
      const now = new Date()
      setTime(now)
      setGreeting(getGreetingForHour(now.getHours()))
    }
    updateClock()
    const ticker = setInterval(updateClock, 1000)
    return () => clearInterval(ticker)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight
      setKeyboardOpen(currentHeight < window.screen.height * 0.75)
    }
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => () => {
    if (patrolTimerRef.current) clearTimeout(patrolTimerRef.current)
  }, [])

  const handleMarkDone = async (id: string) => {
    const todo = oneTapTodo ?? todos.find(t => t.id === id)
    if (todo) {
      void track({
        event_type: 'todo_completed',
        page: window.location.pathname,
        meta: {
          priority: todo.priority,
          source: todo.category,
        },
      })
    }
    await markDone(id)
    closeModal()
  }

  const handleSnooze = async (id: string) => {
    await snooze(id)
    closeModal()
  }

  const handleAddChild = async (d: any) => {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) return
    const newId = await addChild(uid, d)
    await ctxSync()
    closeModal()
    if (newId) window.location.href = `/children/${newId}?from=quick`
  }

  const handleRead = async (id: string) => {
    const { error } = await supabase.from('hotspot_items').update({ status: 'read' }).eq('id', id)
    if (error) console.error('handleRead failed:', error)
    ctxSync()
  }

  const handlePatrol = async () => {
    if (patrolling) return
    if (patrolTimerRef.current) {
      clearTimeout(patrolTimerRef.current)
      patrolTimerRef.current = null
    }
    setPatrolling(true)
    try {
      const res = await fetchWithAuth('/api/base/patrol', {
        method: 'POST',
        body: JSON.stringify({}),
        // 手动巡逻在服务端同步跑 Grok/Gemini/Claude，可能需 1–2 分钟
        signal: AbortSignal.timeout(180_000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || '巡逻失败')

      await ctxSync()

      if (data.skipped === 'no_resident_city') {
        toast('请先在档案填写居住城市，才能生成本地热点', 'error')
      } else if (data.error) {
        toast(`巡逻失败：${data.error}`, 'error')
      } else if ((data.saved ?? 0) > 0) {
        toast(`已更新 ${data.saved} 条热点`, 'success')
      } else if ((data.generated ?? 0) > 0) {
        toast('今日同类热点已存在，未重复写入', 'success')
      } else {
        toast('暂无新的高价值热点，请稍后再试', 'success')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        if (!logOrAlertNetworkError(e)) toast('刷新失败，请重试', 'error')
      }
    } finally {
      setPatrolling(false)
    }
  }

  // 孩子水珠状态：energy_level 优先，urgent_items 次之，yellow 最后
  const energyLevel = (activeKid as any)?.energy_level
  const urgentItems = (activeKid as any)?.urgent_items || []

  const childState = !activeKid ? 'calm'
    : energyLevel === 'red' ? 'red'
    : energyLevel === 'orange' ? 'orange'
    : urgentItems.some((i: UrgentItem) => i.level === 'red') ? 'red'
    : urgentItems.some((i: UrgentItem) => i.level === 'orange') ? 'orange'
    : energyLevel === 'yellow' ? 'yellow'
    : 'calm'
  const childUrgent = activeKid?.urgent_items?.filter(
    (i: UrgentItem) => i.level === 'red' || i.level === 'orange',
  ).length || 0

  const dayMap: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }
  const todayDow = new Date().getDay()
  const todayKey = dayMap[todayDow]
  const todayActivities = (activeKid as any)?.activities?.filter((a: any) => {
    if (a.is_active === false) return false
    if (Array.isArray(a.days) && a.days.includes(todayKey)) return true
    if (typeof a.day_of_week === 'number' && a.day_of_week === todayDow) return true
    if (typeof a.day === 'number' && a.day === todayDow) return true
    return false
  }) || []

  const todayClasses = (activeKid as any)?.today_classes || []

  const childValue = !activeKid ? '—'
    : (activeKid as any).energy_label || (activeKid as any).energy_focus?.slice(0, 10) || '—'

  const childSubValue = !activeKid ? ''
    : (activeKid as any).energy_focus?.slice(0, 15) || ''

  const topTodo = [...(todoGroups?.today || [])].sort((a, b) => {
    const order: Record<string, number> = { red: 3, orange: 2, yellow: 1 }
    return (order[b.priority] || 0) - (order[a.priority] || 0)
  })[0]

  const todoValue = topTodo
    ? topTodo.title?.replace(/^📅\s*/, '').slice(0, 10) || '待办'
    : todoGroups?.soon?.length > 0
      ? `近期${todoGroups.soon.length}件`
      : '今日清闲'

  const todoSubValue = topTodo
    ? todoGroups.today.length > 1
      ? `今日还有 ${todoGroups.today.length - 1} 件`
      : topTodo.due_date
        ? `截止 ${new Date(topTodo.due_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`
        : ''
    : todoGroups?.soon?.length > 0
      ? `近期 ${todoGroups.soon.length} 件`
      : ''

  const HOTSPOT_URGENCY_RANK: Record<string, number> = { urgent: 0, important: 1, lifestyle: 2 }
  const unreadHotspots = [...hotspots]
    .filter((h: HotspotItem) => h.status === 'unread' || !h.status)
    .sort((a, b) =>
      (HOTSPOT_URGENCY_RANK[a.urgency] ?? 2) - (HOTSPOT_URGENCY_RANK[b.urgency] ?? 2),
    )
  const urgentHotspot = unreadHotspots.find((h: HotspotItem) =>
    h.title?.includes('签证') ||
    h.title?.includes('预警') ||
    h.title?.includes('停课'),
  )
  const topHotspot = urgentHotspot || unreadHotspots[0]

  const hotspotValue = patrolling
    ? '巡逻中'
    : topHotspot?.title
      ? (() => {
          const core = topHotspot.title.replace(/【.+?】/, '').split('｜')[0].trim()
          return core.length > 10 ? `${core.slice(0, 10)}…` : core
        })()
      : hotspotEngine.badge > 0
        ? `${hotspotEngine.badge}条`
        : '根'

  const hotspotSubValue = patrolling ? '巡逻中'
    : unreadHotspots.length > 0
      ? `${unreadHotspots.length} 条未读`
      : ''

  const showBootSkeleton = !sessionReady || (loading && kids.length === 0 && todos.length === 0)

  if (showBootSkeleton) {
    return (
      <main style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#fbf9f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: '60% 40% 60% 40%', background: 'rgba(164,99,85,0.08)', animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ width: 120, height: 120, borderRadius: '50% 60% 40% 50%', background: 'rgba(164,99,85,0.1)', animation: 'pulse 1.5s ease infinite 0.2s' }} />
          <div style={{ width: 90, height: 90, borderRadius: '40% 60% 50% 40%', background: 'rgba(164,99,85,0.08)', animation: 'pulse 1.5s ease infinite 0.4s' }} />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.4)', fontFamily: 'sans-serif', letterSpacing: '0.2em' }}>
          {!sessionReady ? '根·启动中' : '根·同步中'}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
          }
        `}</style>
      </main>
    )
  }

  return (
    <main style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      overflow: 'hidden',
      backgroundColor: '#fbf9f6',
      backgroundImage: `
  radial-gradient(at 100% 0%, rgba(245,214,209,0.25) 0px, transparent 55%),
  radial-gradient(at 0% 100%, rgba(217,230,218,0.2) 0px, transparent 55%),
  radial-gradient(at 50% 50%, rgba(251,249,246,0.8) 0px, transparent 80%)
`,
    }}>
      <Suspense fallback={null}>
        <HomeRefreshFromQuery onRefresh={() => { void refreshKids(); void ctxSync() }} />
      </Suspense>
      {showOnboarding && (
        <Onboarding onComplete={() => {
          setShowOnboarding(false)
          localStorage.setItem('onboarding_completed', 'true')
        }} />
      )}

      {showProfileBanner && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/children')}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') router.push('/children')
          }}
          style={{
            position: 'fixed',
            top: 'max(env(safe-area-inset-top), 0px)',
            left: 0,
            right: 0,
            zIndex: 60,
            background: 'rgba(164,99,85,0.9)',
            backdropFilter: 'blur(10px)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13, color: '#fff', fontFamily: 'sans-serif' }}>
            📋 完善孩子档案，让根更懂你
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>→</span>
        </div>
      )}

      {mounted && greeting && (
        <div style={{
          position: 'fixed',
          top: showProfileBanner
            ? 'calc(max(env(safe-area-inset-top), 12px) + 96px)'
            : 'calc(max(env(safe-area-inset-top), 12px) + 72px)',
          right: '22%',
          left: 'auto',
          zIndex: 10,
          textAlign: 'right',
          maxWidth: 'min(38vw, 200px)',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 300,
            fontSize: '14px',
            color: '#2d322f',
            letterSpacing: '0.03em',
            lineHeight: 1.4,
          }}>
            {greeting.text}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: '12%', right: '-4%',
        fontSize: 'clamp(60px, 18vw, 130px)', fontWeight: 'bold',
        color: THEME.text, opacity: 0.07, pointerEvents: 'none',
        fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1, userSelect: 'none' }}>
        根·陪伴
      </div>

      <ChildAvatar
        kids={kids}
        enrichedKids={enrichedKids}
        activeKid={activeKid}
        onSwitch={setActiveKid}
      />

      <header style={{ position: 'fixed',
        top: 'max(48px, env(safe-area-inset-top, 48px))',
        right: '6%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: 'clamp(48px, 15vw, 76px)', fontWeight: 100,
          color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {mounted
            ? `${time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}`
            : '--:--'}
        </h1>
        <p style={{ fontSize: 10, color: THEME.text, opacity: 0.35,
          letterSpacing: '0.25em', marginTop: 3 }}>
          {mounted ? `${time.getMonth() + 1}.${time.getDate()}` : ''}
        </p>
      </header>

      <div style={{ position: 'absolute', top: '42%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(20px, 5vw, 36px)' }}>
          <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <WaterDrop state={childState} icon={<Heart size={24} />} label="孩子"
              value={childValue}
              subValue={childSubValue}
              badge={childUrgent} pulse={childUrgent > 0}
              onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'child' } }); openModal('child') }} size={124} delay={0}
              className="animate-droplet-1" />
            {activeKid && (activeKid.total_hanzi ?? 0) > 0 && (
              <div style={{
                marginTop: childSubValue ? 4 : 6,
                background: '#a46355',
                color: '#fff',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                fontFamily: 'sans-serif',
                whiteSpace: 'nowrap',
              }}
              >
                识{activeKid.total_hanzi}字
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'clamp(28px, 8vw, 52px)', alignItems: 'center' }}>
            <WaterDrop state={todoEngine.state} icon={<Bell size={20} />} label="待办"
              value={todoValue}
              subValue={todoSubValue}
              badge={todoEngine.badge} pulse={todoEngine.badge > 0}
              onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'todo' } }); openModal('todo') }} size={98} delay={1.8}
              className="animate-droplet-2" />
            <WaterDrop state={hotspotEngine.state}
              icon={patrolling ? <Loader size={20} /> : <Zap size={20} />}
              label="热点" value={hotspotValue}
              subValue={hotspotSubValue}
              badge={hotspotEngine.badge} pulse={hotspotEngine.badge > 0}
              onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'hotspot' } }); openModal('hotspot') }} size={98} delay={3.4}
              className="animate-droplet-3" />
          </div>
        </div>

      <AnimatePresence>
        {modal === 'child' && (
          <ChildSheet key="child"
            childList={enrichedKids.length ? enrichedKids : kids}
            sel={activeKid}
            onSel={(c: any) => setActiveKid(c)}
            onClose={() => closeModal()}
            onAdd={() => openModal('addChild')}
            userId={userId}
            onStatusSaved={async () => {
              const list = await refreshKids()
              const id = activeKid?.id || localStorage.getItem('active_child_id')
              const next = list.find((c: any) => c.id === id) || list[0]
              if (next) setActiveKid(next)
            }} />
        )}
        {modal === 'todo' && (
          <TodoSheet key="todo" todos={displayTodos} onClose={() => closeModal()}
            onAction={(t: TodoItem) => { setOneTapTodo(t); openModal('oneTap') }}
            onDone={async (id: string) => { await markDone(id) }} />
        )}
        {modal === 'hotspot' && (
          <HotspotSheet key="hotspot" hotspots={hotspots}
            onClose={() => closeModal()}
            onPatrol={handlePatrol} patrolling={patrolling}
            onRead={handleRead} userId={userId} onSync={ctxSync} />
        )}
        {modal === 'addChild' && (
          <AddChildSheet key="add" onClose={() => closeModal()} onSave={handleAddChild} />
        )}
        {modal === 'oneTap' && oneTapTodo && (
          <TodoDetailModal
            reminder={{
              id: oneTapTodo.id, title: oneTapTodo.title,
              category: oneTapTodo.category,
              urgency_level: oneTapTodo.priority === 'red' ? 3 : oneTapTodo.priority === 'orange' ? 2 : 1,
              due_date: oneTapTodo.due_date, status: oneTapTodo.status,
              ai_action_data: oneTapTodo.ai_action_data,
            }}
            userId={userId}
            onClose={() => { setOneTapTodo(null); openModal('todo') }}
            onDone={handleMarkDone}
            onSnooze={handleSnooze} />
        )}
        {modal === 'input' && (
          <InputSheet key="input" onClose={() => closeModal()} userId={userId}
            onProcessing={() => setProcessStatus({ status: 'processing', message: '根正在整理中...' })} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {processStatus && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            onClick={() => {
              if (processStatus.status === 'done') {
                openModal('todo')
                setProcessStatus(null)
              }
            }}
            style={{ position: 'fixed', bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))', left: 16, right: 16, zIndex: 500,
              background: processStatus.status === 'done' ? 'rgba(29,158,117,0.95)'
                : processStatus.status === 'failed' ? 'rgba(220,38,38,0.95)'
                : 'rgba(45,63,74,0.95)',
              backdropFilter: 'blur(20px)', padding: '14px 20px', borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              cursor: processStatus.status === 'done' ? 'pointer' : 'default' }}>
            {processStatus.status === 'processing' && (
              <motion.div animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>🌱</motion.div>
            )}
            {processStatus.status === 'done' && <span>✓</span>}
            {processStatus.status === 'failed' && <span>⚠</span>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{processStatus.message}</div>
              {processStatus.status === 'done' && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>点击查看待办</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 宣纸噪点纹理层 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.015,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />

      {!keyboardOpen && <InstallPWA />}

      <TourGuide tourId="home" steps={HOME_TOUR} />
    </main>
  )
}
