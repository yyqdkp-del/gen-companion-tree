'use client'
import InstallPWA from '@/app/components/InstallPWA'
import { experimental_useObject as useObject } from 'ai/react'
import { ExecutionPackSchema } from '@/app/lib/schemas'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { experimental_useObject as useObject } from 'ai/react'
import {
  X, Plus, ChevronRight, CheckCircle2, Bell,
  Zap, Heart, AlertTriangle, Clock, Home as HomeIcon,
  Loader, BookOpen, Thermometer, Moon, Smile, Frown, Meh,
  ShoppingCart, Plane, Pill, FileText, Building2,
  Mic, Camera, MessageSquare, Phone, Send, Square, Upload,
} from 'lucide-react'
export const dynamic = 'force-dynamic'

import { createBrowserClient } from '@supabase/ssr'
import { useApp } from '@/app/context/AppContext'
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

// ══ 执行状态类型 ══
type ActionStatus = 'idle' | 'running' | 'done' | 'error'
type ActionState = { status: ActionStatus; message?: string }

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

function Tag({ color, label }: { color: string; label: string }) {
  const c: Record<string, any> = {
    green: { bg: 'rgba(141,200,160,0.2)', text: '#2A7A4A' },
    blue:  { bg: 'rgba(154,183,232,0.22)', text: '#1A5EA0' },
    gold:  { bg: 'rgba(176,141,87,0.15)', text: THEME.gold },
    red:   { bg: 'rgba(255,100,100,0.15)', text: '#CC3333' },
    gray:  { bg: 'rgba(0,0,0,0.05)', text: THEME.muted },
  }
  const s = c[color] || c.gray
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text }}>{label}</span>
}

