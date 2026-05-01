'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import VoiceBtn from '@/app/components/VoiceBtn'
import PackCheckItem from '@/app/components/PackCheckItem'
import ChildActionSheet, { ChildEvent } from '@/app/rian/ChildActionSheet'


const THEME = { text: '#2C3E50', gold: '#B08D57', muted: '#6B8BAA', navy: '#1A3C5E' }
const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56' }

type Child = {
  id: string; name: string; emoji: string; energy: number
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  urgent_items?: { title: string; level: 'red' | 'orange' | 'yellow' }[]
}
type TimelineItem = {
  id: string; time: string; end_time?: string; title: string
  type: 'class' | 'activity' | 'medical' | 'special' | 'extracurricular'
  source: 'schedule' | 'calendar' | 'health' | 'profile'
  event?: any
}
type DailyLog = { id?: string; health_status: string; mood_status: string }
type Props = {
  children: Child[]; sel: Child | null; onSel: (c: Child) => void
  onClose: () => void; onAdd: () => void; userId: string
  todos?: any[]; onOneTap?: (todo: any) => void
}

const healthOptions = [
  { value: 'normal',     label: '健康',   color: G.dark,    bg: G.bg },
  { value: 'recovering', label: '恢复中', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  { value: 'sick',       label: '生病中', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
]
const moodOptions = [
  { value: 'happy',   label: '开心', emoji: '😊', color: '#D97706' },
  { value: 'calm',    label: '平静', emoji: '😌', color: G.dark },
  { value: 'anxious', label: '焦虑', emoji: '😟', color: '#7C3AED' },
  { value: 'upset',   label: '低落', emoji: '😔', color: '#6B8BAA' },
]
const eventTypeEmoji: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉', meeting: '👨‍👩‍👧',
  class: '📚', trip: '🚌', medical: '🏥', extracurricular: '🎨', other: '📌',
}

function getTodayKey() { return new Date().toISOString().split('T')[0] }
function getTomorrow() { return new Date(Date.now() + 86400000).toISOString().split('T')[0] }
function getIn7Days() { return new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }
function getIn30Days() { return new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] }
function getEnergyColor(v: number) { return v > 70 ? G.deep : v > 40 ? '#FACC15' : '#FB7185' }
function formatDate(d: string) {
  const date = new Date(d), today = new Date(), tmr = new Date(today)
  tmr.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tmr.toDateString()) return '明天'
  return ['周日','周一','周二','周三','周四','周五','周六'][date.getDay()] + ` ${date.getMonth()+1}/${date.getDate()}`
}

function inferEnergy(health: string, mood: string, items: TimelineItem[]): number {
  const hour = new Date().getHours()
  let base = hour < 7 ? 50 : hour < 10 ? 80 : hour < 12 ? 75
    : hour < 14 ? 60 : hour < 17 ? 85 : hour < 20 ? 70 : 45
  if (health === 'sick') base -= 35
  else if (health === 'recovering') base -= 15
  if (mood === 'upset') base -= 20
  else if (mood === 'anxious') base -= 10
  else if (mood === 'happy') base += 10
  if (items.filter(i => i.type === 'class').length > 5) base -= 10
  if (items.some(i => i.title.includes('考试') || i.title.includes('exam'))) base -= 15
  if (items.some(i => i.type === 'medical')) base -= 5
  if (items.some(i => i.title.includes('体育') || i.title.includes('PE'))) base += 5
  return Math.max(10, Math.min(100, Math.round(base)))
}

