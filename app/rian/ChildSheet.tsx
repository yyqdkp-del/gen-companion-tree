'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import PackCheckItem from '@/app/components/PackCheckItem'
import VoiceBtn from '@/app/components/VoiceBtn'
import ChildActionSheet, { ChildEvent } from '@/app/rian/ChildActionSheet'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = { text: '#2C3E50', gold: '#B08D57', muted: '#6B8BAA', navy: '#1A3C5E' }
const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56', darkest: '#085041' }

type UrgentItem = { title: string; level: 'red' | 'orange' | 'yellow' }
type Child = {
  id: string; name: string; emoji: string; energy: number
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  today_schedule?: any[]; urgent_items?: UrgentItem[]
}
type TodoItem = {
  id: string; title: string; priority: string; category?: string
  due_date?: string; one_tap_ready?: boolean; delegated_to?: string
  status: string; ai_action_data?: any
}
type DailyLog = { id?: string; health_status: string; mood_status: string }
type Props = {
  children: Child[]; sel: Child | null; onSel: (c: Child) => void
  onClose: () => void; onAdd: () => void; todos: TodoItem[]
  onOneTap: (todo: TodoItem) => void; userId: string
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
  activity: '🎯', exam: '📝', holiday: '🎉',
  meeting: '👨‍👩‍👧', class: '📚', trip: '🚌', other: '📌',
}
function getTodayKey() { return new Date().toISOString().split('T')[0] }
function getTimeContext() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}
function formatEventDate(d: string) {
  const date = new Date(d), today = new Date(), tmr = new Date(today)
  tmr.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tmr.toDateString()) return '明天'
  return ['周日','周一','周二','周三','周四','周五','周六'][date.getDay()] + ` ${date.getMonth()+1}/${date.getDate()}`
}
function formatMonthDate(d: string) {
  const date = new Date(d)
  return `${date.getMonth()+1}月${date.getDate()}日 ${['周日','周一','周二','周三','周四','周五','周六'][date.getDay()]}`
}

