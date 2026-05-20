'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import InstallPWA from '@/app/components/InstallPWA'
import React, { useEffect, useState, useRef, useCallback } from 'react'
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
import type { Child, TodoItem, HotspotItem } from '@/app/_shared/_types'
import { useChildData } from '@/app/_shared/_hooks/useChildData'
import { useTodoActions } from '@/app/_shared/_hooks/useTodoActions'
import { useTodoEngine } from '@/app/_shared/_hooks/useTodoEngine'
import { useHotspotEngine } from '@/app/_shared/_hooks/useHotspotEngine'
import { track } from '@/lib/analytics/track'
import { addChild } from '@/app/_shared/_services/childService'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { sanitizeFileName } from '@/lib/storage/sanitizeFileName'

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
  if (type === 'todo') {
    if (!data?.length) return 'calm'
    if (data.some((t: TodoItem) => t.priority === 'red')) return 'red'
    if (data.some((t: TodoItem) => t.priority === 'orange')) return 'orange'
    if (data.some((t: TodoItem) => t.priority === 'yellow')) return 'yellow'
    return 'calm'
  }
  if (type === 'hotspot') {
    if (!data?.length) return 'calm'
    if (data.some((h: HotspotItem) => h.urgency === 'urgent')) return 'red'
    if (data.some((h: HotspotItem) => h.urgency === 'important')) return 'orange'
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

export default function BasePage() {
  const { userId, kids, todos, hotspots, loading, sync: ctxSync,
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

  const { enrichedKids, refresh: refreshKids } = useChildData(userId)
  const { markDone, snooze } = useTodoActions(todos, ctxSync)
  const todoEngine = useTodoEngine(todos)
  const hotspotEngine = useHotspotEngine(hotspots)

  useEffect(() => {
    if (enrichedKids.length) {
      const storedId = localStorage.getItem('active_child_id')
      const current = enrichedKids.find((c: any) => c.id === storedId) || enrichedKids[0]
      setActiveKid(current)
    }
  }, [enrichedKids, setActiveKid])

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
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error('巡逻失败')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        if (!logOrAlertNetworkError(e)) alert('刷新失败，请重试')
      }
    } finally {
      patrolTimerRef.current = setTimeout(() => {
        ctxSync()
        setPatrolling(false)
        patrolTimerRef.current = null
      }, 1000)
    }
  }

  // 孩子水珠状态来自 dropState；待办/热点状态来自 todoEngine/hotspotEngine
  const childState = dropState('child', activeKid)
  const redCount = todos.filter((t: TodoItem) => t.priority === 'red').length
  const unread = hotspots.filter((h: HotspotItem) => h.status === 'unread').length
  const childUrgent = (activeKid?.urgent_items || [])
    .filter((i: { level: string }) => i.level === 'red').length

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
      {showOnboarding && (
        <Onboarding onComplete={() => {
          setShowOnboarding(false)
          localStorage.setItem('onboarding_completed', 'true')
        }} />
      )}

      {mounted && greeting && (
        <div style={{
          position: 'fixed',
          top: 'max(52px, env(safe-area-inset-top, 52px))',
          left: '6%',
          zIndex: 10,
        }}>
          <div style={{
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 300,
            fontSize: 'clamp(22px, 5.5vw, 28px)',
            color: '#2d322f',
            letterSpacing: '0.03em',
            lineHeight: 1.4,
          }}>
            {greeting.text}
          </div>
          <div style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 400,
            fontSize: 11,
            color: 'rgba(45, 50, 47, 0.45)',
            letterSpacing: '0.2em',
            marginTop: 6,
            textTransform: 'uppercase',
          }}>
            {greeting.sub}
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: '12%', right: '-4%',
        fontSize: 'clamp(60px, 18vw, 130px)', fontWeight: 'bold',
        color: THEME.text, opacity: 0.07, pointerEvents: 'none',
        fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1, userSelect: 'none' }}>
        根·陪伴
      </div>

      <ChildAvatar />

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

      {loading ? (
        <div style={{ position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontSize: 13, color: THEME.text, opacity: 0.4, letterSpacing: '0.2em' }}>
            根·启动中…
          </motion.div>
        </div>
      ) : (
        <div style={{ position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(20px, 5vw, 36px)' }}>
          <WaterDrop state={childState} icon={<Heart size={24} />} label="孩子"
            value={activeKid ? `${activeKid.energy ?? 75}%` : '—'}
            badge={childUrgent} pulse={childUrgent > 0}
            onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'child' } }); openModal('child') }} size={124} delay={0}
            className="animate-droplet-1" />
          <div style={{ display: 'flex', gap: 'clamp(28px, 8vw, 52px)', alignItems: 'center' }}>
            <WaterDrop state={todoEngine.state} icon={<Bell size={20} />} label="待办"
              value={todoEngine.badge > 0 ? `${todoEngine.badge}条` : '静默'}
              badge={todoEngine.badge} pulse={todoEngine.badge > 0}
              onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'todo' } }); openModal('todo') }} size={98} delay={1.8}
              className="animate-droplet-2" />
            <WaterDrop state={hotspotEngine.state}
              icon={patrolling ? <Loader size={20} /> : <Zap size={20} />}
              label="热点" value={hotspotEngine.badge > 0 ? `${hotspotEngine.badge}条` : '根'}
              badge={hotspotEngine.badge} pulse={hotspotEngine.badge > 0}
              onClick={() => { void track({ event_type: 'droplet_click', meta: { type: 'hotspot' } }); openModal('hotspot') }} size={98} delay={3.4}
              className="animate-droplet-3" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {modal === 'child' && (
          <ChildSheet key="child"
            children={enrichedKids.length ? enrichedKids : kids}
            sel={activeKid}
            onSel={(c: any) => setActiveKid(c)}
            onClose={() => closeModal()}
            onAdd={() => openModal('addChild')}
            userId={userId} />
        )}
        {modal === 'todo' && (
          <TodoSheet key="todo" todos={todos} onClose={() => closeModal()}
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
            style={{ position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 500,
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
    </main>
  )
}
