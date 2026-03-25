'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Send } from 'lucide-react'

// 🎨 莫兰迪暖系美学配置
const COLORS = {
  bg: '#F9F8F6',      // 暖白底
  primary: '#8DA08A', // 莫兰迪绿
  accent: '#B08D57',  // 古铜金
  text: '#2D3A4A',    // 深岩灰
  urgent: '#E8A89A',  // 珊瑚粉
  school: '#9AB7E8',  // 琉璃蓝
  muted: '#A0A0A0',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type ChildStatus = { name: string; status: string; energy: number; emoji: string }

export default function CompanionApp() {
  // --- 核心功能状态 (不准动) ---
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<ChildStatus[]>([
    { name: 'William', status: 'active', energy: 85, emoji: '👦🏻' },
    { name: 'Noah', status: 'sleeping', energy: 92, emoji: '👶🏻' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState('base')

  useEffect(() => {
    const syncData = async () => {
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])
      const { data: childData } = await supabase.from('children_status').select('name, status, energy, emoji')
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
  const statusMap: Record<string, string> = { sleeping: '睡眠中', active: '活跃', school: '上学', eating: '用餐' }

  return (
    <main className="min-h-screen relative overflow-hidden font-serif select-none" style={{ backgroundColor: COLORS.bg }}>
      
      {/* 1. 流体光影背景 (呼吸感的关键) */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[120px]"
          style={{ backgroundColor: COLORS.primary + '25' }}
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[120px]"
          style={{ backgroundColor: COLORS.accent + '20' }}
        />
      </div>

      {/* 2. 艺术化页眉 */}
      <header className="relative z-20 px-10 pt-16 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-[0.3em] text-[#2D3A4A]">根·陪伴</h1>
            <span className="text-[10px] tracking-[0.2em] text-gray-400 font-light italic">{greeting}，大叔</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <h2 className="text-5xl font-light tracking-tighter text-[#2D3A4A]" style={{ fontFamily: 'serif' }}>
              {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </h2>
            <div className="h-[1px] w-12 bg-[#B08D57] opacity-40" />
          </div>
        </motion.div>
      </header>

      {/* 3. 核心互动区：宝宝状态 */}
      <section className="relative z-20 px-8 flex flex-col items-center mt-6">
        <motion.div 
          key={currentChild?.name}
          onClick={() => setChildIndex(i => (i + 1) % children.length)}
          whileTap={{ scale: 0.95 }}
          className="relative w-36 h-36 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 border-white cursor-pointer group"
        >
          <span className="text-6xl">{currentChild?.emoji || '🌳'}</span>
          <motion.div 
            className="absolute -bottom-2 right-2 bg-[#2D3A4A] text-white w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg"
            whileHover={{ rotate: 90 }}
          > + </motion.div>
        </motion.div>
        
        <div className="mt-6 text-center">
          <h3 className="text-lg tracking-[0.3em] text-[#2D3A4A] font-medium">{currentChild?.name}</h3>
          <p className="text-[10px] tracking-[0.2em] text-gray-400 mt-1 uppercase">
            当前：{statusMap[currentChild?.status] || '监测中'}
          </p>
          {/* 极简精力条 */}
          <div className="w-24 mx-auto mt-4 h-[2px] bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${currentChild?.energy || 85}%` }}
              className="h-full bg-[#8DA08A]"
              style={{ backgroundColor: (currentChild?.energy || 85) < 30 ? COLORS.urgent : COLORS.primary }}
            />
          </div>
        </div>
      </section>

      {/* 4. 艺术感功能气泡 (错落布局) */}
      <section className="relative z-20 px-8 mt-12 grid grid-cols-2 gap-x-6 gap-y-10">
        <ArtBubble icon={<Bell size={18} />} label="今日任务" value={tasks.length} color={COLORS.primary} delay={0.1} />
        <ArtBubble icon={<Zap size={18} />} label="精力状态" value="良好" color={COLORS.accent} delay={0.2} offset="20px" />
        <ArtBubble icon={<Trees size={18} />} label="清迈天气" value="28°" color={COLORS.school} delay={0.3} />
        <ArtBubble icon={<Heart size={18} />} label="树洞心情" value="平静" color={COLORS.urgent} delay={0.4} offset="-15px" />
      </section>

      {/* 5. Make.com 状态条 (玻璃拟态) */}
      <motion.div 
        className="relative z-20 mt-16 mx-10 p-4 bg-white/30 backdrop-blur-xl rounded-[2rem] border border-white/50 flex items-center gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <div className="w-2 h-2 rounded-full bg-[#8DA08A] animate-pulse" />
        <div className="flex-1">
          <p className="text-[9px] tracking-widest text-gray-400 uppercase">Make.com Live</p>
          <p className="text-xs text-[#2D3A4A] opacity-80 mt-0.5 font-medium">5 路由巡逻中 · Grok 巡逻已激活</p>
        </div>
        <div className="text-[9px] font-bold text-[#B08D57] tracking-tighter">V2.5</div>
      </motion.div>

      {/* 6. 底部艺术字块导航 */}
      <nav className="fixed bottom-10 left-0 right-0 z-50 px-10">
        <div className="max-w-sm mx-auto flex justify-between items-end">
          <ArtTab id="base" label="基地" active={activeTab} color={COLORS.primary} onClick={setActiveTab} />
          <ArtTab id="rian" label="日安" active={activeTab} color={COLORS.accent} onClick={setActiveTab} />
          <ArtTab id="gen" label="根" active={activeTab} color="#B08D57" onClick={setActiveTab} />
          <ArtTab id="riqi" label="日栖" active={activeTab} color="#2D3A4A" onClick={setActiveTab} />
        </div>
      </nav>

      <div className="h-40" />
    </main>
  )
}

function ArtBubble({ icon, label, value, color, delay, offset = "0px", alert = false }: any) {
  return (
    <motion.div 
      style={{ marginTop: offset }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      className="flex flex-col items-center gap-3"
    >
      <motion.div 
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4 + delay*2, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 rounded-full bg-white shadow-xl border border-gray-50 flex flex-col items-center justify-center relative overflow-hidden group"
      >
        <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: color }} />
        <div style={{ color }}>{icon}</div>
        <span className="text-[14px] font-light mt-1 text-[#2D3A4A]">{value}</span>
      </motion.div>
      <span className="text-[9px] tracking-[0.3em] text-gray-400 uppercase font-bold">{label}</span>
    </motion.div>
  )
}

function ArtTab({ id, label, active, color, onClick }: any) {
  const isActive = active === id
  return (
    <button onClick={() => onClick(id)} className="flex flex-col items-center group">
      <motion.div 
        animate={{ height: isActive ? 52 : 44, y: isActive ? -10 : 0 }}
        className="px-6 rounded-2xl flex items-center justify-center shadow-lg transition-all"
        style={{ backgroundColor: isActive ? color : 'white' }}
      >
        <span className={`text-[11px] font-bold tracking-[0.2em] ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {label}
        </span>
      </motion.div>
    </button>
  )
}
