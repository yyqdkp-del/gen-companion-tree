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

// ─── 与首页完全一致的色系 ───
const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  glass: 'rgba(255,255,255,0.2)',
  gold: '#B08D57',
}

// 三级颜色
const URGENCY_COLOR: Record<number, string> = {
  1: 'rgba(154, 183, 232, 0.35)',  // 预警 — 冷蓝透明
  2: 'rgba(141, 200, 160, 0.5)',   // 行动 — 马卡龙绿
  3: 'rgba(255, 180, 100, 0.65)',  // 出门 — 金橙
}
const URGENCY_BORDER: Record<number, string> = {
  1: 'rgba(154,183,232,0.3)',
  2: 'rgba(141,200,160,0.5)',
  3: 'rgba(255,180,100,0.7)',
}

type Reminder = {
  id: string
  title: string
  description?: string
  category?: string
  urgency_level: number
  due_date?: string
  status: string
  action_type?: string
  action_url?: string
  action_label?: string
  child_id?: string
}

type Child = {
  id: string
  name: string
  emoji: string
  energy: number
  progress: number
}

// 位置散落表 — S型有机分布
const POSITIONS = [
  { top: '22%', right: '12%' },
  { top: '36%', right: '30%' },
  { top: '50%', right: '10%' },
  { top: '63%', right: '28%' },
  { top: '74%', right: '8%' },
  { top: '30%', right: '48%' },
  { top: '55%', right: '46%' },
]

