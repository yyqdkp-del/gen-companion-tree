'use client'
import InstallPWA from '@/app/components/InstallPWA'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { createBrowserClient } from '@supabase/ssr'
import { useApp } from '@/app/context/AppContext'
import TodoSheet from '@/app/rian/TodoSheet'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  gold: '#B08D57',
  navy: '#1A3C5E',
  muted: '#6B8BAA',
}

type Child = {
  id: string; name: string; emoji: string; energy: number
  avatar_url?: string | null
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  today_schedule?: ScheduleItem[]; urgent_items?: UrgentItem[]
  packing_alerts?: PackingAlert[]
}
type ScheduleItem = { time: string; title: string; location?: string; requires_action?: string }
type UrgentItem = { title: string; level: 'red' | 'orange' | 'yellow' }
type PackingAlert = { item: string; level: 1 | 2 | 3 | 'today'; days_left?: number; need_buy: boolean }
type TodoItem = {
  id: string; title: string; priority: string; category?: string
  due_date?: string; ai_draft?: string; ai_action_type?: string
  one_tap_ready?: boolean; delegated_to?: string; status: string
  ai_action_data?: any
}
type HotspotItem = {
  id: string; category: string; urgency: string; title: string
  summary: string; relevance_reason?: string
  action_available?: boolean; action_type?: string
  action_data?: any; created_at: string; status: string
}

const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

