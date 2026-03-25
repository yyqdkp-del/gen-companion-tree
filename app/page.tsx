'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home, Settings, Layers } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function CompanionApp() {
  const [tasks, setTasks] = useState<any[]>([])
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const syncData = async () => {
      const { data } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(data || [])
    }
    syncData()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden select-none italic-none" 
          style={{ background: 'linear-gradient(135deg, #E0F2F1 0%, #FCE4EC 100%)' }}>
      
      {/* 1. 极其淡雅的水波纹背景 (Caustics) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: 'contrast(120%) brightness(120%)'
        }} />
      </div>

      {/* 2. 左上角：Noah 头像 */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="absolute top-12 left-10 z-30"
      >
        <div className="relative group cursor-pointer">
          <div className="w-20 h-20 rounded-full bg-white/80 shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur-md flex items-center justify-center border border-white p-1">
             <span className="text-4xl">👶🏻</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2D3A4A] rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
            +
          </div>
        </div>
      </motion.div>

      {/* 3. 右上角：时间与品牌 */}
      <header className="absolute top-12 right-10 z-30 text-right">
        <h2 className="text-6xl font-extralight tracking-tighter text-white drop-shadow-sm" style={{ fontFamily: 'sans-serif' }}>
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </h2>
        <p className="text-[12px] tracking-[0.4em] text-white/80 mt-1 mr-1">根·陪伴</p>
      </header>

      {/* 4. 中右侧：饱满水滴气泡 (S型非线性分布) */}
      <section className="relative h-screen w-full z-20">
        <WaterDrop 
          icon={<Zap size={18} />} label="辰好" color="rgba(212, 169, 106, 0.4)" 
          top="28%" left="72%" delay={0} shape="30% 70% 70% 30% / 30% 30% 70% 70%" 
        />
        <WaterDrop 
          icon={<Layers size={18} />} label="辰好精力" color="rgba(141, 160, 138, 0.4)" 
          top="45%" left="65%" delay={1} shape="50% 50% 30% 70% / 60% 40% 60% 40%" 
        />
        <WaterDrop 
          icon={<Bell size={18} />} label="状态" color="rgba(176, 141, 87, 0.4)" 
          top="55%" left="78%" delay={2} shape="40% 60% 50% 50% / 50% 30% 70% 50%" 
        />
        <WaterDrop 
          icon={<Heart size={18} />} label="平衡" color="rgba(232, 168, 154, 0.4)" 
          top="68%" left="60%" delay={3} shape="60% 40% 30% 70% / 40% 60% 40% 60%" 
        />
      </section>

      {/* 5. 底部交互控制台 */}
      <footer className="fixed bottom-12 left-0 right-0 z-50 px-8">
        <div className="max-w-md mx-auto relative">
          
          {/* 基地弹出菜单 */}
          <AnimatePresence>
            {showBaseMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-20 left-4 bg-white/40 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-3 flex flex-col gap-3 shadow-2xl"
              >
                {['日安', '根', '日栖'].map((item) => (
                  <button key={item} className="px-8 py-3 rounded-full bg-white/60 text-[11px] font-bold tracking-[0.3em] text-[#2D3A4A] hover:bg-white transition-colors">
                    {item}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 主工具条 */}
          <div className="h-16 bg-white/30 backdrop-blur-2xl border border-white/60 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex items-center px-6 gap-8">
            <button 
              onClick={() => setShowBaseMenu(!showBaseMenu)}
              className={`flex items-center gap-2 transition-all ${showBaseMenu ? 'text-[#B08D57]' : 'text-[#2D3A4A]'}`}
            >
              <Home size={18} />
              <span className="text-[11px] font-bold tracking-[0.2em]">基地</span>
            </button>
            <div className="w-[1px] h-6 bg-white/50" />
            <button className="flex items-center gap-2 text-[#2D3A4A]">
              <Settings size={18} />
              <span className="text-[11px] font-bold tracking-[0.2em]">目安</span>
            </button>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .water-shadow {
          box-shadow: 
            inset 10px -10px 20px rgba(255,255,255,0.5),
            inset -10px 10px 20px rgba(0,0,0,0.05),
            0 15px 30px rgba(0,0,0,0.05);
        }
      `}</style>
    </main>
  )
}

function WaterDrop({ icon, label, color, top, left, delay, shape }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      animate={{ 
        y: [0, -12, 0],
        rotate: [0, 2, -2, 0]
      }}
      transition={{ 
        duration: 5, 
        repeat: Infinity, 
        delay,
        ease: "easeInOut" 
      }}
      style={{ top, left, position: 'absolute' }}
      className="flex flex-col items-center gap-3"
    >
      <div 
        className="w-24 h-24 backdrop-blur-md border border-white/40 water-shadow flex flex-col items-center justify-center p-4 relative"
        style={{ 
          backgroundColor: color,
          borderRadius: shape
        }}
      >
        <div className="text-white drop-shadow-sm mb-1">{icon}</div>
        <span className="text-[10px] text-white/90 font-bold tracking-tighter text-center leading-tight">
          {label}
        </span>
      </div>
    </motion.div>
  )
}
