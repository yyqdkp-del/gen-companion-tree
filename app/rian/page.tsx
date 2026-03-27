'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home as HomeIcon, FileText, ShoppingCart, Pill, Building2,
  Plane, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  X, Sprout, Zap
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// ─── 一、背景与调色盘：通透的液态清晨 ───
const THEME = {
  // 径向渐变模拟自然光散落
  ambient: 'radial-gradient(circle at 50% 30%, #E0F7FA 0%, #FCE4EC 100%)',
  text: '#2C3E50',
  gold: '#D4A96A', // 优化后的淡金色
}

// 三级提醒水珠的马卡龙内发光配色
const URGENCY_STYLE: Record<number, { glow: string; bg: string; border: string }> = {
  1: { // 预警 - 浅蓝色内发光
    glow: 'inset 5px 5px 15px rgba(225, 245, 254, 0.6)',
    bg: 'rgba(154, 183, 232, 0.2)',
    border: 'rgba(154, 183, 232, 0.3)'
  },
  2: { // 行动 - 浅绿色内发光
    glow: 'inset 5px 5px 15px rgba(232, 245, 233, 0.6)',
    bg: 'rgba(141, 200, 160, 0.3)',
    border: 'rgba(141, 200, 160, 0.4)'
  },
  3: { // 紧急 - 浅橙色内发光
    glow: 'inset 5px 5px 15px rgba(255, 224, 178, 0.6)',
    bg: 'rgba(255, 180, 100, 0.4)',
    border: 'rgba(255, 180, 100, 0.5)'
  }
}

// ─── 三、位置散落表：非线性散点布局 ───
const POSITIONS = [
  { top: '25%', left: '15%' },
  { top: '38%', right: '18%' },
  { top: '55%', left: '22%' },
  { top: '65%', right: '12%' },
  { top: '48%', left: '45%' },
]