function inferEnergy(health?: string, mood?: string): number {
  const hour = new Date().getHours()
  let base = hour >= 7 && hour <= 9 ? 80
    : hour >= 12 && hour <= 14 ? 65
    : hour >= 15 && hour <= 17 ? 85
    : hour >= 20 ? 45 : 75
  if (health === 'sick') base -= 35
  if (health === 'recovering') base -= 15
  if (mood === 'upset') base -= 20
  if (mood === 'anxious') base -= 10
  if (mood === 'happy') base += 10
  return Math.max(10, Math.min(100, base))
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

const COLORS: Record<string, any> = {
  calm:   { fill: 'rgba(154,183,232,0.38)', border: 'rgba(154,183,232,0.6)',  glow: 'rgba(154,183,232,0.35)' },
  yellow: { fill: 'rgba(255,210,80,0.48)',  border: 'rgba(255,200,60,0.75)',  glow: 'rgba(255,200,60,0.35)'  },
  orange: { fill: 'rgba(255,160,60,0.52)',  border: 'rgba(255,130,40,0.8)',   glow: 'rgba(255,130,40,0.4)'   },
  red:    { fill: 'rgba(255,100,100,0.55)', border: 'rgba(255,70,70,0.85)',   glow: 'rgba(255,70,70,0.45)'   },
}

function WaterDrop({ state, icon, label, value, badge, pulse, onClick, size = 96, delay = 0 }: {
  state: string; icon: React.ReactNode; label: string; value?: string
  badge?: number; pulse?: boolean; onClick: () => void; size?: number; delay?: number
}) {
  const c = COLORS[state] || COLORS.calm
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <motion.div
        onClick={onClick}
        animate={{ y: [0, -13, 0], x: [0, 3, -2, 0], rotate: [0, 1.2, -0.8, 0] }}
        transition={{ duration: 7, repeat: Infinity, delay, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}
        style={{ position: 'relative', cursor: 'pointer' }}
      >
        {pulse && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ position: 'absolute', inset: -12, borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%', background: c.glow }}
          />
        )}
        <div style={{
          width: size, height: size,
          backdropFilter: 'blur(20px)',
          border: `1.5px solid ${c.border}`,
          borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 33% 33%, rgba(255,255,255,0.42) 0%, ${c.fill} 100%)`,
          boxShadow: `inset 5px 5px 10px rgba(255,255,255,0.35), 8px 14px 28px rgba(0,0,0,0.08)`,
        }}>
          <div style={{ color: THEME.text, opacity: 0.75, marginBottom: 3 }}>{icon}</div>
          {value && <span style={{ fontSize: size > 100 ? 14 : 12, fontWeight: 600, color: THEME.text }}>{value}</span>}
          <span style={{ fontSize: 7.5, fontWeight: 700, color: THEME.text, opacity: 0.32, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
          {(badge ?? 0) > 0 && (
            <motion.div
              animate={{ scale: [1, 1.35, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ position: 'absolute', top: 9, right: 11, width: 10, height: 10, borderRadius: '50%', background: state === 'red' ? '#FF3333' : state === 'orange' ? '#FF8000' : '#E6B800', border: '2px solid white' }}
            />
          )}
          <div style={{ position: 'absolute', top: 13, left: 18, width: 15, height: 7, background: 'rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
        </div>
      </motion.div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: THEME.text, opacity: 0.55 }}>{label}</span>
    </div>
  )
}

function BottomSheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(40px)', borderRadius: '28px 28px 0 0', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 -10px 60px rgba(0,0,0,0.14)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: THEME.text }}>{title}</h2>
          <motion.div whileTap={{ scale: 0.85 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }}><X size={20} /></motion.div>
        </div>
        <div style={{ padding: '16px 20px 52px' }}>{children}</div>
      </motion.div>
    </motion.div>
  )
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
      const path = `children/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      setAvatarUrl(urlData.publicUrl)
    } catch (e) { console.error('上传失败', e) }
    finally { setUploading(false) }
  }

  return (
    <BottomSheet onClose={onClose} title="添加孩子">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <div onClick={() => photoInputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'rgba(176,141,87,0.08)', border: '2px dashed rgba(176,141,87,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
            {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : uploading ? <Loader size={20} color={THEME.gold} />
              : <div style={{ textAlign: 'center' }}><Camera size={20} color={THEME.gold} /><div style={{ fontSize: 9, color: THEME.gold, marginTop: 3 }}>上传照片</div></div>}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>或选择头像</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {emojis.map(e => (
              <motion.div key={e} whileTap={{ scale: 0.88 }} onClick={() => { setEmoji(e); setAvatarUrl(null) }}
                style={{ width: 36, height: 36, borderRadius: '50%', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: emoji === e && !avatarUrl ? 'rgba(176,141,87,0.14)' : 'rgba(0,0,0,0.04)', border: emoji === e && !avatarUrl ? '2px solid rgba(176,141,87,0.5)' : '2px solid transparent', cursor: 'pointer' }}>
                {e}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {[
        { label: '孩子名字 *', val: name, set: setName, ph: '英文名或中文名' },
        { label: '学校名称', val: school, set: setSchool, ph: 'Lanna International School' },
        { label: '年级班级', val: grade, set: setGrade, ph: 'Grade 2 / 小学二年级' },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>{f.label}</div>
          <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.55)', fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      ))}
      <motion.button whileTap={{ scale: 0.97 }} disabled={!name.trim() || saving}
        onClick={async () => {
          setSaving(true)
          await onSave({ name: name.trim(), emoji, school_name: school, grade, avatar_url: avatarUrl })
          setSaving(false)
          onClose()
        }}
        style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: name.trim() ? THEME.navy : 'rgba(0,0,0,0.08)', color: name.trim() ? '#fff' : THEME.muted, fontSize: 14, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {saving ? <Loader size={16} /> : null}{saving ? '保存中…' : '添加孩子'}
      </motion.button>
      {/* 新增：保存后跳转提示 */}
<div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: THEME.muted }}>
  保存后可前往「孩子资料」补充课程表和健康信息
</div>
    </BottomSheet>
  )
}

function InputSheet({ onClose, userId, onProcessing }: { onClose: () => void; userId: string; onProcessing?: () => void }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), input_type: 'text', user_id: userId })
      })
      onClose()
      onProcessing?.()
    } catch (e) { console.error(e) }
    setSending(false)
  }
  return (
    <BottomSheet onClose={onClose} title="告诉根">
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="说什么都行，根来帮你整理…"
        style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.55)', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
      <motion.button whileTap={{ scale: 0.97 }} disabled={!text.trim() || sending} onClick={handleSend}
        style={{ width: '100%', marginTop: 12, padding: '14px', borderRadius: 16, border: 'none', background: text.trim() ? THEME.navy : 'rgba(0,0,0,0.08)', color: text.trim() ? '#fff' : THEME.muted, fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
        {sending ? '发送中…' : '发送给根 →'}
      </motion.button>
    </BottomSheet>
  )
}

