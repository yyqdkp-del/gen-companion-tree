'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  text: '#2C3E50',
  gold: '#B08D57',
  muted: '#6B8BAA',
  navy: '#1A3C5E',
}

const G = {
  bg: '#E1F5EE',
  border: '#9FE1CB',
  mid: '#5DCAA5',
  deep: '#1D9E75',
  dark: '#0F6E56',
  darkest: '#085041',
}

type UrgentItem = { title: string; level: 'red' | 'orange' | 'yellow' }

type Child = {
  id: string; name: string; emoji: string; energy: number
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  today_schedule?: any[]; urgent_items?: UrgentItem[]
  packing_alerts?: any[]
}

type TodoItem = {
  id: string; title: string; priority: string; category?: string
  due_date?: string; ai_draft?: string; ai_action_type?: string
  one_tap_ready?: boolean; delegated_to?: string; status: string
  ai_action_data?: any
}

type Props = {
  children: Child[]
  sel: Child | null
  onSel: (c: Child) => void
  onClose: () => void
  onAdd: () => void
  todos: TodoItem[]
  onOneTap: (todo: TodoItem) => void
}

const healthMap: Record<string, { label: string; color: string; bg: string }> = {
  normal:     { label: '健康',   color: G.dark,    bg: G.bg },
  sick:       { label: '生病中', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  recovering: { label: '恢复中', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
}

const moodMap: Record<string, { label: string; color: string }> = {
  happy:   { label: '开心', color: '#D97706' },
  calm:    { label: '平静', color: G.dark },
  anxious: { label: '焦虑', color: '#7C3AED' },
  upset:   { label: '低落', color: '#6B8BAA' },
}

const eventTypeEmoji: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉',
  meeting: '👨‍👩‍👧', class: '📚', trip: '🚌', other: '📌',
}

function getEnergyColor(v: number) {
  return v > 70 ? G.deep : v > 40 ? '#FACC15' : '#FB7185'
}

function getTimeContext(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tomorrow.toDateString()) return '明天'

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
}

function formatMonthDate(dateStr: string): string {
  const date = new Date(dateStr)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${date.getMonth() + 1}月${date.getDate()}日 ${days[date.getDay()]}`
}

// ── 携带物品勾选 ──
function PackItem({ item, done, onToggle }: { item: string; done: boolean; onToggle: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.88 }} onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 16,
        background: done ? G.bg : 'rgba(255,255,255,0.8)',
        border: `0.5px solid ${done ? G.mid : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
      }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        border: done ? 'none' : `1.5px solid ${THEME.muted}`,
        background: done ? G.deep : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s',
      }}>
        {done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <polyline points="1,4 3,6.5 7,1.5" stroke="white" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 11, color: done ? G.darkest : THEME.text,
        textDecoration: done ? 'line-through' : 'none',
        transition: 'all 0.15s',
      }}>{item}</span>
    </motion.div>
  )
}

