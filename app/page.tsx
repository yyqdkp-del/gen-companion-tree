'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion } from 'framer-motion'
import { Bell, Heart, Trees, Zap } from 'lucide-react'

const THEME = {
  bg: '#0D0F0E',
  card: '#1A1E1B',
  border: '#2A302C',
  primary: '#7AB89A',
  accent: '#C8A96E',
  muted: '#4A5A50',
  text: '#E8EDE9',
  textSub: '#8A9E90',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type ChildStatus = { name: string; status: string }

export default function CompanionApp() {
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<ChildStatus[]>([
    { name: 'William', status: 'active' },
    { name: 'Noah', status: 'active' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const syncData = async () => {
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])

      const { data: childData } = await supabase.from('children_status').select('name, status')
      if (childData && childData.length > 0) setChildren(childData)
    }

    syncData()

    const channel = supabase.channel('realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, syncData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children_status' }, syncData)
      .subscribe()

    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const hour = time.getHours()
  const greeting = hour < 5 ? '深夜安好' : hour < 12 ? '早安' : hour < 18 ? '午后好' : '晚安'
  const currentChild = children[childIndex]
  const statusMap: Record<string, string> = {
    sleeping: '睡眠中', active: '活跃', school: '上学中', eating: '用餐中',
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: THEME.bg, fontFamily: "'Noto Serif SC', Georgia, serif", position: 'relative', overflow: 'hidden' }}>

      {/* 环境光晕 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-20%', right: '-10%', width: '70vw', height: '70vw', borderRadius: '50%', background: `radial-gradient(circle, ${THEME.primary}40 0%, transparent 70%)` }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.04, 0.09, 0.04] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{ position: 'absolute', bottom: '10%', left: '-15%', width: '60vw', height: '60vw', borderRadius: '50%', background: `radial-gradient(circle, ${THEME.accent}30 0%, transparent 70%)` }}
        />
      </div>

      {/* 时间 */}
      <header style={{ position: 'relative', zIndex: 20, padding: '64px 32px 28px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.4em', color: THEME.muted, textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Space Mono', monospace" }}>
            {time.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <h1 style={{ fontSize: 'clamp(52px, 15vw, 80px)', fontWeight: 300, color: THEME.text, letterSpacing: '-0.02em', lineHeight: 1, margin: 0, fontFamily: "'Noto Serif SC', serif" }}>
              {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </h1>
            <span style={{ fontSize: '13px', color: THEME.textSub, letterSpacing: '0.15em' }}>{greeting}</span>
          </div>
          <div style={{ marginTop: '20px', height: '1px', width: '120px', background: `linear-gradient(to right, ${THEME.primary}60, transparent)` }} />
        </motion.div>
      </header>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}
        style={{ padding: '0 32px 28px', position: 'relative', zIndex: 20 }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.5em', color: THEME.muted, textTransform: 'uppercase', fontFamily: "'Space Mono', monospace", margin: 0 }}>
          根 · Companion System
        </p>
      </motion.div>

      {/* 卡片 */}
      <section style={{ position: 'relative', zIndex: 20, padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <BreathCard icon={<Bell size={16} />} title="任务感应" value={tasks.length > 0 ? `${tasks.length} 条` : '静默'} sub={tasks.length > 0 ? '待处理' : '系统监听中'} color={THEME.primary} alert={tasks.length > 0} delay={0.1} />
        <BreathCard icon={<Zap size={16} />} title="精力值" value="85" sub="% 良好" color={THEME.accent} alert={false} delay={0.2} />

        {/* 孩子卡 — 点击切换 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          onClick={() => setChildIndex(i => (i + 1) % children.length)}
          style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '24px', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, #C88A8A18 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#C88A8A15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C88A8A' }}>
            <Heart size={16} />
          </div>
          <div>
            <motion.p key={currentChild?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: '9px', letterSpacing: '0.3em', color: THEME.muted, textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Space Mono', monospace" }}>
              {currentChild?.name ?? '—'}
            </motion.p>
            <motion.p key={currentChild?.status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: '22px', fontWeight: 300, color: THEME.text, margin: 0, lineHeight: 1, fontFamily: "'Noto Serif SC', serif" }}>
              {statusMap[currentChild?.status] ?? currentChild?.status}
            </motion.p>
            <p style={{ fontSize: '11px', color: THEME.muted, margin: '4px 0 0' }}>
              点击切换 · {children.length} 个宝贝
            </p>
          </div>
        </motion.div>

        <BreathCard icon={<Trees size={16} />} title="清迈天气" value="28°" sub="晴朗无云" color="#8AB8C8" alert={false} delay={0.4} />
      </section>

      {/* Make 状态 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}
        style={{ position: 'relative', zIndex: 20, margin: '24px 20px 0', padding: '14px 20px', background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: THEME.primary, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: THEME.textSub, letterSpacing: '0.1em', margin: 0 }}>Make.com 自动化</p>
          <p style={{ fontSize: '13px', color: THEME.text, margin: '2px 0 0' }}>5 条路由运行中 · Grok 巡逻已激活</p>
        </div>
        <span style={{ fontSize: '10px', color: THEME.primary, letterSpacing: '0.15em', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' }}>Live</span>
      </motion.div>

      {/* 底部导航 */}
      <nav style={{ position: 'fixed', bottom: '36px', left: 0, right: 0, zIndex: 50, padding: '0 24px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }}
          style={{ maxWidth: '360px', margin: '0 auto', height: '60px', background: 'rgba(26,30,27,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '30px', border: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 28px' }}>
          {['基地', '日安', '树洞'].map((label, i) => (
            <span key={i} style={{ fontSize: '11px', letterSpacing: '0.25em', color: i === 0 ? THEME.primary : THEME.muted, fontFamily: "'Space Mono', monospace", cursor: 'pointer' }}>
              {label}
            </span>
          ))}
        </motion.div>
      </nav>

      <div style={{ height: '140px' }} />
    </main>
  )
}

function BreathCard({ icon, title, value, sub, color, alert, delay }: { icon: React.ReactNode; title: string; value: string; sub: string; color: string; alert: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.8, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      style={{ background: '#1A1E1B', border: '1px solid #2A302C', borderRadius: '24px', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {alert && (
          <motion.span animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
            style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', borderRadius: '50%', background: '#E87A6A', border: '2px solid #1A1E1B' }} />
        )}
      </div>
      <div>
        <p style={{ fontSize: '9px', letterSpacing: '0.3em', color: '#4A5A50', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Space Mono', monospace" }}>{title}</p>
        <p style={{ fontSize: '22px', fontWeight: 300, color: '#E8EDE9', margin: 0, lineHeight: 1, fontFamily: "'Noto Serif SC', serif" }}>{value}</p>
        <p style={{ fontSize: '11px', color: '#4A5A50', margin: '4px 0 0' }}>{sub}</p>
      </div>
    </motion.div>
  )
}
