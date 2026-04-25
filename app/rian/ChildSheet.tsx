'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronRight, Bell, ChevronDown } from 'lucide-react'
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
type PackingAlert = { item: string; level: 1 | 2 | 3 | 'today'; days_left?: number; need_buy: boolean }

type Child = {
  id: string; name: string; emoji: string; energy: number
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  today_schedule?: any[]; urgent_items?: UrgentItem[]
  packing_alerts?: PackingAlert[]
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
  normal:     { label: '健康',   color: G.dark,     bg: G.bg },
  sick:       { label: '生病中',  color: '#DC2626',  bg: 'rgba(220,38,38,0.08)' },
  recovering: { label: '恢复中',  color: '#D97706',  bg: 'rgba(217,119,6,0.08)' },
}

const moodMap: Record<string, { label: string; color: string }> = {
  happy:   { label: '开心', color: '#D97706' },
  calm:    { label: '平静', color: G.dark },
  anxious: { label: '焦虑', color: '#7C3AED' },
  upset:   { label: '低落', color: '#6B8BAA' },
}

const urgencyColor: Record<string, string> = {
  red: '#FF6B6B', orange: '#FF8C00', yellow: '#FACC15',
}

const eventTypeEmoji: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉',
  meeting: '👨‍👩‍👧', class: '📚', trip: '🚌', other: '📌',
}

function getEnergyColor(v: number) {
  return v > 70 ? G.deep : v > 40 ? '#FACC15' : '#FB7185'
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  if (isToday) return '今天'
  if (isTomorrow) return '明天'

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
}

// ── 携带物品 tag ──
function PackTag({ item, done, onToggle }: { item: string; done: boolean; onToggle: () => void }) {
  return (
    <motion.div
      whileTap={{ scale: 0.88 }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 16,
        background: done ? G.bg : 'rgba(255,255,255,0.7)',
        border: `0.5px solid ${done ? G.mid : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        border: done ? 'none' : `1.5px solid ${THEME.muted}`,
        background: done ? G.deep : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s',
      }}>
        {done && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <polyline points="1,4 3,6.5 7,1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 11, color: done ? G.darkest : THEME.text, textDecoration: done ? 'line-through' : 'none' }}>
        {item}
      </span>
    </motion.div>
  )
}

// ── 日程卡片 ──
function ScheduleCard({ event, todos, onOneTap, isToday }: {
  event: any
  todos: TodoItem[]
  onOneTap: (t: TodoItem) => void
  isToday: boolean
}) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const items: string[] = Array.isArray(event.requires_items) ? event.requires_items : []

  const toggleItem = (item: string) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }))
  }

  // 找关联待办（按标题匹配）
  const relatedTodo = todos.find(t =>
    t.status === 'pending' &&
    (t.title.includes(event.title) || event.title.includes(t.title.slice(0, 5)))
  )

  return (
    <div style={{
      padding: '12px', borderRadius: 12, marginBottom: 8,
      background: isToday ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
      border: `0.5px solid ${isToday ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)'}`,
    }}>
      {/* 事件标题行 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{event.title}</div>
          {event.description && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, lineHeight: 1.4 }}>{event.description}</div>
          )}
        </div>
      </div>

      {/* 需要行动 */}
      {event.requires_action && (
        <div style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 8,
          background: 'rgba(224,123,42,0.08)',
          fontSize: 11, color: '#E07B2A', fontWeight: 500,
        }}>
          ⚠ {event.requires_action}
        </div>
      )}

      {/* 需要携带 */}
      {items.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 5 }}>
            🎒 需要携带（点击确认）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {items.map((item, i) => (
              <PackTag
                key={i}
                item={item}
                done={checkedItems[item] || false}
                onToggle={() => toggleItem(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 需要缴费 */}
      {event.requires_payment && (
        <div style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 8,
          background: 'rgba(176,141,87,0.08)',
          fontSize: 11, color: THEME.gold, fontWeight: 500,
        }}>
          💰 需缴费 ฿{event.requires_payment}
        </div>
      )}

      {/* 关联待办 */}
      {relatedTodo && (
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '7px 10px',
          borderRadius: 8, background: 'rgba(29,158,117,0.06)',
          border: `0.5px solid ${G.border}`,
        }}>
          <span style={{ fontSize: 11, color: G.dark }}>{relatedTodo.title}</span>
          {relatedTodo.one_tap_ready && (
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => onOneTap(relatedTodo)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                background: G.dark, color: '#fff',
                fontSize: 10, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              }}>
              一键办
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}

// ── 日期分组标题 ──
function DateHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 8, marginTop: 4,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.navy }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
      <span style={{ fontSize: 10, color: THEME.muted }}>{count}件</span>
    </div>
  )
}