function Card({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, background: bg, border: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ color: THEME.muted, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>{value}</div>
      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}

function ChildSheet({ children, sel, onSel, onClose, onAdd }: {
  children: Child[]; sel: Child | null; onSel: (c: Child) => void; onClose: () => void; onAdd: () => void
}) {
  const [tab, setTab] = useState<'today' | 'packing' | 'health'>('today')
  const healthMap: Record<string, string> = { normal: '健康', sick: '生病中', recovering: '恢复中' }
  const moodMap: Record<string, string> = { happy: '开心', calm: '平静', anxious: '焦虑', upset: '低落' }

  return (
    <BottomSheet onClose={onClose} title="孩子">
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {children.map(c => (
          <motion.div key={c.id} whileTap={{ scale: 0.9 }} onClick={() => onSel(c)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: sel?.id === c.id ? 1 : 0.32 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: sel?.id === c.id ? 'rgba(176,141,87,0.12)' : 'rgba(0,0,0,0.05)', border: sel?.id === c.id ? '2px solid rgba(176,141,87,0.5)' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{c.emoji}</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text, letterSpacing: '0.1em' }}>{c.name}</span>
            <div style={{ width: 40, height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${c.energy}%` }} style={{ height: '100%', background: getEnergyColor(c.energy), borderRadius: 2 }} />
            </div>
          </motion.div>
        ))}
        <motion.div whileTap={{ scale: 0.9 }} onClick={onAdd}
          style={{ width: 52, height: 52, borderRadius: '50%', border: '2px dashed rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: THEME.muted }}>
          <Plus size={20} />
        </motion.div>
      </div>

      {!sel ? (
        <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 14, color: THEME.text }}>选择孩子查看状态</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Tag color={sel.health_status === 'sick' ? 'red' : 'green'} label={healthMap[sel.health_status || 'normal']} />
            <Tag color="blue" label={moodMap[sel.mood_status || 'calm']} />
            <Tag color="gold" label={`精力 ${sel.energy}%`} />
          </div>
          {(sel.urgent_items || []).map((item, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 8, borderLeft: `3px solid ${item.level === 'red' ? '#FF6B6B' : item.level === 'orange' ? '#FF8C00' : '#FACC15'}`, background: item.level === 'red' ? 'rgba(255,100,100,0.09)' : item.level === 'orange' ? 'rgba(255,160,60,0.09)' : 'rgba(255,210,80,0.09)', fontSize: 13, color: THEME.text, lineHeight: 1.5 }}>
              {item.title}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4 }}>
            {(['today', 'packing', 'health'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t ? 'white' : 'transparent', color: tab === t ? THEME.text : THEME.muted, boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.07)' : 'none', transition: '0.2s' }}>
                {{ today: '今天', packing: '携带', health: '状态' }[t]}
              </button>
            ))}
          </div>
          {tab === 'today' && (
            !sel.today_schedule?.length ? (
              <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>今天没有特别安排</div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 38, top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.06)' }} />
                {sel.today_schedule.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, color: THEME.muted, minWidth: 38, textAlign: 'right', paddingTop: 3 }}>{item.time}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.gold, marginTop: 4, flexShrink: 0, zIndex: 1 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{item.title}</div>
                      {item.location && <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{item.location}</div>}
                      {item.requires_action && <div style={{ fontSize: 11, color: '#E07B2A', marginTop: 4, fontWeight: 600 }}>⚠ {item.requires_action}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tab === 'packing' && (
            !sel.packing_alerts?.length ? (
              <div style={{ textAlign: 'center', opacity: 0.32, padding: '20px 0', fontSize: 13, color: THEME.text }}>暂无携带提醒</div>
            ) : sel.packing_alerts.map((item, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 12, marginBottom: 8, border: '1px solid rgba(0,0,0,0.07)', background: item.level === 'today' ? 'rgba(255,160,60,0.07)' : 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{item.item}</div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    {item.level === 'today' ? '📦 今天出门带' : item.level === 1 ? `🛒 还有${item.days_left}天·需购买` : item.level === 2 ? `📋 还有${item.days_left}天·提前准备` : '⏰ 明天要带'}
                  </div>
                </div>
                {item.need_buy && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,160,60,0.14)', color: '#B06020', fontWeight: 700 }}>需购买</span>}
              </div>
            ))
          )}
          {tab === 'health' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <Card icon={<Thermometer size={16} />} label="健康" value={healthMap[sel.health_status || 'normal']} bg="rgba(141,200,160,0.18)" />
                <Card icon={<Smile size={16} />} label="心情" value={moodMap[sel.mood_status || 'calm']} bg="rgba(154,183,232,0.18)" />
                <Card icon={<Zap size={16} />} label="精力" value={`${sel.energy}%`} bg={`${getEnergyColor(sel.energy)}22`} />
                <Card icon={<Moon size={16} />} label="推算方式" value="AI实时" bg="rgba(212,169,106,0.18)" />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(176,141,87,0.07)', borderLeft: '3px solid rgba(176,141,87,0.35)', fontSize: 12, color: THEME.text, lineHeight: 1.7 }}>
                精力由AI根据时间段、健康和心情实时推算，日安对话后自动更新。
              </div>
            </div>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/rian'}
            style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 16, border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.08)', fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            去日安说说关于孩子的事 <ChevronRight size={14} />
          </motion.button>
        </>
      )}
    </BottomSheet>
  )
}

function TodoSheet({ todos, onClose, onAction }: { todos: TodoItem[]; onClose: () => void; onAction: (t: TodoItem) => void }) {
  const [filter, setFilter] = useState<'all' | 'today' | 'delegated'>('all')
  const cfg: Record<string, any> = {
    red:    { label: '今天必须', bg: 'rgba(255,100,100,0.09)', border: '#FF6B6B', dot: '#FF4444' },
    orange: { label: '3天内',   bg: 'rgba(255,160,60,0.09)',  border: '#FF8C00', dot: '#FF8C00' },
    yellow: { label: '本周',    bg: 'rgba(255,210,80,0.09)',  border: '#FACC15', dot: '#E6B800' },
    green:  { label: '本月',    bg: 'rgba(141,200,160,0.09)', border: '#4ADE80', dot: '#22C55E' },
    blue:   { label: '长期',    bg: 'rgba(154,183,232,0.09)', border: '#60A5FA', dot: '#3B82F6' },
    grey:   { label: '等待中',  bg: 'rgba(0,0,0,0.03)',       border: 'rgba(0,0,0,0.1)', dot: '#9CA3AF' },
  }
  const catIcon: Record<string, React.ReactNode> = {
    compliance: <FileText size={13} />, medical: <Pill size={13} />,
    education: <BookOpen size={13} />, shopping: <ShoppingCart size={13} />,
    mobility: <Plane size={13} />, estate: <Building2 size={13} />,
  }
  const redCount = todos.filter(t => t.priority === 'red').length
  const list = (filter === 'today' ? todos.filter(t => t.priority === 'red')
    : filter === 'delegated' ? todos.filter(t => t.delegated_to) : todos)
    .sort((a, b) => {
      const o: Record<string, number> = { red: 0, orange: 1, yellow: 2, green: 3, blue: 4, grey: 5 }
      return (o[a.priority] ?? 5) - (o[b.priority] ?? 5)
    })

  return (
    <BottomSheet onClose={onClose} title="妈妈待办">
      {redCount > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 14, background: 'rgba(255,100,100,0.09)', border: '1px solid rgba(255,100,100,0.2)', fontSize: 13, color: '#CC3333', fontWeight: 600 }}>
          今天有 {redCount} 件必须处理的事
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['all', 'today', 'delegated'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f ? THEME.gold : 'rgba(0,0,0,0.1)'}`, fontSize: 12, cursor: 'pointer', background: filter === f ? 'rgba(176,141,87,0.09)' : 'transparent', color: filter === f ? THEME.gold : THEME.muted, fontWeight: 600 }}>
            {{ all: '全部', today: '今天', delegated: '委托中' }[f]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.32, padding: '24px 0', fontSize: 13, color: THEME.text }}>🌸 暂无待办</div>
        ) : list.map(todo => {
          const c = cfg[todo.priority] || cfg.grey
          return (
            <div key={todo.id} style={{ padding: '12px 14px', borderRadius: 14, background: c.bg, borderLeft: `3px solid ${c.border}`, border: `1px solid ${c.border}28` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: THEME.muted }}>{catIcon[todo.category || ''] || <Clock size={13} />}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{todo.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: c.border, fontWeight: 600 }}>
                    {c.label}{todo.due_date ? ` · ${todo.due_date}` : ''}{todo.delegated_to ? ` · 委托给${todo.delegated_to}` : ''}
                  </div>
                  {todo.ai_draft && (
                    <div style={{ marginTop: 7, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.06)', fontSize: 12, color: THEME.muted, fontStyle: 'italic' }}>
                      AI草稿：{todo.ai_draft.substring(0, 50)}…
                    </div>
                  )}
                </div>
                {todo.one_tap_ready && (
                  <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAction(todo)}
                    style={{ padding: '7px 13px', borderRadius: 10, border: 'none', background: c.border, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    一键办
                  </motion.button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = '/rian'}
        style={{ width: '100%', marginTop: 18, padding: '13px', borderRadius: 16, border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.08)', fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        去日安添加新事项 <ChevronRight size={14} />
      </motion.button>
    </BottomSheet>
  )
}

function HotspotSheet({ hotspots, onClose, onPatrol, patrolling, onHotspotAction }: {
  hotspots: HotspotItem[]
  onClose: () => void
  onPatrol: () => void
  patrolling: boolean
  onHotspotAction: (item: HotspotItem) => void
}) {
  const ucfg: Record<string, any> = {
    urgent:    { label: '紧急', color: '#FF4444', bg: 'rgba(255,100,100,0.09)', border: '#FF6B6B' },
    important: { label: '重要', color: '#E07B2A', bg: 'rgba(255,160,60,0.09)',  border: '#FF8C00' },
    lifestyle: { label: '生活', color: '#3B82F6', bg: 'rgba(154,183,232,0.09)', border: '#60A5FA' },
  }
  const catEmoji: Record<string, string> = { safety: '🚨', education: '📚', visa: '📋', finance: '💰', health: '🏥', shopping: '🛍', mom: '💆', weather: '🌤' }
  const sorted = [...hotspots].sort((a, b) => ({ urgent: 0, important: 1, lifestyle: 2 } as any)[a.urgency] - ({ urgent: 0, important: 1, lifestyle: 2 } as any)[b.urgency])

  return (
    <BottomSheet onClose={onClose} title="热点提示">
      {hotspots.some(h => h.urgency === 'urgent') && (
        <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 14, background: 'rgba(255,100,100,0.09)', border: '1px solid rgba(255,100,100,0.2)', fontSize: 13, color: '#CC3333', fontWeight: 600 }}>⚡ 有紧急信息需要关注</div>
      )}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0', fontSize: 13, color: THEME.text }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌸</div>
        今天暂无热点提示
        </div>
      ) : sorted.map(item => {
        const c = ucfg[item.urgency] || ucfg.lifestyle
        const actionLabel = item.action_type === 'navigate' ? '导航前往'
          : item.action_type === 'add_todo' ? '加入待办'
          : item.action_data?.action_label || '查看详情'
        return (
          <div key={item.id} style={{ padding: 14, borderRadius: 14, background: c.bg, border: `1px solid ${c.border}35`, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{catEmoji[item.category] || '📌'}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${c.color}1A`, color: c.color, fontWeight: 700 }}>{c.label}</span>
              </div>
              <span style={{ fontSize: 10, color: THEME.muted }}>{new Date(item.created_at).toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 5 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.6, marginBottom: 5 }}>{item.summary}</div>
            {item.relevance_reason && <div style={{ fontSize: 11, color: THEME.gold, fontStyle: 'italic' }}>和你有关：{item.relevance_reason}</div>}
            {item.action_available && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onHotspotAction(item)}
                style={{ marginTop: 10, padding: '7px 16px', borderRadius: 10, border: `1px solid ${c.border}`, background: 'transparent', color: c.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {actionLabel} →
              </motion.button>
            )}
          </div>
        )
      })}
     <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
        <motion.button whileTap={{ scale: 0.93 }} onClick={onPatrol}
          style={{ padding: '7px 16px', borderRadius: 12, border: '1px solid rgba(176,141,87,0.3)', background: 'rgba(176,141,87,0.08)', fontSize: 12, color: THEME.gold, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {patrolling ? <><Loader size={12} /> 巡逻中…</> : '立即巡逻'}
        </motion.button>
      </div>
    </BottomSheet>
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
    } catch (e) {
      console.error('上传失败', e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="添加孩子">
      {/* 照片/头像选择 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => photoInputRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: avatarUrl ? 'transparent' : 'rgba(176,141,87,0.08)',
              border: '2px dashed rgba(176,141,87,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
            }}>
            {avatarUrl ? (
              <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : uploading ? (
              <Loader size={20} color={THEME.gold} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Camera size={20} color={THEME.gold} />
                <div style={{ fontSize: 9, color: THEME.gold, marginTop: 3 }}>上传照片</div>
              </div>
            )}
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
    </BottomSheet>
  )
}
  

// ══ 动作执行按钮：显示状态 ══
function ActionButton({ action, state, onClick }: {
  action: any
  state: ActionState
  onClick: () => void
}) {
  const actionIcon: Record<string, string> = {
    navigate: '🗺️', email: '📧', whatsapp: '💬',
    calendar: '📅', download_pdf: '📄', open_url: '🔗',
    pay: '💰', buy: '🛒', call: '📞',
  }

  const bgColor = state.status === 'done'
    ? 'rgba(34,197,94,0.12)'
    : state.status === 'error'
    ? 'rgba(239,68,68,0.1)'
    : 'rgba(26,60,94,0.06)'

  const borderColor = state.status === 'done'
    ? 'rgba(34,197,94,0.3)'
    : state.status === 'error'
    ? 'rgba(239,68,68,0.25)'
    : 'rgba(26,60,94,0.2)'

  const textColor = state.status === 'done'
    ? '#16A34A'
    : state.status === 'error'
    ? '#DC2626'
    : THEME.navy

  return (
    <motion.button
      whileTap={{ scale: state.status === 'running' ? 1 : 0.95 }}
      onClick={state.status === 'running' || state.status === 'done' ? undefined : onClick}
      style={{
        padding: '9px 16px', borderRadius: 12,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        fontSize: 12, color: textColor, fontWeight: 600,
        cursor: state.status === 'running' || state.status === 'done' ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all 0.2s',
      }}
    >
      {state.status === 'running' ? (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader size={12} />
        </motion.div>
      ) : state.status === 'done' ? (
        <CheckCircle2 size={12} />
      ) : (
        <span>{actionIcon[action.type] || '▶️'}</span>
      )}
      {state.status === 'done' ? (state.message || '已完成') : action.label}
    </motion.button>
  )
}

// ══ 全部执行进度条 ══
function ExecuteAllProgress({ total, done, running }: { total: number; done: number; running: boolean }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: THEME.muted }}>
        <span>{running ? '正在逐项执行…' : done === total ? '全部完成 🎉' : `${done} / ${total} 完成`}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: '100%', background: done === total ? '#22C55E' : THEME.gold, borderRadius: 2 }}
        />
      </div>
    </div>
  )
}

function OneTapSheet({ todo, onClose, executionPack, smartLoading, onExecuteAction, onExecuteAll, actionStates, executeAllRunning, executeAllDone }: {
  todo: TodoItem
  onClose: () => void
  executionPack: any
  smartLoading: boolean
  onExecuteAction: (action: any, index: number) => void
  onExecuteAll: () => void
  actionStates: ActionState[]
  executeAllRunning: boolean
  executeAllDone: boolean
}) {
  const statusLabel = { ready: '✅', missing: '❌', optional: '○' }
  const actions = executionPack?.actions || []
  const doneCount = actionStates.filter(s => s.status === 'done').length

  return (
    <BottomSheet onClose={onClose} title="智能办理">
      {/* 待办标题 */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>{todo.title}</div>
        {todo.ai_draft && <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, lineHeight: 1.6 }}>{todo.ai_draft}</div>}
      </div>

      {/* 加载中 */}
      {smartLoading && (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 12 }}>
            <Loader size={28} color={THEME.gold} />
          </motion.div>
          <div style={{ fontSize: 13, color: THEME.muted }}>根正在搜索最新信息...</div>
         <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, opacity: 0.7 }}>实时搜索 + 档案比对 + AI分析</div>
        </div>
      )}

      {/* 执行包 */}
      {!smartLoading && executionPack && (
        <>
          {/* Grok摘要 */}
          {executionPack.summary && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(176,141,87,0.08)', borderLeft: '3px solid rgba(176,141,87,0.4)', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, marginBottom: 4 }}>🔍 根帮你查了</div>
              <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7 }}>{executionPack.summary}</div>
            </div>
          )}

          {/* 材料清单 */}
          {executionPack.checklist?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em' }}>📋 材料清单</div>
              {executionPack.checklist.map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 10, marginBottom: 6, background: item.status === 'missing' ? 'rgba(239,68,68,0.06)' : item.status === 'ready' ? 'rgba(34,197,94,0.06)' : 'rgba(0,0,0,0.03)', border: `1px solid ${item.status === 'missing' ? 'rgba(239,68,68,0.15)' : item.status === 'ready' ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.06)'}` }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{statusLabel[item.status as keyof typeof statusLabel] || '○'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{item.item}</div>
                    {item.note && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.note}</div>}
                  </div>
                  {item.action && item.action !== 'null' && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(176,141,87,0.12)', color: THEME.gold, fontWeight: 700, flexShrink: 0 }}>
                      {({'buy': '需购买', 'print': '需打印', 'prepare': '需准备', 'download': '需下载'} as Record<string, string>)[item.action] || item.action}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 携带物品 */}
          {executionPack.carry_items?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em' }}>🎒 携带物品</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {executionPack.carry_items.map((item: string, i: number) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(154,183,232,0.15)', color: THEME.navy, fontSize: 12, fontWeight: 600 }}>{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* 出发建议 */}
          {executionPack.depart_suggestion && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(154,183,232,0.1)', marginBottom: 14, fontSize: 13, color: THEME.text }}>
              🕐 {executionPack.depart_suggestion}
            </div>
          )}

          {/* 费用估算 */}
          {executionPack.cost_estimate && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(176,141,87,0.08)', marginBottom: 14, fontSize: 13, color: THEME.gold, fontWeight: 600 }}>
              💰 {executionPack.cost_estimate}
            </div>
          )}

          {/* 风险提示 */}
          {executionPack.risk_warnings?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {executionPack.risk_warnings.map((w: string, i: number) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,100,100,0.06)', border: '1px solid rgba(255,100,100,0.15)', fontSize: 12, color: '#CC3333', marginBottom: 6 }}>
                  ⚠️ {w}
                </div>
              ))}
            </div>
          )}

          {/* 草稿预览 */}
          {executionPack.draft && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em' }}>📝 草稿内容</div>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)', fontSize: 13, color: THEME.text, lineHeight: 1.7, fontStyle: 'italic', maxHeight: 120, overflow: 'auto' }}>
                {executionPack.draft}
              </div>
            </div>
          )}

          {/* ══ 执行动作区 ══ */}
          {actions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em' }}>⚡ 执行动作</div>

              {/* 全部执行进度（执行中才显示） */}
              {executeAllRunning && (
                <ExecuteAllProgress
                  total={actions.length}
                  done={doneCount}
                  running={executeAllRunning}
                />
              )}
              {executeAllDone && !executeAllRunning && (
                <ExecuteAllProgress
                  total={actions.length}
                  done={actions.length}
                  running={false}
                />
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {actions.map((action: any, i: number) => (
                  <ActionButton
                    key={i}
                    action={action}
                    state={actionStates[i] || { status: 'idle' }}
                    onClick={() => onExecuteAction(action, i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
              style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
              稍后再说
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={executeAllDone ? onClose : onExecuteAll}
              disabled={executeAllRunning}
              style={{
                flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                background: executeAllDone ? '#22C55E' : executeAllRunning ? 'rgba(0,0,0,0.08)' : THEME.navy,
                color: executeAllRunning ? THEME.muted : '#fff',
                fontSize: 14, fontWeight: 600, cursor: executeAllRunning ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.3s',
              }}>
              {executeAllRunning
                ? <><Loader size={16} /> 执行中…</>
                : executeAllDone
                ? <><CheckCircle2 size={16} /> 已全部完成</>
                : <><Zap size={16} /> 全部执行</>
              }
            </motion.button>
          </div>
        </>
      )}

      {/* 没有执行包时的fallback */}
      {!smartLoading && !executionPack && (
        <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5, fontSize: 13, color: THEME.text }}>
          点击下方按钮开始智能分析
        </div>
      )}
    </BottomSheet>
  )
}

function InputSheet({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), input_type: 'text', user_id: userId })
      })
      onClose()
    } catch (e) { console.error(e) }
    setSending(false)
  }

  return (
    <BottomSheet onClose={onClose} title="告诉根">
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="说什么都行，根来帮你整理…"
        style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.55)', fontSize: 14, color: THEME.text, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
      <motion.button whileTap={{ scale: 0.97 }} disabled={!text.trim() || sending}
        onClick={handleSend}
        style={{ width: '100%', marginTop: 12, padding: '14px', borderRadius: 16, border: 'none', background: text.trim() ? THEME.navy : 'rgba(0,0,0,0.08)', color: text.trim() ? '#fff' : THEME.muted, fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
        {sending ? '发送中…' : '发送给根 →'}
      </motion.button>
    </BottomSheet>
  )
}