// ── 手风琴 ──
function Accordion({ title, count, children, defaultOpen = false, badge }: {
  title: string; count?: number; children: React.ReactNode
  defaultOpen?: boolean; badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 8 }}>
      <motion.div whileTap={{ scale: 0.98 }} onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', cursor: 'pointer',
          borderRadius: open ? '12px 12px 0 0' : 12,
          background: open ? 'rgba(176,141,87,0.06)' : 'rgba(0,0,0,0.02)',
          border: `0.5px solid ${open ? 'rgba(176,141,87,0.2)' : 'rgba(0,0,0,0.06)'}`,
          transition: 'all 0.18s',
        }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: open ? THEME.gold : THEME.text, flex: 1 }}>
          {title}
        </span>
        {badge && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: 'rgba(255,100,100,0.1)', color: '#DC2626', fontWeight: 600 }}>
            {badge}
          </span>
        )}
        {count !== undefined && (
          <span style={{ fontSize: 10, color: THEME.muted }}>{count}项</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} color={open ? THEME.gold : THEME.muted} />
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden', background: 'rgba(255,255,255,0.8)',
              border: '0.5px solid rgba(176,141,87,0.15)',
              borderTop: 'none', borderRadius: '0 0 12px 12px',
            }}>
            <div style={{ padding: '10px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── 时间轴 ──
function Timeline({ items }: { items: TimelineItem[] }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const sorted = [...items].sort((a, b) => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
    return toMin(a.time) - toMin(b.time)
  })
  if (!sorted.length) return (
    <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
      今天没有课程安排
    </div>
  )
  return (
    <div style={{ position: 'relative', paddingLeft: 30 }}>
      <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6,
        width: 2, background: 'linear-gradient(180deg,#A7D7D9,#D9A7B4)', borderRadius: 1 }} />
      {sorted.map((item, i) => {
        const [h, m] = item.time.split(':').map(Number)
        const itemMin = h * 60 + (m || 0)
        const isPast = itemMin + 45 < nowMin
        const isCurrent = itemMin <= nowMin && itemMin + 45 > nowMin
        return (
          <div key={item.id} style={{ position: 'relative', marginBottom: i < sorted.length - 1 ? 8 : 0 }}>
            <div style={{
              position: 'absolute', left: -24, top: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: isCurrent ? THEME.gold : isPast ? 'rgba(0,0,0,0.15)' : G.mid,
              boxShadow: isCurrent ? `0 0 0 4px rgba(176,141,87,0.2)` : 'none',
            }} />
            <div style={{
              padding: '6px 10px', borderRadius: 9,
              background: isCurrent ? 'rgba(176,141,87,0.08)' : isPast ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.7)',
              border: `0.5px solid ${isCurrent ? 'rgba(176,141,87,0.25)' : 'rgba(0,0,0,0.05)'}`,
              opacity: isPast ? 0.55 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: isCurrent ? THEME.gold : THEME.muted,
                  fontWeight: isCurrent ? 600 : 400, minWidth: 32, flexShrink: 0 }}>
                  {item.time}
                </span>
                <span style={{ fontSize: 13 }}>{eventTypeEmoji[item.type] || '📌'}</span>
                <span style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? THEME.text : isPast ? THEME.muted : THEME.text, flex: 1 }}>
                  {item.title}
                </span>
                {isCurrent && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8,
                    background: THEME.gold, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                    进行中
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 携带物品+习惯 ──
function PackingSection({ childId, userId, events, eventType }: {
  childId: string; userId: string; events: any[]; eventType: string
}) {
  const today = getTodayKey()
  const storageKey = `packing_${childId}_${today}`
  const [extraInput, setExtraInput] = useState('')
  const [extraItems, setExtraItems] = useState<string[]>([])
  const [askHabit, setAskHabit] = useState<string | null>(null)

  const baseItems = [...new Set(events.flatMap(e =>
    Array.isArray(e.requires_items) ? e.requires_items : []
  ))]
  const allItems = [...new Set([...baseItems, ...extraItems])]

  const saveHabit = async (item: string, pref: 'always' | 'never') => {
    try {
      await supabase.from('child_packing_habits').upsert({
        user_id: userId, child_id: childId,
        event_type: eventType, item_name: item, preference: pref,
      }, { onConflict: 'child_id,event_type,item_name' })
    } catch {}
    setAskHabit(null)
  }

  const addExtra = () => {
    const trimmed = extraInput.trim()
    if (!trimmed) return
    setExtraItems(prev => [...prev, trimmed])
    setExtraInput('')
    setAskHabit(trimmed)
  }

  if (!allItems.length && !extraInput && !extraItems.length) return (
    <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
      今天没有需要携带的物品
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {allItems.map((item, i) => (
          <PackCheckItem key={i} item={item} storageKey={storageKey}
            itemKey={`${eventType}-${item}`} size="md" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={extraInput} onChange={e => setExtraInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addExtra()}
          placeholder="添加其他物品..."
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
            border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)',
            color: THEME.text, outline: 'none' }} />
        <motion.button whileTap={{ scale: 0.88 }} onClick={addExtra}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none',
            background: G.dark, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          添加
        </motion.button>
      </div>
      <AnimatePresence>
        {askHabit && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: G.bg, border: `0.5px solid ${G.border}` }}>
            <div style={{ fontSize: 11, color: G.dark, marginBottom: 6 }}>
              「{askHabit}」下次也要提醒吗？
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => saveHabit(askHabit, 'always')}
                style={{ flex: 1, padding: '5px', borderRadius: 7, border: `0.5px solid ${G.mid}`,
                  background: G.bg, color: G.dark, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                是，下次提醒
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => saveHabit(askHabit, 'never')}
                style={{ flex: 1, padding: '5px', borderRadius: 7, border: '0.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent', color: THEME.muted, fontSize: 11, cursor: 'pointer' }}>
                只用这次
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── 日程摘要列表 ──
function EventList({ events, onSelect }: { events: any[]; onSelect: (e: any) => void }) {
  if (!events.length) return (
    <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
      暂无安排
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {events.map((event, i) => (
        <motion.div key={i} whileTap={{ scale: 0.97 }} onClick={() => onSelect(event)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 10, background: 'rgba(255,255,255,0.7)',
            border: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.title}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
              {event.date_start && formatDate(event.date_start)}
              {event.requires_payment ? ` · 💰฿${event.requires_payment}` : ''}
              {event.requires_action ? ' · ⚠需行动' : ''}
            </div>
          </div>
          <ChevronRight size={13} color={THEME.muted} style={{ flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  )
}

// ── 健康心情编辑器（居中弹出）──
function StatusEditor({ log, onSave, onClose }: {
  log: DailyLog; onSave: (h: string, m: string) => void; onClose: () => void
}) {
  const [health, setHealth] = useState(log.health_status || 'normal')
  const [mood, setMood] = useState(log.mood_status || 'calm')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', padding: 20 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>今天状态</div>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.4 }}>
            <X size={18} />
          </motion.div>
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>健康状态</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {healthOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setHealth(o.value)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                background: health === o.value ? o.bg : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${health === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                fontSize: 13, fontWeight: health === o.value ? 600 : 400,
                color: health === o.value ? o.color : THEME.muted, transition: 'all 0.15s' }}>
              {o.label}
            </motion.div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>今日心情</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
          {moodOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setMood(o.value)}
              style={{ padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: mood === o.value ? `${o.color}12` : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${mood === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                transition: 'all 0.15s' }}>
              <span style={{ fontSize: 20 }}>{o.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: mood === o.value ? 600 : 400,
                color: mood === o.value ? o.color : THEME.muted }}>{o.label}</span>
            </motion.div>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSave(health, mood)}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: THEME.navy, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          保存
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ══ 主组件 ══
export default function ChildSheet({ children, sel, onSel, onClose, onAdd, userId }: Props) {
  const today = getTodayKey()
  const tomorrow = getTomorrow()
  const in7days = getIn7Days()
  const in30days = getIn30Days()

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [dailyLog, setDailyLog] = useState<DailyLog>({ health_status: 'normal', mood_status: 'calm' })
  const [computedEnergy, setComputedEnergy] = useState(75)
  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<ChildEvent | null>(null)

  const handleSel = useCallback((c: Child) => {
    onSel(c)
    setTimeline([])
    setCalendar([])
    setDailyLog({ health_status: c.health_status || 'normal', mood_status: c.mood_status || 'calm' })
  }, [onSel])

  useEffect(() => {
    if (!sel?.id) return
    supabase.from('child_daily_log').select('id, health_status, mood_status')
      .eq('child_id', sel.id).eq('date', today).maybeSingle()
      .then(({ data }) => {
        if (data) setDailyLog(data)
        else setDailyLog({ health_status: sel.health_status || 'normal', mood_status: sel.mood_status || 'calm' })
      })
  }, [sel?.id])

  useEffect(() => {
    if (!sel?.id) return
    setScheduleLoading(true)
    const dow = new Date().getDay()
    const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]

    Promise.all([
  supabase.from('child_profiles').select('class_schedule, activities').eq('child_id', sel.id).single(),  // ← 新第一个
  supabase.from('child_school_calendar').select('*').eq('child_id', sel.id).gte('date_start', today).lte('date_start', yearEnd).order('date_start'),
  supabase.from('child_health_records').select('*').eq('child_id', sel.id).eq('follow_up_date', today),
]).then(([profileRes, calRes, healthRes]) => {
  const schedData = profileRes.data
  const calData = calRes.data || []
  const healthData = healthRes.data || []
  const activities = schedData?.activities || []

      const items: TimelineItem[] = []

     const dow = new Date().getDay()
const dowKey = ['sun','mon','tue','wed','thu','fri','sat'][dow]
const daySchedule = schedData?.class_schedule?.[dowKey] || []
daySchedule.forEach((item: any, i: number) => {
  const isObject = typeof item === 'object'
  items.push({
    id: `sched_${i}`,
    time: isObject ? item.time : '08:00',
    title: isObject ? item.subject : item,
    type: 'class',
    source: 'schedule',
    event: item,
  })
})

      calData.filter((e: any) => e.date_start === today).forEach((e: any) => {
        const timeMatch = (e.description || e.title || '').match(/(\d{1,2}):(\d{2})/)
        items.push({ id: `cal_${e.id}`,
          time: timeMatch ? `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}` : '08:00',
          title: e.title, type: 'special', source: 'calendar', event: e })
      })

      healthData.forEach((h: any) => {
        items.push({ id: `health_${h.id}`, time: '09:00',
          title: `复诊：${h.description || h.type}`,
          type: 'medical', source: 'health', event: h })
      })

      if (Array.isArray(activities)) {
        activities.forEach((a: any, i: number) => {
          if (a.day_of_week === dow || a.day === dow) {
            items.push({ id: `act_${i}`, time: a.time || a.start_time || '15:00',
              end_time: a.end_time, title: a.name || a.title,
              type: 'extracurricular', source: 'profile', event: a })
          }
        })
      }

      setTimeline(items)
      setCalendar(calData)
      setComputedEnergy(inferEnergy(dailyLog.health_status, dailyLog.mood_status, items))
      setScheduleLoading(false)
    })
  }, [sel?.id, dailyLog.health_status, dailyLog.mood_status])

  const saveStatus = useCallback(async (health: string, mood: string) => {
    if (!sel?.id) return
    const payload = { child_id: sel.id, date: today, health_status: health, mood_status: mood, updated_at: new Date().toISOString() }
    if (dailyLog.id) {
      await supabase.from('child_daily_log').update(payload).eq('id', dailyLog.id)
    } else {
      const { data } = await supabase.from('child_daily_log').insert({ ...payload, user_id: userId }).select().single()
      if (data) setDailyLog(d => ({ ...d, id: data.id }))
    }
    setDailyLog(prev => ({ ...prev, health_status: health, mood_status: mood }))
    setShowStatusEditor(false)
  }, [sel?.id, dailyLog.id, userId, today])

  const todayEvents = calendar.filter(e => e.date_start === today)
  const todayPackEvents = [...todayEvents, ...timeline.filter(t => t.source === 'schedule').map(t => t.event || {})]
  const eveningEvents = calendar.filter(e => e.date_start === tomorrow)
  const tomorrowPack = [...new Set(eveningEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))]
  const weekEvents = calendar.filter(e => e.date_start > tomorrow && e.date_start <= in7days)
  const monthEvents = calendar.filter(e => e.date_start > in7days && e.date_start <= in30days)
  const yearEvents = calendar.filter(e => e.date_start > in30days)
  const todayMainEventType = todayEvents[0]?.event_type || 'class'
  const todayPackCount = [...new Set(todayPackEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))].length

  const currentHealth = healthOptions.find(o => o.value === dailyLog.health_status) || healthOptions[0]
  const currentMood = moodOptions.find(o => o.value === dailyLog.mood_status) || moodOptions[1]

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px)',
            borderRadius: 22, overflow: 'hidden',
            maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

          <div style={{ height: 4, background: 'linear-gradient(90deg,#A7D7D9,#D9A7B4)', flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          <div style={{ padding: '8px 14px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>孩子</span>
            <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
              <X size={18} color={THEME.muted} />
            </motion.div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px 20px', WebkitOverflowScrolling: 'touch' as any }}>

            {/* 孩子头像横排 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {children.map(c => (
                <motion.div key={c.id} whileTap={{ scale: 0.88 }} onClick={() => handleSel(c)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: c.id === sel?.id ? 52 : 40, height: c.id === sel?.id ? 52 : 40,
                    borderRadius: '50%', background: 'rgba(176,141,87,0.08)',
                    border: `2px solid ${c.id === sel?.id ? THEME.gold : 'transparent'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: c.id === sel?.id ? 28 : 22, transition: 'all 0.18s',
                    boxShadow: c.id === sel?.id ? '0 0 0 3px rgba(176,141,87,0.18)' : 'none' }}>
                    {c.emoji}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: c.id === sel?.id ? 700 : 400,
                    color: c.id === sel?.id ? THEME.gold : THEME.muted }}>
                    {c.name}
                  </span>
                </motion.div>
              ))}
              <motion.div whileTap={{ scale: 0.88 }} onClick={onAdd}
                style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px dashed rgba(0,0,0,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: THEME.muted }}>
                <Plus size={14} />
              </motion.div>
            </div>

            {!sel ? (
              <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 14, color: THEME.text }}>
                选择孩子查看状态
              </div>
            ) : (
              <>
                {/* 状态行 */}
                <motion.div whileTap={{ scale: 0.98 }} onClick={() => setShowStatusEditor(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                    padding: '9px 11px', borderRadius: 12,
                    background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{sel.name}</div>
                    <div style={{ fontSize: 9, color: THEME.gold, marginTop: 1 }}>点击更新状态</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 8,
                      background: currentHealth.bg, color: currentHealth.color, fontWeight: 500 }}>
                      {currentHealth.label}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 8,
                      background: `${currentMood.color}15`, color: currentMood.color, fontWeight: 500 }}>
                      {currentMood.emoji}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 8,
                      background: `${getEnergyColor(computedEnergy)}18`,
                      color: getEnergyColor(computedEnergy), fontWeight: 500 }}>
                      {computedEnergy}%
                    </span>
                  </div>
                </motion.div>

                {scheduleLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.4, fontSize: 12, color: THEME.muted }}>
                    加载中...
                  </div>
                ) : (
                  <>
                    {/* 1. 今日日程时间轴 */}
                    <Accordion title="📅 今日日程" count={timeline.length} defaultOpen={true}>
                      <Timeline items={timeline} />
                    </Accordion>

                    {/* 2. 今日携带 */}
                    <Accordion title="🎒 今日携带"
                      count={todayPackCount}
                      badge={todayPackCount > 0 ? '需确认' : undefined}
                      defaultOpen={todayPackCount > 0}>
                      <PackingSection childId={sel.id} userId={userId}
                        events={todayPackEvents} eventType={todayMainEventType} />
                    </Accordion>

                    {/* 3. 今日安排 */}
                    <Accordion title="📋 今日安排" count={todayEvents.length} defaultOpen={todayEvents.length > 0}>
                      <EventList events={todayEvents} onSelect={setSelectedEvent} />
                    </Accordion>

                    {/* 4. 今晚准备（明天携带+明天安排合并）*/}
                    <Accordion title="🌙 今晚准备"
                      count={eveningEvents.length + tomorrowPack.length} defaultOpen={false}>
                      {eveningEvents.length > 0 && (
                        <div style={{ marginBottom: tomorrowPack.length > 0 ? 12 : 0 }}>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>明天的安排</div>
                          <EventList events={eveningEvents} onSelect={setSelectedEvent} />
                        </div>
                      )}
                      {tomorrowPack.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>
                            明天要带（今晚装好）
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {tomorrowPack.map((item, i) => (
                              <PackCheckItem key={i} item={item}
                                storageKey={`packing_${sel.id}_${tomorrow}`}
                                itemKey={`tomorrow-${item}`} size="md" />
                            ))}
                          </div>
                        </div>
                      )}
                      {eveningEvents.length === 0 && tomorrowPack.length === 0 && (
                        <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
                          明天没有特别安排
                        </div>
                      )}
                    </Accordion>

                    {/* 5. 本周安排 */}
                    <Accordion title="📆 本周安排" count={weekEvents.length} defaultOpen={false}>
                      <EventList events={weekEvents} onSelect={setSelectedEvent} />
                    </Accordion>

                    {/* 6. 本月安排 */}
                    {monthEvents.length > 0 && (
                      <Accordion title="🗓 本月安排" count={monthEvents.length} defaultOpen={false}>
                        <EventList events={monthEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}

                    {/* 7. 学年大事 */}
                    {yearEvents.length > 0 && (
                      <Accordion title="🎓 学年大事" count={yearEvents.length} defaultOpen={false}>
                        <EventList events={yearEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}

                    {/* 空状态 */}
                    {timeline.length === 0 && calendar.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ opacity: 0.32, fontSize: 13, color: THEME.text, marginBottom: 12 }}>
                          还没有日程安排 🌸
                        </div>
                        <motion.button whileTap={{ scale: 0.95 }}
                          onClick={() => window.location.href = '/rian'}
                          style={{ padding: '8px 20px', borderRadius: 20,
                            border: `1px solid ${THEME.gold}`, background: 'rgba(176,141,87,0.08)',
                            color: THEME.gold, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          + 告诉根孩子的日程安排
                        </motion.button>
                      </div>
                    )}

                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/rian'}
                      style={{ width: '100%', marginTop: 10, padding: '11px', borderRadius: 14,
                        border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.06)',
                        fontSize: 13, color: THEME.gold, fontWeight: 500, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      + 添加日程 / 备注 <ChevronRight size={14} />
                    </motion.button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showStatusEditor && (
          <StatusEditor log={dailyLog} onSave={saveStatus} onClose={() => setShowStatusEditor(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && sel && (
          <ChildActionSheet event={selectedEvent} childName={sel.name}
            userId={userId} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
