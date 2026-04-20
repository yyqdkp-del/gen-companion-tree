'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, ChevronRight, Thermometer, Smile, Zap, Moon,
  ClipboardList, Bell, CheckCircle2,
} from 'lucide-react'

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

type ScheduleItem = { time: string; title: string; location?: string; requires_action?: string }
type UrgentItem = { title: string; level: 'red' | 'orange' | 'yellow' }
type PackingAlert = { item: string; level: 1 | 2 | 3 | 'today'; days_left?: number; need_buy: boolean }

type Child = {
  id: string; name: string; emoji: string; energy: number
  health_status?: string; mood_status?: string
  school_name?: string; grade?: string
  today_schedule?: ScheduleItem[]; urgent_items?: UrgentItem[]
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
  normal:     { label: '健康',  color: G.dark,    bg: G.bg },
  sick:       { label: '生病中', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  recovering: { label: '恢复中', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
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

const levelLabel: Record<string | number, string> = {
  today: '今天出门带',
  1: '需购买',
  2: '提前准备',
  3: '明天要带',
}

function getEnergyColor(v: number) {
  return v > 70 ? G.deep : v > 40 ? '#FACC15' : '#FB7185'
}

// ── 携带物品勾选 tag ──
function PackTag({ alert }: { alert: PackingAlert }) {
  const [done, setDone] = useState(false)
  const isToday = alert.level === 'today'
  return (
    <motion.div
      whileTap={{ scale: 0.88 }}
      onClick={() => setDone(p => !p)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 12px', borderRadius: 20,
        background: done ? G.bg : isToday ? 'rgba(255,160,60,0.08)' : 'rgba(255,255,255,0.6)',
        border: `0.5px solid ${done ? G.mid : isToday ? 'rgba(255,160,60,0.4)' : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer', userSelect: 'none',
        transition: 'all 0.15s',
      }}
    >
      <AnimatePresence>
        {done && (
          <motion.svg initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            width="11" height="11" viewBox="0 0 11 11" fill="none">
            <polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke={G.deep}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </AnimatePresence>
      <div>
        <div style={{ fontSize: 12, color: done ? G.darkest : THEME.text, fontWeight: 500 }}>{alert.item}</div>
        <div style={{ fontSize: 10, color: done ? G.dark : THEME.muted, marginTop: 1 }}>
          {levelLabel[alert.level]}
          {alert.need_buy && !done && <span style={{ color: '#D97706', marginLeft: 4 }}>· 需购买</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ── 关联待办条目 ──
function RelatedTodo({ todo, onOneTap }: { todo: TodoItem; onOneTap: () => void }) {
  const priorityColor: Record<string, string> = {
    red: '#FF6B6B', orange: '#FF8C00', yellow: '#FACC15',
  }
  const color = priorityColor[todo.priority] || THEME.muted
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: 10, marginBottom: 6,
      background: 'rgba(255,255,255,0.7)',
      border: `0.5px solid ${color}40`,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: THEME.text, fontWeight: 500, lineHeight: 1.3 }}>{todo.title}</div>
        {todo.due_date && (
          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
            {new Date(todo.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
      {todo.one_tap_ready && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onOneTap}
          style={{
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: G.dark, color: '#fff',
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            flexShrink: 0, marginLeft: 8,
          }}
        >
          一键办
        </motion.button>
      )}
    </div>
  )
}

// ── 主组件 ──
export default function ChildSheet({ children, sel, onSel, onClose, onAdd, todos, onOneTap }: Props) {
  const [tab, setTab] = useState<'today' | 'packing' | 'health'>('today')

  // 关联待办：标题包含孩子名字
  const relatedTodos = sel
    ? todos.filter(t => t.status === 'pending' && t.title.includes(sel.name))
    : []

  const health = healthMap[sel?.health_status || 'normal']
  const mood = moodMap[sel?.mood_status || 'calm']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: `0 0 max(calc(env(safe-area-inset-bottom) + 80px), 90px)`,
        background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(40px)',
          borderRadius: 22, overflow: 'hidden',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
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
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
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
              {/* 状态标签行 */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ padding: '4px 10px', borderRadius: 20, background: health.bg, fontSize: 11, color: health.color, fontWeight: 500 }}>
                  {health.label}
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(154,183,232,0.12)', fontSize: 11, color: THEME.navy, fontWeight: 500 }}>
                  {mood.label}
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 20, background: `${getEnergyColor(sel.energy)}22`, fontSize: 11, color: getEnergyColor(sel.energy), fontWeight: 500 }}>
                  精力 {sel.energy}%
                </div>
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

              {/* tab 切换 */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 }}>
                {(['today', 'packing', 'health'] as const).map(t => (
                  <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 9, border: 'none',
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: tab === t ? 'white' : 'transparent',
                      color: tab === t ? THEME.text : THEME.muted,
                      boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                    {{ today: '今天', packing: '携带', health: '状态' }[t]}
                  </motion.button>
                ))}
              </div>

              {/* 今天日程 */}
              {tab === 'today' && (
                !sel.today_schedule?.length ? (
                  <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>
                    今天没有特别安排
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 38, top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }} />
                    {sel.today_schedule.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 11, color: THEME.muted, minWidth: 38, textAlign: 'right', paddingTop: 3 }}>{item.time}</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.gold, marginTop: 4, flexShrink: 0, zIndex: 1 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: THEME.text }}>{item.title}</div>
                          {item.location && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.location}</div>}
                          {item.requires_action && (
                            <div style={{ fontSize: 11, color: '#E07B2A', marginTop: 4, fontWeight: 500 }}>
                              ⚠ {item.requires_action}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* 携带物品 可勾选 */}
              {tab === 'packing' && (
                !sel.packing_alerts?.length ? (
                  <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>
                    暂无携带提醒
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 8 }}>点击确认已放入包中</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sel.packing_alerts.map((alert, i) => <PackTag key={i} alert={alert} />)}
                    </div>
                  </>
                )
              )}

              {/* 健康状态 */}
              {tab === 'health' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
                    {[
                      { icon: <Thermometer size={15} />, label: '健康', value: health.label, bg: health.bg, color: health.color },
                      { icon: <Smile size={15} />, label: '心情', value: mood.label, bg: 'rgba(154,183,232,0.12)', color: THEME.navy },
                      { icon: <Zap size={15} />, label: '精力', value: `${sel.energy}%`, bg: `${getEnergyColor(sel.energy)}18`, color: getEnergyColor(sel.energy) },
                      { icon: <Moon size={15} />, label: '推算', value: 'AI实时', bg: 'rgba(212,169,106,0.12)', color: THEME.gold },
                    ].map((card, i) => (
                      <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: card.bg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <span style={{ color: card.color }}>{card.icon}</span>
                          <span style={{ fontSize: 10, color: THEME.muted }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: card.color }}>{card.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(176,141,87,0.07)', borderLeft: '3px solid rgba(176,141,87,0.35)', fontSize: 12, color: THEME.text, lineHeight: 1.7 }}>
                    精力由AI根据时间段、健康和心情实时推算，日安对话后自动更新。
                  </div>
                </div>
              )}

              {/* 关联待办 */}
              {relatedTodos.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <Bell size={12} color={THEME.gold} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: THEME.gold }}>
                      {sel.name} 相关待办 · {relatedTodos.length} 条
                    </span>
                  </div>
                  {relatedTodos.map(todo => (
                    <RelatedTodo key={todo.id} todo={todo} onOneTap={() => onOneTap(todo)} />
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