// ── 行动卡片（待缴费/待办）──
function ActionCard({ todo, onOneTap }: { todo: TodoItem; onOneTap: () => void }) {
  const isUrgent = todo.priority === 'red'
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12, marginBottom: 8,
      background: isUrgent ? 'rgba(255,100,100,0.06)' : 'rgba(255,160,60,0.06)',
      border: `0.5px solid ${isUrgent ? 'rgba(255,100,100,0.2)' : 'rgba(255,160,60,0.2)'}`,
      borderLeft: `3px solid ${isUrgent ? '#FF6B6B' : '#FF8C00'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{todo.title}</div>
        {todo.due_date && (
          <div style={{ fontSize: 10, color: isUrgent ? '#FF6B6B' : '#FF8C00', marginTop: 2 }}>
            截止 {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
      {todo.one_tap_ready && (
        <motion.button whileTap={{ scale: 0.88 }} onClick={onOneTap}
          style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: isUrgent ? '#FF6B6B' : G.dark,
            color: '#fff', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', flexShrink: 0, marginLeft: 8,
          }}>
          一键办
        </motion.button>
      )}
    </div>
  )
}

// ── 主组件 ──
export default function ChildSheet({ children, sel, onSel, onClose, onAdd, todos, onOneTap }: Props) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [showMonth, setShowMonth] = useState(false)
  const [showYear, setShowYear] = useState(false)

  const timeCtx = getTimeContext()
  const health = healthMap[sel?.health_status || 'normal']
  const mood = moodMap[sel?.mood_status || 'calm']

  // 查询日程（今天到学年末）
  useEffect(() => {
    if (!sel?.id) return
    setLoading(true)
    setSchedule([])

    const today = new Date().toISOString().split('T')[0]
    const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]

    supabase
      .from('child_school_calendar')
      .select('*')
      .eq('child_id', sel.id)
      .gte('date_start', today)
      .lte('date_start', yearEnd)
      .order('date_start', { ascending: true })
      .then(({ data }) => {
        setSchedule(data || [])
        setLoading(false)
      })
  }, [sel?.id])

  // 日期分组
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const in30days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const todayEvents = schedule.filter(e => e.date_start === today)
  const tomorrowEvents = schedule.filter(e => e.date_start === tomorrow)
  const weekEvents = schedule.filter(e => e.date_start > tomorrow && e.date_start <= in7days)
  const monthEvents = schedule.filter(e => e.date_start > in7days && e.date_start <= in30days)
  const yearEvents = schedule.filter(e => e.date_start > in30days)

  // 今天携带物品
  const todayPackItems: string[] = todayEvents.flatMap(e =>
    Array.isArray(e.requires_items) ? e.requires_items : []
  )

  // 明天携带物品（今晚准备）
  const tomorrowPackItems: string[] = tomorrowEvents.flatMap(e =>
    Array.isArray(e.requires_items) ? e.requires_items : []
  )

  // 关联待办
  const relatedTodos = sel
    ? todos.filter(t => t.status === 'pending' && t.title.includes(sel.name))
    : []
  const urgentTodos = relatedTodos.filter(t => t.priority === 'red')
  const otherTodos = relatedTodos.filter(t => t.priority !== 'red')

  // 今天上下文提示
  const contextHint = timeCtx === 'morning'
    ? '出门前确认'
    : timeCtx === 'afternoon'
    ? '接娃前看看'
    : '今晚准备一下'

  const toggleItem = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 孩子切换
  const selIndex = children.findIndex(c => c.id === sel?.id)
  const prevChild = selIndex > 0 ? children[selIndex - 1] : null
  const nextChild = selIndex < children.length - 1 ? children[selIndex + 1] : null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: `0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)`,
        background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
          borderRadius: 22, overflow: 'hidden',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          margin: '0 10px',
        }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg,#A7D7D9,#D9A7B4)', flexShrink: 0 }} />
        <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

        {/* 标题栏 */}
        <div style={{ padding: '10px 14px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>孩子</span>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
            <X size={18} color={THEME.muted} />
          </motion.div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px' }}>

          {/* 孩子切换器（横滑式）*/}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            {/* 上一个孩子 */}
            <motion.div whileTap={{ scale: 0.88 }}
              onClick={() => prevChild && onSel(prevChild)}
              style={{ opacity: prevChild ? 0.5 : 0, cursor: prevChild ? 'pointer' : 'default', padding: 4 }}>
              <ChevronLeft size={16} color={THEME.muted} />
            </motion.div>

            {/* 当前孩子 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              {sel ? (
                <>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(176,141,87,0.1)',
                    border: '2px solid rgba(176,141,87,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0,
                  }}>{sel.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>{sel.name}</div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
                      {sel.school_name || ''}{sel.grade ? ` · ${sel.grade}` : ''}
                    </div>
                  </div>
                  {/* 健康心情精力一行 */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, background: health.bg, color: health.color, fontWeight: 500 }}>
                      {health.label}
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 10, background: `${getEnergyColor(sel.energy)}18`, color: getEnergyColor(sel.energy), fontWeight: 500 }}>
                      {sel.energy}%
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: THEME.muted }}>选择孩子</div>
              )}
            </div>

            {/* 下一个孩子 */}
            <motion.div whileTap={{ scale: 0.88 }}
              onClick={() => nextChild && onSel(nextChild)}
              style={{ opacity: nextChild ? 0.5 : 0, cursor: nextChild ? 'pointer' : 'default', padding: 4 }}>
              <ChevronRight size={16} color={THEME.muted} />
            </motion.div>

            {/* 添加孩子 */}
            <motion.div whileTap={{ scale: 0.88 }} onClick={onAdd}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1.5px dashed rgba(0,0,0,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: THEME.muted, flexShrink: 0,
              }}>
              <Plus size={14} />
            </motion.div>
          </div>

          {/* 孩子列表小点（指示器）*/}
          {children.length > 1 && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14 }}>
              {children.map(c => (
                <motion.div key={c.id}
                  onClick={() => onSel(c)}
                  animate={{ width: c.id === sel?.id ? 16 : 6 }}
                  style={{
                    height: 6, borderRadius: 3, cursor: 'pointer',
                    background: c.id === sel?.id ? THEME.gold : 'rgba(0,0,0,0.1)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>
          )}

          {!sel ? (
            <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 14, color: THEME.text }}>
              选择孩子查看状态
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', opacity: 0.4, fontSize: 12, color: THEME.muted }}>
              加载中...
            </div>
          ) : (
            <>
              {/* 紧急事项 */}
              {sel.urgent_items?.map((item, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                  borderLeft: `3px solid ${item.level === 'red' ? '#FF6B6B' : item.level === 'orange' ? '#FF8C00' : '#FACC15'}`,
                  background: item.level === 'red' ? 'rgba(255,100,100,0.08)' : item.level === 'orange' ? 'rgba(255,160,60,0.08)' : 'rgba(255,210,80,0.08)',
                  fontSize: 12, color: THEME.text, lineHeight: 1.5,
                }}>⚡ {item.title}</div>
              ))}

              {/* 紧急待办 */}
              {urgentTodos.map(todo => (
                <ActionCard key={todo.id} todo={todo} onOneTap={() => onOneTap(todo)} />
              ))}

              {/* 今天携带（最高优先级）*/}
              {todayPackItems.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>
                    🎒 {contextHint}带的
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {todayPackItems.map((item, i) => (
                      <PackItem
                        key={i} item={item}
                        done={checkedItems[`today-${item}`] || false}
                        onToggle={() => toggleItem(`today-${item}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 今天日程 */}
              {todayEvents.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>今天的安排</div>
                  {todayEvents.map((event, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 0',
                      borderBottom: i < todayEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: THEME.text }}>{event.title}</div>
                        {event.description && (
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{event.description}</div>
                        )}
                        {event.requires_action && (
                          <div style={{ fontSize: 11, color: '#E07B2A', marginTop: 3 }}>⚠ {event.requires_action}</div>
                        )}
                        {event.requires_payment && (
                          <div style={{ fontSize: 11, color: THEME.gold, marginTop: 3 }}>💰 需缴 ฿{event.requires_payment}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 今晚准备明天的 */}
              {(tomorrowEvents.length > 0 || tomorrowPackItems.length > 0) && (
                <div style={{
                  marginBottom: 14, padding: '12px',
                  borderRadius: 12, background: 'rgba(154,183,232,0.08)',
                  border: '0.5px solid rgba(154,183,232,0.2)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>
                    🌙 今晚准备一下
                  </div>
                  {tomorrowEvents.map((event, i) => (
                    <div key={i} style={{ fontSize: 12, color: THEME.text, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{eventTypeEmoji[event.event_type] || '📌'}</span>
                      <span>{event.title}</span>
                    </div>
                  ))}
                  {tomorrowPackItems.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6 }}>明天要带（今晚装好）</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {tomorrowPackItems.map((item, i) => (
                          <PackItem
                            key={i} item={item}
                            done={checkedItems[`tomorrow-${item}`] || false}
                            onToggle={() => toggleItem(`tomorrow-${item}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 本周 */}
              {weekEvents.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>本周</div>
                  {weekEvents.map((event, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 0',
                      borderBottom: i < weekEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: THEME.muted, minWidth: 40, flexShrink: 0 }}>
                        {formatEventDate(event.date_start)}
                      </span>
                      <span style={{ fontSize: 14 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, color: THEME.text }}>{event.title}</span>
                        {event.requires_payment && (
                          <span style={{ fontSize: 10, color: THEME.gold, marginLeft: 6 }}>฿{event.requires_payment}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 本月（折叠）*/}
              {monthEvents.length > 0 && (
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
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}>
                        {monthEvents.map((event, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0',
                            borderBottom: i < monthEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                          }}>
                            <span style={{ fontSize: 10, color: THEME.muted, minWidth: 60, flexShrink: 0 }}>
                              {formatMonthDate(event.date_start)}
                            </span>
                            <span style={{ fontSize: 13 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                            <span style={{ fontSize: 11, color: THEME.text, flex: 1 }}>{event.title}</span>
                            {event.requires_payment && (
                              <span style={{ fontSize: 10, color: THEME.gold }}>฿{event.requires_payment}</span>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 学年大事（折叠）*/}
              {yearEvents.length > 0 && (
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
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}>
                        {yearEvents.map((event, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0',
                            borderBottom: i < yearEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                          }}>
                            <span style={{ fontSize: 10, color: THEME.muted, minWidth: 60, flexShrink: 0 }}>
                              {formatMonthDate(event.date_start)}
                            </span>
                            <span style={{ fontSize: 13 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                            <span style={{ fontSize: 11, color: THEME.text, flex: 1 }}>{event.title}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* 今天明天本周都没有 */}
              {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekEvents.length === 0 && !loading && (
                <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>
                  本周没有特别安排 🌸
                </div>
              )}

              {/* 其他相关待办 */}
              {otherTodos.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: THEME.gold, marginBottom: 8 }}>
                    🔔 {sel.name} 相关待办
                  </div>
                  {otherTodos.map(todo => (
                    <ActionCard key={todo.id} todo={todo} onOneTap={() => onOneTap(todo)} />
                  ))}
                </div>
              )}

              {/* 跳转日安 */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/rian'}
                style={{
                  width: '100%', marginTop: 16, padding: '12px',
                  borderRadius: 14, border: '1px solid rgba(176,141,87,0.25)',
                  background: 'rgba(176,141,87,0.08)', fontSize: 13,
                  color: THEME.gold, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                去日安说说关于 {sel.name} 的事 <ChevronRight size={14} />
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