// ══════════════════════════════════════════════════════════════
// 主页面
// ══════════════════════════════════════════════════════════════
export default function BasePage() {
  const router = useRouter()

  // ── 从 AppContext 取全局数据 ──
  const { userId, userIdRef, kids, todos, hotspots, loading, sync: ctxSync } = useApp()

  const [time, setTime] = useState(new Date())
  const [selKid, setSelKid] = useState<Child | null>(null)
  const [modal, setModal] = useState<'child' | 'todo' | 'hotspot' | 'addChild' | 'oneTap' | 'input' | null>(null)
  const [oneTapTodo, setOneTapTodo] = useState<TodoItem | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [patrolling, setPatrolling] = useState(false)
  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const {
  object: executionPack,
  submit: submitSmartAction,
  isLoading: smartLoading,
  stop: stopSmartAction,
} = useObject({
  api: '/api/todo/smart-action',
  schema: ExecutionPackSchema,
})
const [actionStates, setActionStates] = useState<ActionState[]>([])
const [executeAllRunning, setExecuteAllRunning] = useState(false)
const [executeAllDone, setExecuteAllDone] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ── 孩子详情查询（主页专属，补充日程/健康详情）──
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
          title: s.subject,
          location: s.location,
          requires_action: s.requires_items?.length ? `带：${s.requires_items.join('、')}` : undefined
        })),
        ...(evtRes.data || []).map((e: any) => ({
          time: '', title: e.title, requires_action: e.requires_action
        }))
      ].sort((a, b) => a.time.localeCompare(b.time))
      return {
        id: c.id, name: c.name || c.nickname || '孩子', emoji: c.emoji || '👶🏻',
        energy, health_status: log?.health_status || 'normal', mood_status: log?.mood_status || 'calm',
        school_name: c.school_name, grade: c.grade, today_schedule,
      }
    }))
    setSelKid(prev => prev ? enriched.find(c => c.id === prev.id) || enriched[0] : enriched[0])
  }, [])


  // ── userId 就绪后查孩子详情 ──
  useEffect(() => {
    if (userId) enrichKids(userId)
  }, [userId, enrichKids])

  // ── 时钟 ──
 useEffect(() => {
  setMounted(true)
  const ticker = setInterval(() => setTime(new Date()), 1000)
  return () => clearInterval(ticker)
}, [])

  const handleAddChild = async (d: any) => {
    let uid: string | undefined
    const { data: { session } } = await supabase.auth.getSession()
    uid = session?.user?.id
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) return
      await supabase.from('children').insert({
      user_id: uid, name: d.name, emoji: d.emoji || '👶🏻',
      energy: 75, status: 'active', school_name: d.school_name, grade: d.grade
    })
    await ctxSync()
    setModal(null)
  }
  // ══ 单个动作执行（真实深链接）══
  const handleExecuteAction = async (action: any, index: number) => {
    // 更新为 running
    setActionStates(prev => {
      const next = [...prev]
      next[index] = { status: 'running' }
      return next
    })

    try {
      let successMsg = '已完成'

      switch (action.type) {
        // ── 导航：Google Maps 深链接 ──
        case 'navigate': {
          const dest = action.data?.destination || ''
          const url = action.data?.url
            || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`
          window.open(url, '_blank')
          successMsg = '已打开导航'
          break
        }

        // ── 打电话：tel: 深链接 ──
        case 'call': {
          const phone = action.data?.phone || ''
          if (phone) {
            window.location.href = `tel:${phone.replace(/\s/g, '')}`
            successMsg = `拨打 ${phone}`
          } else {
            throw new Error('无电话号码')
          }
          break
        }

        // ── 打开网址 ──
        case 'open_url': {
          const url = action.data?.url
          if (url) window.open(url, '_blank')
          successMsg = '已打开'
          break
        }

        // ── 日历：Google Calendar 深链接 ──
        case 'calendar': {
          const title = encodeURIComponent(action.data?.calendar_title || oneTapTodo?.title || '')
          const date = (action.data?.calendar_date || '').replace(/-/g, '')
          const time = (action.data?.calendar_time || '09:00').replace(':', '')
          const loc = encodeURIComponent(action.data?.calendar_location || '')
          // 优先尝试系统日历（iOS/Android），降级到 Google Calendar
          const googleCal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}T${time}00/${date}T${time}00&location=${loc}`

          // 同时通过 Make webhook 写入
          if (process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL) {
            fetch('/api/todo/smart-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ todo_id: oneTapTodo?.id, user_id: userId, execute_action: action })
            }).catch(() => {})
          }

          window.open(googleCal, '_blank')
          successMsg = '已加入日历'
          break
        }

        // ── 邮件：mailto: 深链接 ──
        case 'email': {
          const to = action.data?.email_to || ''
          const subject = encodeURIComponent(action.data?.email_subject || '')
          const body = encodeURIComponent(action.data?.email_body || '')
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`

          // 同时走 Make webhook
          fetch('/api/todo/smart-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ todo_id: oneTapTodo?.id, user_id: userId, execute_action: action })
          }).catch(() => {})

          successMsg = '已打开邮件'
          break
        }

        // ── WhatsApp 深链接 ──
        case 'whatsapp': {
          const phone = (action.data?.phone || '').replace(/\D/g, '')
          const msg = encodeURIComponent(action.data?.message || '')
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
          successMsg = '已打开 WhatsApp'
          break
        }

        // ── PDF 表格：打开官方页面 ──
        case 'download_pdf': {
          const officialUrl = action.data?.pdf_data?.official_url || action.data?.pdf_data?.download_url
          if (officialUrl) window.open(officialUrl, '_blank')
          else {
            // Fallback: 搜索
            const q = encodeURIComponent(action.data?.pdf_type || 'form')
            window.open(`https://www.google.com/search?q=${q}+download+fillable+PDF`, '_blank')
          }
          successMsg = '已打开表格页面'
          break
        }

        // ── 付款提示 ──
        case 'pay': {
          const note = action.data?.note || action.data?.channel || '请按提示方式缴费'
          setActionFeedback(`💰 ${note}`)
          setTimeout(() => setActionFeedback(null), 5000)
          successMsg = '已查看缴费方式'
          break
        }

        // ── 购买（Lazada/Shopee 搜索） ──
        case 'buy': {
          const item = encodeURIComponent(action.data?.item || action.label || '')
          const channel = action.data?.channel || 'lazada'
          const urls: Record<string, string> = {
            lazada: `https://www.lazada.co.th/catalog/?q=${item}`,
            shopee: `https://shopee.co.th/search?keyword=${item}`,
          }
          window.open(urls[channel] || urls.lazada, '_blank')
          successMsg = '已打开购物'
          break
        }

        default:
          successMsg = '已完成'
      }

      setActionStates(prev => {
        const next = [...prev]
        next[index] = { status: 'done', message: successMsg }
        return next
      })

    } catch (e: any) {
      setActionStates(prev => {
        const next = [...prev]
        next[index] = { status: 'error', message: e.message || '执行失败' }
        return next
      })
      setActionFeedback(`❌ ${e.message || '执行失败'}`)
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  // ══ 全部执行：逐项执行，每项有状态，最后才标 done ══
  const handleExecuteAll = async () => {
    if (!executionPack?.actions?.length) return
    setExecuteAllRunning(true)
    setExecuteAllDone(false)

    const actions = executionPack.actions
    for (let i = 0; i < actions.length; i++) {
      // 跳过已完成的
      if (actionStates[i]?.status === 'done') continue
      await handleExecuteAction(actions[i], i)
      // 每个动作之间稍微停一下，避免浏览器拦截多个 window.open
      await new Promise(r => setTimeout(r, 600))
    }

    // 所有动作完成后，才标 todo 为 done
    if (oneTapTodo) {
      await supabase.from('todo_items').update({
        status: 'done',
        completed_at: new Date().toISOString()
      }).eq('id', oneTapTodo.id)
      ctxSync()
    }

    setExecuteAllRunning(false)
    setExecuteAllDone(true)
    setActionFeedback('✅ 全部办理完成')
    setTimeout(() => setActionFeedback(null), 3000)
  }

  const handleHotspotAction = async (item: HotspotItem) => {
    if (item.action_type === 'navigate' && item.action_data?.destination) {
      window.open(`https://maps.google.com?q=${encodeURIComponent(item.action_data.destination)}`, '_blank')
    } else if (item.action_type === 'add_todo') {
      if (!userId) return
      await supabase.from('todo_items').insert({
        user_id: userId, title: item.title,
        priority: item.urgency === 'urgent' ? 'red' : 'orange',
        status: 'pending', category: item.category,
      })
      setActionFeedback('✅ 已加入待办')
      setTimeout(() => setActionFeedback(null), 3000)
      ctxSync()
    } else {
      await supabase.from('hotspot_items').update({ status: 'read' }).eq('id', item.id)
      ctxSync()
    }
  }

const handleOneTap = async (todo: TodoItem) => {
  const existingPack = todo.ai_action_data?.execution_pack
  if (existingPack && existingPack.actions?.length > 0) {
    setActionStates((existingPack.actions || []).map(() => ({ status: 'idle' as ActionStatus })))
    return
  }
  setActionStates([])
  setExecuteAllRunning(false)
  setExecuteAllDone(false)
  submitSmartAction({ todo_id: todo.id, user_id: userId })
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
const uploadStatusText: Record<string, string> = { idle: '', uploading: '处理中…', done: '✓ 已添加', error: '处理失败' }

 const sendCommand = async () => {
    if (!inputText.trim()) return
    const uid = userId || localStorage.getItem('app_user_id') || ''
    if (!uid) {
      window.location.href = '/auth'
      return
    }
    try {
      await fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputText.trim(), input_type: 'text', user_id: uid })
      })
      setInputText('')
      setInputMode('none')
      ctxSync()
    } catch (e) { console.error(e) }
  }
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await uploadFile(audioBlob, 'audio', `voice_${Date.now()}.webm`)
      }
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch { alert('请允许麦克风权限') }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const uploadFile = async (file: Blob | File, category: string, filename?: string) => {
    setUploading(true)
    setUploadStatus('uploading')
    try {
      const name = filename || (file instanceof File ? file.name : `file_${Date.now()}`)
      const path = `uploads/${category}/${Date.now()}_${name}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      const isImage = file.type.startsWith('image/')
      await fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: isImage ? '请分析这张图片，提取所有需要跟进的事件' : `文件已上传：${name}，请提取关键事件`,
          input_type: isImage ? 'image' : category,
          file_url: urlData.publicUrl,
          user_id: userId || localStorage.getItem('app_user_id') || '',
        })
      })
      setUploadStatus('done')
      ctxSync()
      setTimeout(() => { setUploadStatus('idle'); setInputMode('none') }, 1500)
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 2000)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const category = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'document' : 'other'
    await uploadFile(file, category)
  }
    const cState = dropState('child', selKid) as any
  const tState = dropState('todo', todos) as any
  const hState = dropState('hotspot', hotspots) as any
  const redCount = todos.filter(t => t.priority === 'red').length
  const unread = hotspots.filter(h => h.status === 'unread').length
  const childUrgent = (selKid?.urgent_items || []).filter(i => i.level === 'red').length
  const hour = time.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  return (
  
  <main style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: THEME.bg, fontFamily: 'sans-serif' }}>
  <button
    onClick={() => {
      const keys = Object.keys(localStorage)
      const sbKey = keys.find(k => k.includes('supabase') || k.includes('sb-'))
      const val = sbKey ? localStorage.getItem(sbKey) : 'NOT FOUND'
      alert(`userId: ${localStorage.getItem('app_user_id')}\nSB Key: ${sbKey}\nHas Session: ${val !== 'NOT FOUND' && val !== null}\nAll keys: ${keys.join(', ')}`)
    }}
    style={{
      position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, padding: '8px 16px', background: 'rgba(0,0,0,0.7)',
      color: 'white', borderRadius: 8, border: 'none', fontSize: 12
    }}
  >
    调试
  </button>
    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
  <div style={{ position: 'absolute', top: '12%', right: '-4%', fontSize: 'clamp(60px, 18vw, 130px)', fontWeight: 'bold', color: THEME.text, opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1, userSelect: 'none' }}>根·陪伴</div>
     <AnimatePresence>
       {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', padding: '10px 20px', borderRadius: 20, fontSize: 14, fontWeight: 600, color: THEME.text, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', whiteSpace: 'nowrap' }}>
            {actionFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'absolute', top: '5%', left: '5%', zIndex: 100 }}>
        {kids.length > 0 ? (
          <div>
            <motion.div onClick={() => setModal('child')}
              animate={{ boxShadow: [`0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`, `0 0 35px ${getEnergyColor(selKid?.energy ?? 75)}80`, `0 0 15px ${getEnergyColor(selKid?.energy ?? 75)}40`] }}
              transition={{ duration: 4, repeat: Infinity }}
              style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer', fontSize: 34 }}>
              {selKid?.emoji || '👶🏻'}
            </motion.div>
            <p style={{ marginTop: 8, fontSize: 10, color: THEME.text, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center' }}>{selKid?.name}</p>
            <div style={{ width: 56, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '3px auto', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${selKid?.energy ?? 75}%` }} style={{ height: '100%', background: getEnergyColor(selKid?.energy ?? 75) }} />
            </div>
          </div>
        ) : (
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setModal('addChild')}
  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
  <div style={{
    width: 68, height: 68, borderRadius: '50%',
    background: 'rgba(255,255,255,0.45)',
    border: '2px dashed rgba(255,255,255,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32
  }}>
    🌱
  </div>
  <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, letterSpacing: '0.15em' }}>添加孩子</span>