// ── 主页面 ──
export default function BasePage() {
 const { userId, kids, todos, hotspots, loading, sync: ctxSync, processStatus, setProcessStatus } = useApp()
  const [time, setTime] = useState(new Date())
  const [selKid, setSelKid] = useState<Child | null>(null)
  const [modal, setModal] = useState<'child' | 'todo' | 'hotspot' | 'addChild' | 'oneTap' | 'input' | null>(null)
  const [oneTapTodo, setOneTapTodo] = useState<TodoItem | null>(null)
  const [patrolling, setPatrolling] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // ── 孩子详情补全 ──
  const enrichKids = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0]
    const dow = new Date().getDay()
    const { data: childData } = await supabase.from('children').select('*').eq('user_id', uid)
    if (!childData?.length) return
    const enriched: Child[] = await Promise.all(childData.map(async (c: any) => {
      const [logRes, schedRes, evtRes] = await Promise.all([
        supabase.from('child_daily_log').select('*').eq('child_id', c.id).eq('user_id', uid).eq('date', today).single(),
        supabase.from('child_schedule_template').select('*').eq('child_id', c.id).eq('day_of_week', dow).order('period_start'),
        supabase.from('child_school_calendar').select('*').eq('child_id', c.id).eq('user_id', uid).eq('date_start', today),
      ])
      const log = logRes.data
      const energy = c.energy || inferEnergy(log?.health_status, log?.mood_status)
      const today_schedule: ScheduleItem[] = [
        ...(schedRes.data || []).map((s: any) => ({
          time: s.period_start?.substring(0, 5) || '',
          title: s.subject, location: s.location,
          requires_action: s.requires_items?.length ? `带：${s.requires_items.join('、')}` : undefined
        })),
        ...(evtRes.data || []).map((e: any) => ({ time: '', title: e.title, requires_action: e.requires_action }))
      ].sort((a, b) => a.time.localeCompare(b.time))
      return {
        id: c.id, name: c.name || c.nickname || '孩子', emoji: c.emoji || '👶🏻',
        avatar_url: c.avatar_url || null,
        energy, health_status: log?.health_status || 'normal', mood_status: log?.mood_status || 'calm',
        school_name: c.school_name, grade: c.grade, today_schedule,
      }
    }))
    setSelKid(prev => prev ? enriched.find(c => c.id === prev.id) || enriched[0] : enriched[0])
  }, [])

  useEffect(() => { if (userId) enrichKids(userId) }, [userId, enrichKids])

  useEffect(() => {
    setMounted(true)
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])
  useEffect(() => {
  const handleResize = () => {
    const currentHeight = window.visualViewport?.height || window.innerHeight
    const screenHeight = window.screen.height
    setKeyboardOpen(currentHeight < screenHeight * 0.75)
  }
  window.visualViewport?.addEventListener('resize', handleResize)
  return () => window.visualViewport?.removeEventListener('resize', handleResize)
}, [])

  // ── 待办操作 ──
  const markDone = async (id: string) => {
    await supabase.from('todo_items').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
    ctxSync()
  }

  const snooze = async (id: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('todo_items').update({ due_date: tomorrow.toISOString().split('T')[0] }).eq('id', id)
    ctxSync()
  }

  // ── 孩子操作 ──
 const handleAddChild = async (d: any) => {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return
  const { data: newChild } = await supabase.from('children').insert({
    user_id: uid, name: d.name, emoji: d.emoji || '👶🏻',
    avatar_url: d.avatar_url || null,
    energy: 75, status: 'active', school_name: d.school_name, grade: d.grade
  }).select().single()
  await ctxSync()
  setModal(null)
  if (newChild?.id) window.location.href = `/children/${newChild.id}?from=quick`
}

  // ── 热点操作 ──