// ── 健康心情编辑器（居中弹出，不被遮挡）──
function StatusEditor({ log, onSave, onClose }: { log: DailyLog; onSave: (h: string, m: string) => void; onClose: () => void }) {
  const [health, setHealth] = useState(log.health_status || 'normal')
  const [mood, setMood] = useState(log.mood_status || 'calm')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: '#fff', borderRadius: 20,
          padding: '24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>今天状态</div>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.4 }}>
            <X size={18} />
          </motion.div>
        </div>

        {/* 健康 */}
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>健康状态</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {healthOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setHealth(o.value)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                background: health === o.value ? o.bg : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${health === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                fontSize: 13, fontWeight: health === o.value ? 600 : 400,
                color: health === o.value ? o.color : THEME.muted,
                transition: 'all 0.15s',
              }}>
              {o.label}
            </motion.div>
          ))}
        </div>

        {/* 心情 */}
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>今日心情</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
          {moodOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setMood(o.value)}
              style={{
                padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: mood === o.value ? `${o.color}12` : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${mood === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 20 }}>{o.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: mood === o.value ? 600 : 400, color: mood === o.value ? o.color : THEME.muted }}>
                {o.label}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSave(health, mood)}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: THEME.navy, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
          保存
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ── 主组件 ──
export default function ChildSheet({ children, sel, onSel, onClose, onAdd, todos, onOneTap, userId }: Props) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [showMonth, setShowMonth] = useState(false)
  const [showYear, setShowYear] = useState(false)
  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [dailyLog, setDailyLog] = useState<DailyLog>({ health_status: 'normal', mood_status: 'calm' })
  const [selectedEvent, setSelectedEvent] = useState<ChildEvent | null>(null)

  const timeCtx = getTimeContext()
  const contextHint = timeCtx === 'morning' ? '出门前确认' : timeCtx === 'afternoon' ? '接娃前看看' : '今晚准备一下'

  // 切换孩子：界面秒响应，数据后台加载
  const handleSel = useCallback((c: Child) => {
    onSel(c)
    setSchedule([])
    setShowMonth(false)
    setShowYear(false)
    setDailyLog({ health_status: c.health_status || 'normal', mood_status: c.mood_status || 'calm' })
  }, [onSel])

  // 查日程
  useEffect(() => {
    if (!sel?.id) return
    setScheduleLoading(true)
    const today = getTodayKey()
    const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
    supabase.from('child_school_calendar').select('*')
      .eq('child_id', sel.id).gte('date_start', today).lte('date_start', yearEnd)
      .order('date_start', { ascending: true })
      .then(({ data }) => { setSchedule(data || []); setScheduleLoading(false) })
  }, [sel?.id])

  // 查今日健康记录
  useEffect(() => {
    if (!sel?.id) return
    const today = getTodayKey()
    supabase.from('child_daily_log').select('id, health_status, mood_status')
      .eq('child_id', sel.id).eq('date', today).single()
      .then(({ data }) => {
        if (data) setDailyLog(data)
        else setDailyLog({ health_status: sel.health_status || 'normal', mood_status: sel.mood_status || 'calm' })
      })
  }, [sel?.id])

  // 保存健康心情
  const saveStatus = useCallback(async (health: string, mood: string) => {
    if (!sel?.id) return
    const today = getTodayKey()
    const payload = { child_id: sel.id, date: today, health_status: health, mood_status: mood, updated_at: new Date().toISOString() }
    if (dailyLog.id) {
      await supabase.from('child_daily_log').update(payload).eq('id', dailyLog.id)
    } else {
      const { data } = await supabase.from('child_daily_log')
        .insert({ ...payload, user_id: userId }).select().single()
      if (data) setDailyLog(d => ({ ...d, id: data.id }))
    }
    setDailyLog(prev => ({ ...prev, health_status: health, mood_status: mood }))
    setShowStatusEditor(false)
  }, [sel?.id, dailyLog.id, userId])

  // 日期分组
  const today = getTodayKey()
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const in30days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const todayEvents = schedule.filter(e => e.date_start === today)
  const tomorrowEvents = schedule.filter(e => e.date_start === tomorrow)
  const weekEvents = schedule.filter(e => e.date_start > tomorrow && e.date_start <= in7days)
  const monthEvents = schedule.filter(e => e.date_start > in7days && e.date_start <= in30days)
  const yearEvents = schedule.filter(e => e.date_start > in30days)

  const todayPackItems: string[] = todayEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : [])
  const tomorrowPackItems: string[] = tomorrowEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : [])

  const relatedTodos = sel ? todos.filter(t => t.status === 'pending' && t.title.includes(sel.name)) : []
  const urgentTodos = relatedTodos.filter(t => t.priority === 'red')
  const otherTodos = relatedTodos.filter(t => t.priority !== 'red')

  const currentHealth = healthOptions.find(o => o.value === dailyLog.health_status) || healthOptions[0]
  const currentMood = moodOptions.find(o => o.value === dailyLog.mood_status) || moodOptions[1]

  const getEnergyColor = (v: number) => v > 70 ? G.deep : v > 40 ? '#FACC15' : '#FB7185'

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
            borderRadius: 22, overflow: 'hidden',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }}>

          <div style={{ height: 4, background: 'linear-gradient(90deg,#A7D7D9,#D9A7B4)', flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          <div style={{ padding: '10px 14px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>孩子</span>
            <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
              <X size={18} color={THEME.muted} />
            </motion.div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px' }}>

            {/* ── 孩子头像横排（秒切）── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {children.map(c => (
                <motion.div key={c.id} whileTap={{ scale: 0.88 }} onClick={() => handleSel(c)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: c.id === sel?.id ? 54 : 42, height: c.id === sel?.id ? 54 : 42,
                    borderRadius: '50%', background: 'rgba(176,141,87,0.08)',
                    border: `2px solid ${c.id === sel?.id ? THEME.gold : 'transparent'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: c.id === sel?.id ? 28 : 22,
                    transition: 'all 0.18s',
                    boxShadow: c.id === sel?.id ? `0 0 0 3px rgba(176,141,87,0.18)` : 'none',
                  }}>
                    {c.emoji}
                  </div>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.05em',
                    fontWeight: c.id === sel?.id ? 700 : 400,
                    color: c.id === sel?.id ? THEME.gold : THEME.muted,
                  }}>{c.name}</span>
                </motion.div>
              ))}
              <motion.div whileTap={{ scale: 0.88 }} onClick={onAdd}
                style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px dashed rgba(0,0,0,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: THEME.muted,
                }}>
                <Plus size={14} />
              </motion.div>
            </div>

            {!sel ? (
              <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 14, color: THEME.text }}>
                选择孩子查看状态
              </div>
            ) : (
              <>
                {/* ── 孩子信息 + 可点击状态标签 ── */}
                <motion.div whileTap={{ scale: 0.98 }} onClick={() => setShowStatusEditor(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                    padding: '10px 12px', borderRadius: 14,
                    background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{sel.name}</div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
                      {sel.school_name || ''}{sel.grade ? ` · ${sel.grade}` : ''}
                      <span style={{ marginLeft: 6, fontSize: 9, color: THEME.gold }}>点击更新状态</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10,
                      background: currentHealth.bg, color: currentHealth.color, fontWeight: 500 }}>
                      {currentHealth.label}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10,
                      background: `${currentMood.color}15`, color: currentMood.color, fontWeight: 500 }}>
                      {currentMood.emoji} {currentMood.label}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10,
                      background: `${getEnergyColor(sel.energy)}18`, color: getEnergyColor(sel.energy), fontWeight: 500 }}>
                      {sel.energy}%
                    </span>
                  </div>
                </motion.div>

                {/* ── 紧急事项（红色横幅置顶）── */}
                {sel.urgent_items && sel.urgent_items.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {sel.urgent_items.map((item, i) => (
                      <div key={i} style={{
                        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                        background: item.level === 'red' ? 'rgba(255,100,100,0.1)' : item.level === 'orange' ? 'rgba(255,160,60,0.1)' : 'rgba(255,210,80,0.1)',
                        borderLeft: `3px solid ${item.level === 'red' ? '#FF6B6B' : item.level === 'orange' ? '#FF8C00' : '#FACC15'}`,
                        fontSize: 12, color: THEME.text, lineHeight: 1.5, fontWeight: item.level === 'red' ? 600 : 400,
                      }}>
                        {item.level === 'red' ? '🚨' : item.level === 'orange' ? '⚠️' : '💛'} {item.title}
                      </div>
                    ))}
                    <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.07)', margin: '10px 0' }} />
                  </div>
                )}

                {/* 紧急待办 */}
                {urgentTodos.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {urgentTodos.map(todo => (
                      <div key={todo.id} style={{
                        padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                        background: 'rgba(255,100,100,0.06)',
                        border: '0.5px solid rgba(255,100,100,0.2)',
                        borderLeft: '3px solid #FF6B6B',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{todo.title}</div>
                        {todo.one_tap_ready && (
                          <motion.button whileTap={{ scale: 0.88 }} onClick={() => onOneTap(todo)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                              background: '#FF6B6B', color: '#fff', fontSize: 11, fontWeight: 500,
                              cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                            一键办
                          </motion.button>
                        )}
                      </div>
                    ))}
                    <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.07)', margin: '10px 0' }} />
                  </div>
                )}

                {/* ── 日程加载中 ── */}
                {scheduleLoading && (
                  <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.4, fontSize: 12, color: THEME.muted }}>
                    加载中...
                  </div>
                )}

                {/* 今天携带物品 */}
                {!scheduleLoading && todayPackItems.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy }}>🎒 {contextHint}带的</div>
                      <VoiceBtn text={`今天要带：${todayPackItems.join('、')}`} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {todayPackItems.map((item, i) => (
                        <PackCheckItem key={i} item={item}
                          storageKey={`packing_${sel.id}_${today}`}
                          itemKey={`today-${item}`} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 今天日程（可点击打开 ChildActionSheet）*/}
                {!scheduleLoading && todayEvents.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>今天的安排</div>
                    {todayEvents.map((event, i) => (
                      <motion.div key={i} whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedEvent(event)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 10px',
                          borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                          background: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(0,0,0,0.06)',
                          transition: 'background 0.15s',
                        }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: THEME.text }}>{event.title}</div>
                          {event.description && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{event.description}</div>}
                          {event.requires_action && <div style={{ fontSize: 11, color: '#E07B2A', marginTop: 3 }}>⚠ {event.requires_action}</div>}
                          {event.requires_payment && <div style={{ fontSize: 11, color: THEME.gold, marginTop: 3 }}>💰 需缴 ฿{event.requires_payment}</div>}
                        </div>
                        <ChevronRight size={14} color={THEME.muted} style={{ flexShrink: 0, marginTop: 2 }} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* 今晚准备明天 */}
                {!scheduleLoading && (tomorrowEvents.length > 0 || tomorrowPackItems.length > 0) && (
                  <div style={{ marginBottom: 14, padding: 12, borderRadius: 12,
                    background: 'rgba(154,183,232,0.08)', border: '0.5px solid rgba(154,183,232,0.2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>🌙 今晚准备一下</div>
                    {tomorrowEvents.map((event, i) => (
                      <motion.div key={i} whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedEvent(event)}
                        style={{ fontSize: 12, color: THEME.text, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <span>{eventTypeEmoji[event.event_type] || '📌'}</span>
                        <span>{event.title}</span>
                        <ChevronRight size={12} color={THEME.muted} />
                      </motion.div>
                    ))}
                    {tomorrowPackItems.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6 }}>明天要带（今晚装好）</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {tomorrowPackItems.map((item, i) => (
                            <PackCheckItem key={i} item={item}
                              storageKey={`packing_${sel.id}_${tomorrow}`}
                              itemKey={`tomorrow-${item}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 本周 */}
                {!scheduleLoading && weekEvents.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>本周</div>
                    {weekEvents.map((event, i) => (
                      <motion.div key={i} whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedEvent(event)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                          borderBottom: i < weekEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                          cursor: 'pointer' }}>
                        <span style={{ fontSize: 11, color: THEME.muted, minWidth: 40, flexShrink: 0 }}>{formatEventDate(event.date_start)}</span>
                        <span style={{ fontSize: 14 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, color: THEME.text }}>{event.title}</span>
                          {event.requires_payment && <span style={{ fontSize: 10, color: THEME.gold, marginLeft: 6 }}>฿{event.requires_payment}</span>}
                        </div>
                        <ChevronRight size={12} color={THEME.muted} />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* 本月（折叠）*/}
                {!scheduleLoading && monthEvents.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <motion.div whileTap={{ scale: 0.97 }} onClick={() => setShowMonth(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>本月</span>
                      <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
                      <span style={{ fontSize: 10, color: THEME.muted }}>{monthEvents.length}件</span>
                      <motion.div animate={{ rotate: showMonth ? 180 : 0 }} transition={{ duration: 0.18 }}>
                        <ChevronDown size={12} color={THEME.muted} />
                      </motion.div>
                    </motion.div>
                    <AnimatePresence>
                      {showMonth && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          {monthEvents.map((event, i) => (
                            <motion.div key={i} whileTap={{ scale: 0.97 }}
                              onClick={() => setSelectedEvent(event)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                                borderBottom: i < monthEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                                cursor: 'pointer' }}>
                              <span style={{ fontSize: 10, color: THEME.muted, minWidth: 60, flexShrink: 0 }}>{formatMonthDate(event.date_start)}</span>
                              <span style={{ fontSize: 13 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                              <span style={{ fontSize: 11, color: THEME.text, flex: 1 }}>{event.title}</span>
                              {event.requires_payment && <span style={{ fontSize: 10, color: THEME.gold }}>฿{event.requires_payment}</span>}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 学年大事（折叠）*/}
                {!scheduleLoading && yearEvents.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <motion.div whileTap={{ scale: 0.97 }} onClick={() => setShowYear(p => !p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>学年大事</span>
                      <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
                      <span style={{ fontSize: 10, color: THEME.muted }}>{yearEvents.length}件</span>
                      <motion.div animate={{ rotate: showYear ? 180 : 0 }} transition={{ duration: 0.18 }}>
                        <ChevronDown size={12} color={THEME.muted} />
                      </motion.div>
                    </motion.div>
                    <AnimatePresence>
                      {showYear && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          {yearEvents.map((event, i) => (
                            <motion.div key={i} whileTap={{ scale: 0.97 }}
                              onClick={() => setSelectedEvent(event)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                                borderBottom: i < yearEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                                cursor: 'pointer' }}>
                              <span style={{ fontSize: 10, color: THEME.muted, minWidth: 60, flexShrink: 0 }}>{formatMonthDate(event.date_start)}</span>
                              <span style={{ fontSize: 13 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                              <span style={{ fontSize: 11, color: THEME.text, flex: 1 }}>{event.title}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 空状态引导 */}
                {!scheduleLoading && todayEvents.length === 0 && tomorrowEvents.length === 0 && weekEvents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ opacity: 0.32, fontSize: 13, color: THEME.text, marginBottom: 12 }}>本周没有特别安排 🌸</div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => window.location.href = '/rian'}
                      style={{ padding: '8px 20px', borderRadius: 20, border: `1px solid ${THEME.gold}`,
                        background: 'rgba(176,141,87,0.08)', color: THEME.gold,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      + 告诉根孩子的日程安排
                    </motion.button>
                  </div>
                )}

                {/* 其他相关待办 */}
                {otherTodos.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: THEME.gold, marginBottom: 8 }}>
                      🔔 {sel.name} 相关待办
                    </div>
                    {otherTodos.map(todo => (
                      <div key={todo.id} style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                        background: 'rgba(255,160,60,0.06)', border: '0.5px solid rgba(255,160,60,0.2)',
                        borderLeft: '3px solid #FF8C00',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{todo.title}</div>
                        {todo.one_tap_ready && (
                          <motion.button whileTap={{ scale: 0.88 }} onClick={() => onOneTap(todo)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                              background: G.dark, color: '#fff', fontSize: 11, fontWeight: 500,
                              cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                            一键办
                          </motion.button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 底部按钮 */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/rian'}
                  style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 14,
                    border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.08)',
                    fontSize: 13, color: THEME.gold, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  + 添加日程 / 备注 <ChevronRight size={14} />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* 健康心情编辑器（居中弹出）*/}
      <AnimatePresence>
        {showStatusEditor && (
          <StatusEditor log={dailyLog} onSave={saveStatus} onClose={() => setShowStatusEditor(false)} />
        )}
      </AnimatePresence>

      {/* 孩子事件一键办 */}
      <AnimatePresence>
        {selectedEvent && sel && (
          <ChildActionSheet
            event={selectedEvent}
            childName={sel.name}
            userId={userId}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