</motion.div>
    )}
      </div>

      <header style={{ position: 'absolute', top: '5%', right: '6%', zIndex: 50, textAlign: 'right' }}>
  <h1 style={{ fontSize: 'clamp(48px, 15vw, 76px)', fontWeight: 100, color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
    {mounted ? `${time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}` : '--:--'}
  </h1>
  <p style={{ fontSize: 10, color: THEME.text, opacity: 0.35, letterSpacing: '0.25em', marginTop: 3 }}>
    {mounted ? greeting : ''}
  </p>
</header>

      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: 13, color: THEME.text, opacity: 0.4, letterSpacing: '0.2em' }}>根·启动中…</motion.div>
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

      <AnimatePresence>
        {modal === 'child' && <ChildSheet key="child" children={kids} sel={selKid} onSel={c => setSelKid(c)} onClose={() => setModal(null)} onAdd={() => setModal('addChild')} />}
        {modal === 'todo' && <TodoSheet key="todo" todos={todos} onClose={() => setModal(null)} onAction={async t => {
          setOneTapTodo(t)
          setModal('oneTap')
          await handleOneTap(t)
        }} />}
        {modal === 'hotspot' && <HotspotSheet key="hotspot" hotspots={hotspots} onClose={() => setModal(null)} onPatrol={handlePatrol} patrolling={patrolling} onHotspotAction={handleHotspotAction} />}
        {modal === 'addChild' && <AddChildSheet key="add" onClose={() => setModal(null)} onSave={handleAddChild} />}
        {modal === 'oneTap' && oneTapTodo && (
          <OneTapSheet
            key="onetap"
            todo={oneTapTodo}
            onClose={() => { setOneTapTodo(null); setModal('todo'); setExecutionPack(null) }}
            executionPack={executionPack}
            smartLoading={smartLoading}
            onExecuteAction={handleExecuteAction}
            onExecuteAll={handleExecuteAll}
            actionStates={actionStates}
            executeAllRunning={executeAllRunning}
            executeAllDone={executeAllDone}
          />
        )}
        {modal === 'input' && <InputSheet key="input" onClose={() => setModal(null)} userId={userId} />}
      </AnimatePresence>
    <InstallPWA />
      <AnimatePresence>
        {showInstall && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 100, left: 16, right: 16,
              zIndex: 9999, background: 'rgba(26,60,94,0.95)',
              backdropFilter: 'blur(20px)', borderRadius: 20,
              padding: '20px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
                  📱 添加到主屏幕
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  点击底部分享按钮<br/>选择「添加到主屏幕」
                </p>
              </div>
              <button
                onClick={() => setShowInstall(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', padding: 4 }}
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