const handleRead = async (id: string) => {
  await supabase.from('hotspot_items').update({ status: 'read' }).eq('id', id)
}

  const handlePatrol = async () => {
    setPatrolling(true)
    try {
      await fetch('/api/base/patrol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      setTimeout(() => { ctxSync(); setPatrolling(false) }, 3000)
    } catch { setPatrolling(false) }
  }

  const cState = dropState('child', selKid)
  const tState = dropState('todo', todos)
  const hState = dropState('hotspot', hotspots)
  const redCount = todos.filter(t => t.priority === 'red').length
  const unread = hotspots.filter(h => h.status === 'unread').length
  const childUrgent = (selKid?.urgent_items || []).filter(i => i.level === 'red').length
  const hour = time.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  return (
    <main style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: THEME.bg, fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', top: '12%', right: '-4%', fontSize: 'clamp(60px, 18vw, 130px)', fontWeight: 'bold', color: THEME.text, opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1, userSelect: 'none' }}>根·陪伴</div>

      {/* 左上角孩子头像 */}
      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 100 }}>
        {kids.length > 0 ? (
          <div>
            <motion.div onClick={() => setModal('child')}
              animate={{ boxShadow: [`0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`, `0 0 35px ${getEnergyColor(selKid?.energy ?? 75)}80`, `0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer', fontSize: 34 }}>
              {selKid?.avatar_url
    ? <img src={selKid.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : selKid?.emoji || '👶🏻'
  }
            </motion.div>
            <p style={{ marginTop: 8, fontSize: 10, color: THEME.text, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center' }}>{selKid?.name}</p>
            <div style={{ width: 56, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '3px auto', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${selKid?.energy ?? 75}%` }} style={{ height: '100%', background: getEnergyColor(selKid?.energy ?? 75) }} />
            </div>
          </div>
        ) : (
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setModal('addChild')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', border: '2px dashed rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🌱</div>
            <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, letterSpacing: '0.15em' }}>添加孩子</span>
          </motion.div>
        )}
      </div>

      {/* 右上角时钟 */}
      <header style={{ position: 'absolute', top: '5%', right: '6%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: 'clamp(48px, 15vw, 76px)', fontWeight: 100, color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {mounted ? `${time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}` : '--:--'}
        </h1>
        <p style={{ fontSize: 10, color: THEME.text, opacity: 0.35, letterSpacing: '0.25em', marginTop: 3 }}>
          {mounted ? greeting : ''}
        </p>
      </header>

      {/* 水珠 */}
      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontSize: 13, color: THEME.text, opacity: 0.4, letterSpacing: '0.2em' }}>根·启动中…</motion.div>
        </div>
      ) : (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(20px, 5vw, 36px)' }}>
          <WaterDrop state={cState} icon={<Heart size={24} />} label="孩子" value={selKid ? `${selKid.energy}%` : '—'} badge={childUrgent} pulse={childUrgent > 0} onClick={() => setModal('child')} size={124} delay={0} />
          <div style={{ display: 'flex', gap: 'clamp(28px, 8vw, 52px)', alignItems: 'center' }}>
            <WaterDrop state={tState} icon={<Bell size={20} />} label="待办" value={todos.filter(t => t.status !== 'done').length > 0 ? `${todos.filter(t => t.status !== 'done').length}条` : '静默'} badge={redCount} pulse={redCount > 0} onClick={() => setModal('todo')} size={98} delay={1.8} />
            <WaterDrop state={hState} icon={patrolling ? <Loader size={20} /> : <Zap size={20} />} label="热点" value={unread > 0 ? `${unread}条` : '根'} badge={unread} pulse={unread > 0} onClick={() => setModal('hotspot')} size={98} delay={3.4} />
          </div>
        </div>
      )}

      {/* 弹窗 */}
      <AnimatePresence>
     {modal === 'child' && (
  <ChildSheet
    key="child"
    children={kids}
    sel={selKid}
    onSel={c => setSelKid(c)}
    onClose={() => setModal(null)}
    onAdd={() => setModal('addChild')}
    userId={userId}
  />
)}
        {modal === 'todo' && (
          <TodoSheet key="todo" todos={todos} onClose={() => setModal(null)} onAction={t => {
            setOneTapTodo(t)
            setModal('oneTap')
          }} />
        )}
       {modal === 'hotspot' && (
          <HotspotSheet
            key="hotspot"
            hotspots={hotspots}
            onClose={() => setModal(null)}
            onPatrol={handlePatrol}
            patrolling={patrolling}
            onRead={handleRead}
            userId={userId}
            onSync={ctxSync}
          />
        )}
        {modal === 'addChild' && (
          <AddChildSheet key="add" onClose={() => setModal(null)} onSave={handleAddChild} />
        )}
        {modal === 'oneTap' && oneTapTodo && (
          <TodoDetailModal
            reminder={{
              id: oneTapTodo.id,
              title: oneTapTodo.title,
              category: oneTapTodo.category,
              urgency_level: oneTapTodo.priority === 'red' ? 3 : oneTapTodo.priority === 'orange' ? 2 : 1,
              due_date: oneTapTodo.due_date,
              status: oneTapTodo.status,
              ai_action_data: oneTapTodo.ai_action_data,
            }}
            userId={userId}
            onClose={() => { setOneTapTodo(null); setModal('todo') }}
            onDone={async (id) => { await markDone(id); setModal(null) }}
            onSnooze={async (id) => { await snooze(id); setModal(null) }}
          />
        )}
        {modal === 'input' && (
  <InputSheet
    key="input"
    onClose={() => setModal(null)}
    userId={userId}
    onProcessing={() => setProcessStatus({ status: 'processing', message: '根正在整理中...' })}
  />
)}
      </AnimatePresence>
      <AnimatePresence>
  {processStatus && (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      onClick={() => {
        if (processStatus.status === 'done') {
          setModal('todo')
          setProcessStatus(null)
        }
      }}
      style={{
        position: 'fixed',
        bottom: 90,
        left: 16, right: 16,
        zIndex: 500,
        background: processStatus.status === 'done'
          ? 'rgba(29,158,117,0.95)'
          : processStatus.status === 'failed'
          ? 'rgba(220,38,38,0.95)'
          : 'rgba(26,60,94,0.95)',
        backdropFilter: 'blur(20px)',
        padding: '14px 20px',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        cursor: processStatus.status === 'done' ? 'pointer' : 'default',
      }}
    >
      {processStatus.status === 'processing' && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          🌱
        </motion.div>
      )}
      {processStatus.status === 'done' && <span>✓</span>}
      {processStatus.status === 'failed' && <span>⚠</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          {processStatus.message}
        </div>
        {processStatus.status === 'done' && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            点击查看待办
          </div>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
      <InstallPWA />
      {!keyboardOpen && <InstallPWA />}
    </main>
  )
}
