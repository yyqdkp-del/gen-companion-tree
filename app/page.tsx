'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home, Settings } from 'lucide-react'

// 🔐 初始化核心：确保环境变量在 Vercel 自动同步 [cite: 7, 77]
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function HydroApp() {
  // --- 🧠 核心功能逻辑（严格保留 v2.1 终版） [cite: 6, 9] ---
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([
    { name: 'William', status: 'active', emoji: '👦🏻' },
    { name: 'Noah', status: 'active', emoji: '👶🏻' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const syncData = async () => {
      // WF-01/02/08: 同步任务与 Grok 实时热点 [cite: 41, 43]
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])
      // 同步孩子状态 
      const { data: childData } = await supabase.from('children_status').select('*')
      if (childData?.length) setChildren(childData)
    }
    syncData()
    // 实时感应层：Make.com 写入后界面秒动 [cite: 20, 22]
    const channel = supabase.channel('realtime_sync').on('postgres_changes', { event: '*', schema: 'public' }, syncData).subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const hour = time.getHours()
  const greeting = hour < 5 ? '深夜安好' : hour < 12 ? '早安' : hour < 18 ? '午后好' : '晚安'

  return (
    // 🎨 强制全屏背景：解决 Vercel 容器白边问题
    <main className="fixed inset-0 w-full h-full overflow-hidden select-none z-0" 
          style={{ background: 'linear-gradient(135deg, #A8D5DA 0%, #D8A5B2 100%)' }}>
      
      {/* 1. 背景纹理：极巨化标题，不透明度 0.1 */}
      <div className="absolute top-[15%] right-[-10%] text-[18vw] font-bold text-[#2C3E50] opacity-10 pointer-events-none tracking-tighter italic whitespace-nowrap z-0">
        GEN COMPANION
      </div>

      {/* 2. 左上角 (5%, 5%)：头像与淡金色呼吸圈 [修订①要求] */}
      <motion.div 
        onClick={() => setChildIndex(i => (i + 1) % children.length)}
        className="absolute top-[6%] left-[6%] z-50 cursor-pointer active:scale-90"
      >
        <div className="relative">
          <motion.div 
            animate={{ boxShadow: ['0 0 15px rgba(212,169,106,0.2)', '0 0 35px rgba(212,169,106,0.5)', '0 0 15px rgba(212,169,106,0.2)'] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-xl overflow-hidden"
          >
            <span className="text-3xl">{currentChild?.emoji}</span>
          </motion.div>
          <p className="mt-2 text-[10px] tracking-[0.4em] text-[#2C3E50] opacity-40 text-center font-bold uppercase">{currentChild?.name}</p>
        </div>
      </motion.div>

      {/* 3. 右上角 (5%, 8%)：时间与极简问候 */}
      <header className="absolute top-[6%] right-[8%] z-50 text-right">
        <h1 className="text-7xl font-extralight tracking-tighter text-[#2C3E50] opacity-90 leading-none">
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
        <div className="flex flex-col items-end mt-2 text-[#2C3E50]">
          <span className="text-[12px] tracking-[0.2em] opacity-30 font-medium">{greeting}</span>
          <p className="text-[13px] tracking-[0.4em] opacity-50 font-bold mt-1">根·陪伴</p>
        </div>
      </header>

      {/* 4. 液态水珠：S 型非线性分布 [视觉纠偏] */}
      <section className="absolute inset-0 z-20 pointer-events-none">
        <LiquidDrop 
          icon={<Bell size={18}/>} label="任务感应" value={tasks.length > 0 ? `${tasks.length} 条` : '静默'}
          top="28%" right="15%" color="rgba(141, 160, 138, 0.4)" delay={0} alert={tasks.length > 0} 
        />
        <LiquidDrop 
          icon={<Zap size={18}/>} label="精力状态" value="85%" 
          top="45%" right="25%" color="rgba(212, 169, 106, 0.4)" delay={1.2} 
        />
        <LiquidDrop 
          icon={<Heart size={18}/>} label="当前状态" value={statusMap[currentChild?.status] || '活跃'} 
          top="58%" right="12%" color="rgba(232, 168, 154, 0.4)" delay={2.4} 
        />
        <LiquidDrop 
          icon={<Trees size={18}/>} label="清迈天气" value="28°" 
          top="72%" right="22%" color="rgba(154, 183, 232, 0.4)" delay={3.6} 
        />
      </section>

      {/* 5. 底部交互：基地弹出菜单 [修订②逻辑] */}
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

      {/* 🔗 强制样式：解决 Tailwind 优先级问题 */}
      <style jsx global>{`
        .water-bubble {
          border-radius: 66% 34% 71% 29% / 37% 53% 47% 63% !important;
          box-shadow: inset 8px 8px 15px rgba(255, 255, 255, 0.4), 
                      inset -8px -8px 15px rgba(0, 0, 0, 0.05),
                      10px 20px 30px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
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
        className="w-24 h-24 backdrop-blur-xl border border-white/30 water-bubble flex flex-col items-center justify-center p-4 relative overflow-hidden group"
        style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, ${color} 100%)` }}
      >
        <div className="text-[#2C3E50] opacity-60 mb-0.5">{icon}</div>
        <span className="text-sm font-light text-[#2C3E50] tracking-tighter leading-none italic">{value}</span>
        <span className="text-[8px] font-bold text-[#2C3E50] opacity-30 tracking-[0.2em] uppercase mt-1">{label}</span>
        
        {/* P1/P2 预警红点 [cite: 67] */}
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

const statusMap: Record<string, string> = {
  sleeping: '睡眠中', active: '活跃', school: '上学', eating: '用餐',
}