// ── 主组件 ──
export default function ChildSheet({ children, sel, onSel, onClose, onAdd, todos, onOneTap }: Props) {
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showWeek, setShowWeek] = useState(false)

  const health = healthMap[sel?.health_status || 'normal']
  const mood = moodMap[sel?.mood_status || 'calm']

  // 关联待办（用 child_id 或名字匹配）
  const relatedTodos = sel
    ? todos.filter(t => t.status === 'pending' && t.title.includes(sel.name))
    : []

  // 查询日程
  useEffect(() => {
    if (!sel?.id) return
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

    supabase
      .from('child_school_calendar')
      .select('*')
      .eq('child_id', sel.id)
      .gte('date_start', today)
      .lte('date_start', nextWeek)
      .order('date_start', { ascending: true })
      .then(({ data }) => {
        setSchedule(data || [])
        setLoading(false)
      })
  }, [sel?.id])

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const todayEvents = schedule.filter(e => e.date_start === today)
  const tomorrowEvents = schedule.filter(e => e.date_start === tomorrow)
  const weekEvents = schedule.filter(e => e.date_start > tomorrow)

  // 今天紧急待办
  const urgentTodos = relatedTodos.filter(t => t.priority === 'red')
  const otherTodos = relatedTodos.filter(t => t.priority !== 'red')

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
        {/* 顶部色条 */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#A7D7D9,#D9A7B4)', flexShrink: 0 }} />
        <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

        {/* 标题栏 */}
        <div style={{ padding: '10px 14px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>孩子</span>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
            <X size={18} color={THEME.muted} />
          </motion.div>
        </div>

        {/* 滚动区 */}
        <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' as any, padding: '10px 14px' }}>

          {/* 孩子选择器 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {children.map(c => (
              <motion.div key={c.id} whileTap={{ scale: 0.90 }} onClick={() => onSel(c)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: sel?.id === c.id ? 1 : 0.35 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: sel?.id === c.id ? 'rgba(176,141,87,0.12)' : 'rgba(0,0,0,0.05)',
                  border: sel?.id === c.id ? '2px solid rgba(176,141,87,0.5)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>{c.emoji}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: THEME.text }}>{c.name}</span>
                <div style={{ width: 40, height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${c.energy}%` }}
                    style={{ height: '100%', background: getEnergyColor(c.energy), borderRadius: 2 }} />
                </div>
              </motion.div>
            ))}
            <motion.div whileTap={{ scale: 0.90 }} onClick={onAdd}
              style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '2px dashed rgba(0,0,0,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: THEME.muted,
              }}>
              <Plus size={20} />
            </motion.div>
          </div>

          {!sel ? (
            <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 14, color: THEME.text }}>
              选择孩子查看状态
            </div>
          ) : (
            <>
              {/* 一行状态 */}
              <div style={{
                display: 'flex', gap: 6, marginBottom: 14,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(255,255,255,0.6)',
                border: '0.5px solid rgba(0,0,0,0.06)',
                alignItems: 'center',
              }}>
                <div style={{ padding: '3px 8px', borderRadius: 12, background: health.bg, fontSize: 11, color: health.color, fontWeight: 500 }}>
                  {health.label}
                </div>
                <div style={{ padding: '3px 8px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', fontSize: 11, color: THEME.navy, fontWeight: 500 }}>
                  {mood.label}
                </div>
                <div style={{ padding: '3px 8px', borderRadius: 12, background: `${getEnergyColor(sel.energy)}18`, fontSize: 11, color: getEnergyColor(sel.energy), fontWeight: 500 }}>
                  精力 {sel.energy}%
                </div>
                {sel.school_name && (
                  <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 'auto' }}>{sel.school_name}</span>
                )}
              </div>

              {/* 紧急项 */}
              {sel.urgent_items?.map((item, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                  borderLeft: `3px solid ${urgencyColor[item.level]}`,
                  background: `${urgencyColor[item.level]}12`,
                  fontSize: 13, color: THEME.text, lineHeight: 1.5,
                }}>
                  {item.title}
                </div>
              ))}

              {/* 紧急待办 */}
              {urgentTodos.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {urgentTodos.map(todo => (
                    <div key={todo.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                      background: 'rgba(255,100,100,0.06)',
                      borderLeft: '3px solid #FF6B6B',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{todo.title}</div>
                        {todo.due_date && (
                          <div style={{ fontSize: 10, color: '#FF6B6B', marginTop: 2 }}>
                            截止 {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {todo.one_tap_ready && (
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onOneTap(todo)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: 'none',
                            background: '#FF6B6B', color: '#fff',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                          }}>
                          一键办
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 今天 */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.4, fontSize: 12, color: THEME.muted }}>
                  加载中...
                </div>
              ) : (
                <>
                  {todayEvents.length > 0 && (
                    <>
                      <DateHeader label="今天" count={todayEvents.length} />
                      {todayEvents.map((event, i) => (
                        <ScheduleCard
                          key={event.id || i}
                          event={event}
                          todos={todos}
                          onOneTap={onOneTap}
                          isToday={true}
                        />
                      ))}
                    </>
                  )}

                  {/* 明天 */}
                  {tomorrowEvents.length > 0 && (
                    <>
                      <DateHeader label="明天" count={tomorrowEvents.length} />
                      {tomorrowEvents.map((event, i) => (
                        <ScheduleCard
                          key={event.id || i}
                          event={event}
                          todos={todos}
                          onOneTap={onOneTap}
                          isToday={false}
                        />
                      ))}
                    </>
                  )}

                  {/* 今天明天都没有 */}
                  {todayEvents.length === 0 && tomorrowEvents.length === 0 && weekEvents.length === 0 && (
                    <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>
                      本周没有特别安排 🌸
                    </div>
                  )}

                  {/* 本周（可折叠）*/}
                  {weekEvents.length > 0 && (
                    <>
                      <motion.div
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowWeek(p => !p)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          marginBottom: showWeek ? 8 : 0, marginTop: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.navy }}>本周</span>
                        <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
                        <span style={{ fontSize: 10, color: THEME.muted }}>{weekEvents.length}件</span>
                        <motion.div animate={{ rotate: showWeek ? 180 : 0 }} transition={{ duration: 0.18 }}>
                          <ChevronDown size={13} color={THEME.muted} />
                        </motion.div>
                      </motion.div>

                      <AnimatePresence>
                        {showWeek && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {weekEvents.map((event, i) => (
                              <div key={event.id || i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px', borderRadius: 10, marginBottom: 6,
                                background: 'rgba(255,255,255,0.5)',
                                border: '0.5px solid rgba(0,0,0,0.05)',
                              }}>
                                <span style={{ fontSize: 11, color: THEME.muted, flexShrink: 0, minWidth: 36 }}>
                                  {formatDate(event.date_start)}
                                </span>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{eventTypeEmoji[event.event_type] || '📌'}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{event.title}</div>
                                  {event.requires_action && (
                                    <div style={{ fontSize: 10, color: '#E07B2A', marginTop: 2 }}>⚠ {event.requires_action}</div>
                                  )}
                                </div>
                                {event.requires_payment && (
                                  <span style={{ fontSize: 10, color: THEME.gold, flexShrink: 0 }}>฿{event.requires_payment}</span>
                                )}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </>
              )}

              {/* 其他相关待办 */}
              {otherTodos.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                    <Bell size={11} color={THEME.gold} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: THEME.gold }}>
                      {sel.name} 相关待办
                    </span>
                  </div>
                  {otherTodos.map(todo => (
                    <div key={todo.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 10, marginBottom: 6,
                      background: 'rgba(255,255,255,0.7)',
                      border: '0.5px solid rgba(0,0,0,0.06)',
                      borderLeft: `3px solid ${todo.priority === 'orange' ? '#FF8C00' : '#FACC15'}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text }}>{todo.title}</div>
                        {todo.due_date && (
                          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                            {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {todo.one_tap_ready && (
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => onOneTap(todo)}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: 'none',
                            background: G.dark, color: '#fff',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer', flexShrink: 0, marginLeft: 8,
                          }}>
                          一键办
                        </motion.button>
                      )}
                    </div>
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
