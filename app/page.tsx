'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home, Settings } from 'lucide-react'

// 🎨 调色盘：深灰蓝文字 (#2C3E50) + 高级透明度
const THEME = {
  bg: 'linear-gradient(135deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50', 
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type ChildStatus = { name: string; status: string; emoji: string }

export default function Home() {
  // --- 🧠 核心逻辑：State & Functions (严格对齐 v2.1 终版) ---
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<ChildStatus[]>([
    { name: 'William', status: 'active', emoji: '👦🏻' },
    { name: 'Noah', status: 'active', emoji: '👶🏻' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const syncData = async () => {
      // WF-01/02/08: 同步任务与 Grok 情报
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])
      // 同步孩子状态
      const { data: childData } = await supabase.from('children_status').select('name, status')
      if (childData?.length) setChildren(prev => childData.map(d => ({ 
        ...d, 
        emoji: d.name === 'William' ? '👦🏻' : '👶🏻' 
      })))
    }
    syncData()
    const channel = supabase.channel('realtime_sync').on('postgres_changes', { event: '*', schema: 'public' }, syncData).subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const hour = time.getHours()
  const greeting = hour < 5 ? '深夜安好' : hour < 12 ? '早安' : hour < 18 ? '午后好' : '晚安'

  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden select-none" style={{ background: THEME.bg }}>
      
      {/* 1. 背景层：巨型透明纹理文字 (0.1 不透明度) */}
      <div className="absolute top-[10%] right-[-5%] text-[15vw] font-bold text-[#2C3E50] opacity-10 pointer-events-none tracking-tighter whitespace-nowrap italic select-none">
        GEN COMPANION
      </div>

      {/* 2. 左上角 (5%, 5%): 头像与淡金色呼吸圈 */}
      <motion.div 
        onClick={() => setChildIndex(i => (i + 1) % children.length)}
        className="absolute top-[5%] left-[5%] z-30 cursor-pointer active:scale-90 transition-transform"
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

      {/* 3. 右上角 (5%, 5%): 时间与极简排版 */}
      <header className="absolute top-[5%] right-[5%] z-30 text-right">
        <motion.h1 className="text-7xl font-extralight tracking-tighter text-[#2C3E50] opacity-90 leading-none font-sans">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </motion.h1>
        <div className="flex flex-col items-end mt-2">
          <span className="text-[12px] tracking-[0.2em] text-[#2C3E50] opacity-30 font-medium">{greeting}</span>
          <p className="text-[13px] tracking-[0.4em] text-[#2C3E50] opacity-50 font-bold mt-1">根·陪伴</p>
        </div>
      </header>

      {/* 4. 液态水珠：中右侧 S 型有机分布 */}
      <section className="absolute inset-0 z-20 pointer-events-none">
        <LiquidBubble 
          icon={<Bell size={16}/>} label="任务感应" value={tasks.length > 0 ? `${tasks.length} 条` : '静默'}
          top="28%" right="12%" color="rgba(141, 160, 138, 0.4)" delay={0} alert={tasks.length > 0} 
        />
        <LiquidBubble 
          icon={<Zap size={16}/>} label="精力值" value="85%" 
          top="45%" right="25%" color="rgba(212, 169, 106, 0.4)" delay={1.2} 
        />
        <LiquidBubble 
          icon={<Heart size={16}/>} label={currentChild?.name} value={currentChild?.status === 'active' ? '活跃' : '休眠'} 
          top="58%" right="10%" color="rgba(232, 168, 154, 0.4)" delay={2.4} 
        />
        <LiquidBubble 
          icon={<Trees size={16}/>} label="清迈天气" value="28°" 
          top="72%" right="20%" color="rgba(154, 183, 232, 0.4)" delay={3.6} 
        />
      </section>

      {/* 5. 底部交互：基地弹出菜单 (半透明弧形) */}
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

        <div className="w-full max-sm:max-w-xs max-w-sm h-16 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center px-8 justify-between shadow-lg">
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} className="flex items-center gap-3 active:scale-95 transition-all">
            <Home size={20} className={`transition-colors ${showBaseMenu ? 'text-[#B08D57]' : 'text-[#2C3E50] opacity-40'}`} />
            <span className={`text-[12px] font-bold tracking-[0.3em] ${showBaseMenu ? 'text-[#B08D57]' : 'text-[#2C3E50] opacity-40'}`}>基地</span>
          </button>
          <div className="h-4 w-[1px] bg-[#2C3E50] opacity-10" />
          <button className="flex items-center gap-3 opacity-20 cursor-not-allowed">
            <Settings size={20} className="text-[#2C3E50]" />
            <span className="text-[12px] font-bold tracking-[0.3em] text-[#2C3E50]">目安</span>
          </button>
        </div>
      </footer>

      {/* 🔗 CSS 公式：不规则液态水滴 */}
      <style jsx global>{`
        .liquid-bubble {
          border-radius: 66% 34% 71% 29% / 37% 53% 47% 63%;
          box-shadow: inset 8px 8px 15px rgba(255, 255, 255, 0.4), 
                      inset -8px -8px 15px rgba(0, 0, 0, 0.05),
                      10px 20px 30px rgba(0, 0, 0, 0.05);
        }
        @keyframes drift {
          from { transform: translate(0, 0) rotate(0deg); }
          to { transform: translate(10px, -15px) rotate(4deg); }
        }
      `}</style>
    </main>
  )
}

function LiquidBubble({ icon, label, value, top, right, color, delay, alert = false }: any) {
  return (
    <motion.div
      style={{ top, right, position: 'absolute' }}
      animate={{ 
        y: [0, -20, 0], 
        x: [0, 8, 0], 
        rotate: [0, 3, -3, 0] 
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity, 
        delay, 
        ease: "easeInOut" 
      }}
      className="flex flex-col items-center gap-2 pointer-events-auto cursor-pointer"
    >
      <div 
        className="w-24 h-24 backdrop-blur-xl border border-white/30 liquid-bubble flex flex-col items-center justify-center p-4 relative overflow-hidden group"
        style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, ${color} 100%)` }}
      >
        <div className="text-[#2C3E50] opacity-60 mb-0.5">{icon}</div>
        <span className="text-sm font-light text-[#2C3E50] tracking-tighter leading-none">{value}</span>
        <span className="text-[8px] font-bold text-[#2C3E50] opacity-30 tracking-[0.2em] uppercase mt-1">{label}</span>
        
        {/* P1/P2 紧急程度红点 (WF-08)  */}
        {alert && (
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-3 right-5 w-3 h-3 bg-[#E8A89A] rounded-full border-2 border-white" 
          />
        )}
        
        {/* 表面折射高光 */}
        <div className="absolute top-4 left-6 w-4 h-2 bg-white/40 rounded-full rotate-[-35deg] blur-[0.5px]" />
      </div>
    </motion.div>
  )
}
