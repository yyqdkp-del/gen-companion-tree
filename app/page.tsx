'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home, Settings, Layers } from 'lucide-react'

// 🎨 调色盘：深灰蓝文字 (#2C3E50) + 高级透明度 [视觉纠偏 4]
const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50', 
  glass: 'rgba(255, 255, 255, 0.2)',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  // --- 🧠 核心逻辑：State & Functions (严格对齐 v2.1 终版) ---
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([
    { name: 'William', emoji: '👦🏻', status: 'active' },
    { name: 'Noah', emoji: '👶🏻', status: 'active' }
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const syncData = async () => {
      // WF-01/02/08: 同步任务与 Grok 实时热点
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])
      const { data: childData } = await supabase.from('children_status').select('*')
      if (childData?.length) setChildren(childData)
    }
    syncData()
    // 实时感应层：Make.com 写入后界面秒级动
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, syncData).subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const hour = time.getHours()
  const greeting = hour < 5 ? '深夜安好' : hour < 12 ? '早安' : hour < 18 ? '午后好' : '晚安'

  return (
    // 🎨 强制全屏背景：清透水氧渐变 + SVG 滤镜 [视觉纠偏 4]
    <main className="fixed inset-0 w-full h-full overflow-hidden select-none z-0" style={{ background: THEME.bg, filter: 'url(#goo)' }}>
      
      {/* 1. 空间重组：巨型透明纹理文字 (0.1不透明度) [UI 纠偏 1] */}
      <div className="fixed top-[15vw] right-[-5%] text-[18vw] font-bold text-[#2C3E50] opacity-10 pointer-events-none tracking-tighter whitespace-nowrap italic z-0">
        GEN COMPANION
      </div>

      {/* 2. 左上角 (5%, 5%): 头像与金色呼吸圈 [UI 纠偏 1] */}
      <motion.div 
        onClick={() => setChildIndex(i => (i + 1) % children.length)}
        className="fixed top-[6%] left-[6%] z-50 cursor-pointer active:scale-90 transition-transform"
      >
        <div className="relative">
          <motion.div 
            animate={{ boxShadow: ['0 0 20px #D4A96A30', '0 0 45px #D4A96A60', '0 0 20px #D4A96A30'] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-xl overflow-hidden"
          >
            <span className="text-3xl">{currentChild?.emoji || '👶🏻'}</span>
          </motion.div>
          <p className="mt-2 text-[10px] tracking-[0.4em] text-[#2C3E50] opacity-60 text-center uppercase font-bold">
            {currentChild?.name}
          </p>
        </div>
      </motion.div>

      {/* 3. 右上角 (5%, 5%): 时间与极简问候 [UI 纠偏 1] */}
      <header className="fixed top-[6%] right-[8%] z-50 text-right">
        <h1 className="text-7xl font-extralight tracking-tighter text-[#2C3E50] opacity-90 leading-none">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </h1>
        <div className="flex flex-col items-end mt-2">
          <span className="text-[12px] tracking-[0.2em] text-[#2C3E50] opacity-40 font-medium">{greeting}</span>
          <p className="text-[13px] tracking-[0.4em] text-[#2C3E50] opacity-60 font-bold mt-1 uppercase">根·Companion</p>
        </div>
      </header>

      {/* 4. 液态水珠：S 型有机散点分布 [UI 纠偏 2] */}
      <section className="absolute inset-0 z-20 pointer-events-none">
        <LiquidDrop 
          icon={<Bell size={18}/>} label="任务感应" value={tasks.length > 0 ? `${tasks.length} 条` : '静默'}
          top="28%" right="15%" color="rgba(141, 160, 138, 0.4)" delay={0} alert={tasks.length > 0} 
        />
        <LiquidDrop 
          icon={<Zap size={18}/>} label="精力值" value="85%" 
          top="45%" right="28%" color="rgba(212, 169, 106, 0.4)" delay={1.5} 
        />
        <LiquidDrop 
          icon={<Heart size={18}/>} label={currentChild.name} value="活跃" 
          top="60%" right="10%" color="rgba(232, 168, 154, 0.4)" delay={3} 
        />
        <LiquidDrop 
          icon={<Trees size={18}/>} label="清迈天气" value="28°" 
          top="75%" right="22%" color="rgba(154, 183, 232, 0.4)" delay={4.5} 
        />
      </section>

      {/* 5. 底部交互：基地弹出菜单 (Pop-up 逻辑) [UI 纠偏 3] */}
      <footer className="fixed bottom-12 left-0 right-0 z-50 px-10 flex flex-col items-center">
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="mb-6 bg-white/20 backdrop-blur-3xl rounded-[2.5rem] p-3 border border-white/40 flex gap-4 shadow-2xl"
            >
              {['日安', '根', '日栖'].map((item) => (
                <button key={item} className="w-16 h-16 rounded-full bg-white/40 border border-white/60 flex items-center justify-center text-[11px] font-bold text-[#2C3E50] opacity-70 tracking-widest hover:bg-white/60 transition-all active:scale-90">
                  {item}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-sm h-16 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center px-8 justify-between shadow-lg">
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} className="flex items-center gap-3 active:scale-95 transition-all">
            <Home size={20} className={showBaseMenu ? "text-[#B08D57]" : "text-[#2C3E50] opacity-40"} />
            <span className={`text-[12px] font-bold tracking-[0.3em] ${showBaseMenu ? "text-[#B08D57]" : "text-[#2C3E50] opacity-40"}`}>基地</span>
          </button>
          <div className="h-4 w-[1px] bg-[#2C3E50] opacity-10" />
          <button className="flex items-center gap-3 opacity-20 cursor-default">
            <Settings size={20} className="text-[#2C3E50]" />
            <span className="text-[12px] font-bold tracking-[0.3em] text-[#2C3E50]">目安</span>
          </button>
        </div>
      </footer>

      {/* 🔗 修正 CSS：不规则液态水滴公式 [UI 纠偏 2] */}
      <style jsx global>{`
        .water-drop {
          border-radius: 66% 34% 71% 29% / 37% 53% 47% 63% !important;
          box-shadow: inset 8px 8px 15px rgba(255, 255, 255, 0.4), 
                      inset -8px -8px 15px rgba(0, 0, 0, 0.05),
                      10px 20px 30px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
      
      {/* 滤镜定义：产生液态融合感 */}
      <svg className="hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          </filter>
        </defs>
      </svg>
    </main>
  )
}

function LiquidDrop({ icon, label, value, top, right, color, delay, alert = false }: any) {
  return (
    <motion.div
      style={{ top, right, position: 'absolute' }}
      animate={{ y: [0, -20, 0], x: [0, 8, 0], rotate: [0, 4, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
      className="flex flex-col items-center gap-2 pointer-events-auto cursor-pointer"
    >
      <div 
        className="w-24 h-24 backdrop-blur-xl border border-white/30 water-drop flex flex-col items-center justify-center p-4 relative overflow-hidden group"
        style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, ${color} 100%)` }}
      >
        <div className="text-[#2C3E50] opacity-60 mb-0.5">{icon}</div>
        <span className="text-sm font-light text-[#2C3E50] tracking-tighter leading-none italic">{value}</span>
        <span className="text-[8px] font-bold text-[#2C3E50] opacity-30 tracking-[0.2em] uppercase mt-1 leading-tight text-center">{label}</span>
        
        {/* P1/P2 紧急程度脉冲 (对齐 Grok 实时报警) */}
        {alert && (
          <motion.div 
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-3 right-5 w-3 h-3 bg-[#E8A89A] rounded-full border-2 border-white" 
          />
        )}
        
        {/* 核心视觉细节：表面折射高光 */}
        <div className="absolute top-4 left-6 w-4 h-2 bg-white/40 rounded-full rotate-[-35deg] blur-[0.5px]" />
      </div>
    </motion.div>
  )
}
