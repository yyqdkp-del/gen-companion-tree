'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Coffee, Moon, Sun } from 'lucide-react'

// 🎨 清迈暖系极简配色
const THEME = {
  bg: '#FDFCFB',      // 极浅暖白
  primary: '#8DA08A', // 森林绿
  accent: '#D4A96A',  // 柚木金
  text: '#2D3A4A',    // 深岩灰
  energy: { high: '#8DA08A', mid: '#D4A96A', low: '#E8A89A' }
}

// 初始化 Supabase (自动读取你之前在 Vercel 设置的环境变量)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([])
  const [activeChild, setActiveChild] = useState({ name: 'Noah', energy: 85 })

  // 🤖 核心逻辑：24小时实时监听 Make.com 的自动化指令
  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks') // 确保你的 Supabase 有一个叫 tasks 的表
        .select('*')
        .eq('status', 'pending')
      setTasks(data || [])
    }

    fetchTasks()
    
    // 监听数据库变更：Make 一改，网页秒动
    const channel = supabase.channel('realtime_tasks').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks' }, fetchTasks).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden font-sans select-none" style={{ backgroundColor: THEME.bg }}>
      
      {/* 1. 艺术感背景流动 */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -top-[10%] -right-[10%] w-[80%] h-[80%] rounded-full blur-[120px] bg-[#8DA08A20]"
        />
      </div>

      {/* 2. 极简页眉 */}
      <header className="relative z-20 px-10 pt-16">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-light tracking-[0.4em] text-[#2D3A4A]"
        >
          根·Companion
        </motion.h1>
        <div className="h-[1px] w-12 bg-[#D4A96A] mt-4 opacity-60" />
      </header>

      {/* 3. 状态核心区 */}
      <section className="relative z-20 flex flex-col items-center mt-12">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-32 h-32 rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center justify-center border-4 border-white"
        >
          <span className="text-5xl text-[#8DA08A]">🌳</span>
        </motion.div>
        
        <h2 className="mt-6 text-lg tracking-[0.2em] text-gray-500 font-medium">
          {activeChild.name} · 状态良好
        </h2>
      </section>

      {/* 4. Make 指令动态感应气泡 */}
      <section className="relative z-20 px-8 mt-16 grid grid-cols-2 gap-8">
        <Bubble 
          icon={<Bell size={20} />} 
          label="待办提醒" 
          count={tasks.length} 
          color={THEME.primary} 
        />
        <Bubble 
          icon={<Heart size={20} />} 
          label="健康状态" 
          color="#E8A89A" 
          delay={0.2} 
        />
        <Bubble 
          icon={<Coffee size={20} />} 
          label="今日日程" 
          color={THEME.accent} 
          delay={0.4} 
        />
        <Bubble 
          icon={<Moon size={20} />} 
          label="晚安准备" 
          color="#9AB7E8" 
          delay={0.6} 
        />
      </section>

      {/* 5. 底部艺术导航 */}
      <nav className="fixed bottom-12 left-0 right-0 z-50 px-10">
        <div className="max-w-md mx-auto h-16 bg-white/40 backdrop-blur-xl rounded-full border border-white/40 shadow-xl flex justify-around items-center px-6">
          <NavItem label="基地" active />
          <NavItem label="探索" />
          <NavItem label="成长" />
        </div>
      </nav>
    </main>
  )
}

// 气泡组件
function Bubble({ icon, label, color, count = 0, delay = 0 }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-white/60 border border-white/80 shadow-sm"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center relative" style={{ backgroundColor: color + '15', color: color }}>
        {icon}
        {count > 0 && (
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
          >
            {count}
          </motion.span>
        )}
      </div>
      <span className="text-[10px] tracking-[0.2em] text-gray-400 font-bold uppercase">{label}</span>
    </motion.div>
  )
}

function NavItem({ label, active = false }: any) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-[11px] tracking-[0.3em] font-medium ${active ? 'text-[#2D3A4A]' : 'text-gray-400'}`}>
        {label}
      </span>
      {active && <motion.div layoutId="navDot" className="w-1 h-1 bg-[#D4A96A] rounded-full" />}
    </div>
  )
}