export default function RianPage() {
  const router = useRouter()
  const [reminders, setReminders] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([
    { id: '', name: 'William', emoji: '👦🏻', energy: 85, progress: 12 },
    { id: '', name: 'Noah', emoji: '👶🏻', energy: 42, progress: 5 },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyMenu, setShowFamilyMenu] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<any>(null)
  const [allDone, setAllDone] = useState(false)

  const currentChild = children[childIndex]
  const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

  const syncData = useCallback(async () => {
    const { data: remData } = await supabase.from('reminders').select('*').eq('status', 'pending')
    setReminders(remData || [])
    setAllDone((remData || []).length === 0)
    const { data: childData } = await supabase.from('children').select('*')
    if (childData?.length) setChildren(childData)
  }, [])

  useEffect(() => {
    syncData()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [syncData])

  const markDone = async (id: string) => {
    await supabase.from('reminders').update({ status: 'done' }).eq('id', id)
    setSelectedReminder(null); syncData()
  }

  const snooze = async (id: string) => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('reminders').update({ due_date: tomorrow.toISOString() }).eq('id', id)
    setSelectedReminder(null); syncData()
  }

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', background: THEME.ambient, fontFamily: 'sans-serif',
    }}>
      {/* ─── 背景波纹：Caustics 纹理 ─── */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="water-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
        </filter>
      </svg>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* ─── 右上角：大字号背景水印 ─── */}
      <div style={{
        position: 'absolute', top: '10%', right: '5%', textAlign: 'right', 
        zIndex: 0, pointerEvents: 'none', userSelect: 'none'
      }}>
        <div style={{ fontSize: '12rem', fontWeight: 900, color: '#2C3E50', opacity: 0.04, lineHeight: 0.8 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </div>
        <div style={{ fontSize: '6rem', fontWeight: 700, color: '#2C3E50', opacity: 0.03, marginTop: '-2rem', marginRight: '1rem' }}>
          日安 · /rian
        </div>
      </div>

      {/* ─── 左上角：孩子状态中心 (带淡金色呼吸) ─── */}
      <div style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 100 }}>
        <motion.div
          onClick={() => setShowFamilyMenu(!showFamilyMenu)}
          animate={{ boxShadow: [`0 0 20px rgba(212,169,106,0.1)`, `0 0 45px rgba(212,169,106,0.4)`, `0 0 20px rgba(212,169,106,0.1)`] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ 
            width: '80px', height: '80px', borderRadius: '35% 65% 62% 38% / 30% 41% 59% 70%', 
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.8)', cursor: 'pointer' 
          }}
        >
          <span style={{ fontSize: '40px' }}>{currentChild?.emoji}</span>
        </motion.div>
        <p style={{ marginTop: '12px', fontSize: '11px', color: THEME.text, fontWeight: 'bold', letterSpacing: '0.3em', textAlign: 'center', opacity: 0.6 }}>
          {currentChild?.name}
        </p>
      </div>

      {/* ─── 核心：不规则液态水珠散落 ─── */}
      {!allDone && reminders.map((r, i) => {
        const pos = POSITIONS[i % POSITIONS.length];
        const style = URGENCY_STYLE[r.urgency_level] || URGENCY_STYLE[1];
        
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, scale: 1,
              y: [0, -15, 0],
              borderRadius: [
                "66% 34% 71% 29% / 37% 53% 47% 63%",
                "34% 66% 29% 71% / 53% 37% 63% 47%",
                "66% 34% 71% 29% / 37% 53% 47% 63%"
              ]
            }}
            transition={{ 
              duration: 8, repeat: Infinity, delay: i * 1.5,
              borderRadius: { duration: 30, repeat: Infinity, ease: "linear" }
            }}
            style={{
              position: 'absolute', ...pos, zIndex: 20,
              width: '110px', height: '110px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(25px) saturate(160%)',
              background: style.bg,
              border: `1px solid ${style.border}`,
              boxShadow: `${style.glow}, 10px 15px 30px rgba(0, 0, 0, 0.05)`,
              cursor: 'pointer', textAlign: 'center', padding: '10px'
            }}
            onClick={() => setSelectedReminder(r)}
          >
            <div style={{ opacity: 0.6, marginBottom: '4px' }}>
              {r.category === 'visa' ? <Plane size={20}/> : <Clock size={20}/>}
            </div>
            <span style={{ fontSize: '12px', color: THEME.text, fontWeight: 500, lineHeight: 1.2 }}>
              {r.title}
            </span>
            {/* 高光 */}
            <div style={{ position: 'absolute', top: '15%', left: '20%', width: '20%', height: '10%', background: 'rgba(255,255,255,0.4)', borderRadius: '50%', transform: 'rotate(-30deg)' }} />
          </motion.div>
        );
      })}

      {/* ─── 详情弹窗：深度毛玻璃面板 ─── */}
      <AnimatePresence>
        {selectedReminder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelectedReminder(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '90%', maxWidth: '400px', padding: '30px',
                background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(40px)',
                borderRadius: '40px 15px 40px 15px', border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.1)'
              }}
            >
              <h2 style={{ fontSize: '24px', color: THEME.text, marginBottom: '10px' }}>{selectedReminder.title}</h2>
              <p style={{ color: THEME.text, opacity: 0.7, fontSize: '14px', lineHeight: 1.6, marginBottom: '30px' }}>{selectedReminder.description}</p>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => markDone(selectedReminder.id)} style={{ flex: 1, padding: '15px', borderRadius: '20px', background: 'rgba(141,200,160,0.6)', border: 'none', color: '#FFF', fontWeight: 'bold' }}>完成</button>
                <button onClick={() => setSelectedReminder(null)} style={{ flex: 1, padding: '15px', borderRadius: '20px', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.05)' }}>稍后</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 底部交互：基地弹出菜单 (Spring Physics) ─── */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.3 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              style={{ 
                marginBottom: '20px', display: 'flex', gap: '15px', padding: '15px',
                background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(30px)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.5)'
              }}
            >
              {[
                { label: '基地', path: '/' },
                { label: '日安', path: '/rian' },
                { label: '树洞', path: '/treehouse' },
              ].map(item => (
                <button key={item.label} onClick={() => router.push(item.path)}
                  style={{ 
                    padding: '12px 25px', borderRadius: '20px', 
                    background: item.path === '/rian' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                    border: 'none', fontSize: '13px', fontWeight: 'bold', color: THEME.text, cursor: 'pointer' 
                  }}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ 
          width: '340px', height: '64px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(30px)', 
          border: '1px solid rgba(255,255,255,0.3)', borderRadius: '32px', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
        }} onClick={() => setShowBaseMenu(!showBaseMenu)}>
          <HomeIcon size={24} color={showBaseMenu ? THEME.gold : THEME.text} />
        </div>
      </footer>
    </main>
  )
}