export default function RianPage() {
  const router = useRouter()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [children, setChildren] = useState<Child[]>([
    { id: '', name: 'William', emoji: '👦🏻', energy: 85, progress: 12 },
    { id: '', name: 'Noah', emoji: '👶🏻', energy: 42, progress: 5 },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyMenu, setShowFamilyMenu] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [allDone, setAllDone] = useState(false)

  const currentChild = children[childIndex]
  const getEnergyColor = (v: number) => v > 70 ? '#4ADE80' : v > 40 ? '#FACC15' : '#FB7185'

  const syncData = useCallback(async () => {
    // 孩子
    const { data: childData } = await supabase.from('children').select('*')
    if (childData?.length) setChildren(childData)

    // 提醒 — 只取今天和明天
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 2)
    const { data: remData } = await supabase
  .from('reminders')
  .select('*')
  .eq('status', 'pending')
setReminders(remData || [])
setAllDone((remData || []).length === 0)
}, [])

  useEffect(() => {
    syncData()
    const channel = supabase.channel('rian_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, syncData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, syncData)
      .subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [syncData])

  // 标记完成
  const markDone = async (id: string) => {
    await supabase.from('reminders').update({ status: 'done' }).eq('id', id)
    // 记录习惯
    await supabase.from('user_habits').insert({
      action_type: 'mark_done',
      target_category: reminders.find(r => r.id === id)?.category,
      target_id: id,
    })
    setSelectedReminder(null)
    syncData()
  }

  // 延后
  const snooze = async (id: string) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await supabase.from('reminders').update({ due_date: tomorrow.toISOString() }).eq('id', id)
    await supabase.from('user_habits').insert({
      action_type: 'snooze',
      target_category: reminders.find(r => r.id === id)?.category,
      target_id: id,
    })
    setSelectedReminder(null)
    syncData()
  }

  // 图标映射
  const categoryIcon: Record<string, React.ReactNode> = {
    visa:     <Plane size={18} />,
    medical:  <Pill size={18} />,
    school:   <FileText size={18} />,
    shopping: <ShoppingCart size={18} />,
    utility:  <Building2 size={18} />,
    default:  <Clock size={18} />,
  }

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', background: THEME.bg, fontFamily: 'sans-serif',
    }}>

      {/* 背景水印 */}
      <div style={{
        position: 'absolute', top: '12%', right: '-3%',
        fontSize: '16vw', fontWeight: 'bold', color: THEME.text,
        opacity: 0.07, pointerEvents: 'none', fontStyle: 'italic',
        whiteSpace: 'nowrap', lineHeight: 1,
      }}>
        日安·/rian
      </div>

      {/* 左上角：孩子头像 */}
      <div style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 100 }}>
        <div style={{ position: 'relative' }}>
          <motion.div
            onClick={() => setShowFamilyMenu(!showFamilyMenu)}
            animate={{ boxShadow: [`0 0 15px ${getEnergyColor(currentChild?.energy)}40`, `0 0 35px ${getEnergyColor(currentChild?.energy)}80`, `0 0 15px ${getEnergyColor(currentChild?.energy)}40`] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '36px' }}>{currentChild?.emoji}</span>
          </motion.div>
          <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Zap size={12} color={getEnergyColor(currentChild?.energy)} />
          </div>
        </div>
        <p style={{ marginTop: '10px', fontSize: '10px', color: THEME.text, fontWeight: 'bold', letterSpacing: '0.2em', textAlign: 'center' }}>
          {currentChild?.name}
        </p>
        {/* 精力条 */}
        <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '4px auto', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${currentChild?.energy ?? 85}%`, backgroundColor: getEnergyColor(currentChild?.energy ?? 85) }}
            style={{ height: '100%' }}
          />
        </div>
        <p style={{ fontSize: '9px', color: THEME.text, opacity: 0.4, textAlign: 'center', letterSpacing: '0.1em' }}>
          精力 {currentChild?.energy ?? 85}%
        </p>
      </div>

      {/* 家族切换菜单 */}
      <AnimatePresence>
        {showFamilyMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '18%', left: '6%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: '20px', padding: '12px', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', gap: '12px', alignItems: 'center' }}
          >
            {children.map((c, i) => (
              <div key={i} onClick={() => { setChildIndex(i); setShowFamilyMenu(false) }}
                style={{ cursor: 'pointer', fontSize: '28px', opacity: childIndex === i ? 1 : 0.3, transition: '0.2s' }}>
                {c.emoji}
              </div>
            ))}
            <X size={14} onClick={() => setShowFamilyMenu(false)} style={{ cursor: 'pointer', opacity: 0.4, marginLeft: '4px' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 右上角：时间 */}
      <header style={{ position: 'absolute', top: '6%', right: '8%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: '72px', fontWeight: 100, color: THEME.text, opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
        <p style={{ fontSize: '11px', color: THEME.text, opacity: 0.4, letterSpacing: '0.3em', marginTop: '4px' }}>
          日安指挥中心
        </p>
      </header>

      {/* 空状态：今日已安 */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}
          >
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🌸</div>
            <p style={{ fontSize: '24px', fontWeight: 300, color: THEME.text, opacity: 0.6, letterSpacing: '0.4em' }}>今日已安</p>
            <p style={{ fontSize: '11px', color: THEME.text, opacity: 0.3, letterSpacing: '0.2em', marginTop: '8px' }}>清迈的今天很平静</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 三级提醒水珠 */}
      {!allDone && reminders.map((r, i) => {
        const pos = POSITIONS[i % POSITIONS.length]
        const icon = categoryIcon[r.category || 'default'] ?? categoryIcon.default
        const isUrgent = r.urgency_level === 3

        return (
          <motion.div
            key={r.id}
            style={{ position: 'absolute', top: pos.top, right: pos.right, zIndex: 20 }}
            animate={{
              y: [0, isUrgent ? -8 : -14, 0],
              rotate: [0, isUrgent ? 2 : 1, isUrgent ? -2 : -1, 0],
              scale: isUrgent ? [1, 1.04, 1] : [1, 1, 1],
            }}
            transition={{ duration: isUrgent ? 3 : 7, repeat: Infinity, delay: i * 1.2, ease: 'easeInOut' }}
            onClick={() => setSelectedReminder(r)}
          >
            <div style={{
              width: r.urgency_level === 3 ? '100px' : r.urgency_level === 2 ? '88px' : '76px',
              height: r.urgency_level === 3 ? '100px' : r.urgency_level === 2 ? '88px' : '76px',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${URGENCY_BORDER[r.urgency_level]}`,
              borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.35) 0%, ${URGENCY_COLOR[r.urgency_level]} 100%)`,
              boxShadow: `inset 5px 5px 10px rgba(255,255,255,0.3), 10px 15px 25px rgba(0,0,0,0.06)`,
              cursor: 'pointer',
            }}>
              <div style={{ color: THEME.text, opacity: 0.7, marginBottom: '2px' }}>{icon}</div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: THEME.text, textAlign: 'center', padding: '0 6px', lineHeight: 1.2 }}>
                {r.title.length > 6 ? r.title.slice(0, 6) + '…' : r.title}
              </span>
              {r.urgency_level === 3 && (
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ position: 'absolute', top: '8px', right: '12px', width: '8px', height: '8px', background: '#FF6B6B', borderRadius: '50%', border: '2px solid white' }} />
              )}
              {/* 水珠高光 */}
              <div style={{ position: 'absolute', top: '14px', left: '20px', width: '14px', height: '7px', background: 'rgba(255,255,255,0.45)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
            </div>
          </motion.div>
        )
      })}

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selectedReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 120px' }}
            onClick={() => setSelectedReminder(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '380px', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(40px)', borderRadius: '30px', padding: '24px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: THEME.text, opacity: 0.4, letterSpacing: '0.2em', marginBottom: '4px', textTransform: 'uppercase' }}>
                    {selectedReminder.category || '提醒'}
                  </p>
                  <h2 style={{ fontSize: '20px', fontWeight: 500, color: THEME.text, margin: 0 }}>
                    {selectedReminder.title}
                  </h2>
                </div>
                <X size={18} onClick={() => setSelectedReminder(null)} style={{ cursor: 'pointer', opacity: 0.4, flexShrink: 0 }} />
              </div>

              {selectedReminder.description && (
                <p style={{ fontSize: '13px', color: THEME.text, opacity: 0.6, lineHeight: 1.6, marginBottom: '20px' }}>
                  {selectedReminder.description}
                </p>
              )}

              {selectedReminder.due_date && (
                <p style={{ fontSize: '11px', color: THEME.text, opacity: 0.4, marginBottom: '20px', letterSpacing: '0.1em' }}>
                  截止：{new Date(selectedReminder.due_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {/* 预留：一键处理端口 */}
              {selectedReminder.action_url && (
                <a href={selectedReminder.action_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: `rgba(176,141,87,0.2)`, borderRadius: '15px', marginBottom: '12px', textDecoration: 'none', border: '1px solid rgba(176,141,87,0.3)' }}>
                  <ChevronRight size={16} color={THEME.gold} />
                  <span style={{ fontSize: '13px', color: THEME.gold, fontWeight: 600 }}>
                    {selectedReminder.action_label || '立即处理'}
                  </span>
                </a>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => markDone(selectedReminder.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '15px', background: 'rgba(141,200,160,0.4)', border: '1px solid rgba(141,200,160,0.5)', fontSize: '13px', fontWeight: 600, color: THEME.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} /> 已处理
                </button>
                <button onClick={() => snooze(selectedReminder.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '15px', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)', fontSize: '13px', color: THEME.text, opacity: 0.7, cursor: 'pointer' }}>
                  明天再说
                </button>
              </div>

              {/* 预留：文件自动生成端口 */}
              {['visa', 'medical', 'school', 'utility'].includes(selectedReminder.category || '') && (
                <button style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '15px', background: 'rgba(176,141,87,0.1)', border: '1px dashed rgba(176,141,87,0.4)', fontSize: '11px', color: THEME.gold, cursor: 'pointer', letterSpacing: '0.1em' }}>
                  📄 自动生成相关文件（即将开放）
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部导航 — 与首页完全一致 */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <AnimatePresence>
          {showBaseMenu && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '80px', display: 'flex', gap: '10px' }}
            >
              {[
                { label: '基地', path: '/' },
                { label: '日安', path: '/rian' },
                { label: '树洞', path: '/treehouse' },
              ].map(item => (
                <button key={item.label}
                  onClick={() => router.push(item.path)}
                  style={{ padding: '8px 20px', borderRadius: '15px', background: item.path === '/rian' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', border: 'none', fontSize: '11px', fontWeight: 'bold', color: THEME.text, backdropFilter: 'blur(10px)', cursor: 'pointer' }}>
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ width: '340px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={20} color={showBaseMenu ? THEME.gold : THEME.text} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: showBaseMenu ? THEME.gold : THEME.text }}>基地</span>
          </button>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: THEME.text, opacity: 0.8, letterSpacing: '0.3em' }}>
            日安
          </div>
          <button onClick={() => router.push('/treehouse')} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4 }}>
            <Sprout size={20} color={THEME.text} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: THEME.text }}>树洞</span>
          </button>
        </div>
      </footer>
    </main>
  )
}
