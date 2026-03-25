'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Settings, Zap, Heart, Trees, Layers } from 'lucide-react'

export default function HydroApp() {
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden select-none" 
          style={{ background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)' }}>
      
      {/* 1. 背景：极其淡雅的 Caustics 水光纹理 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />

      {/* 2. 左上角：Noah 头像 (带环境发光) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-16 left-10 z-30">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center p-1 border border-white/50">
            <div className="w-full h-full rounded-full bg-[#FFE4E6] flex items-center justify-center text-4xl">👶🏻</div>
          </div>
          <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#2D3A4A] rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* 3. 右上角：时间与品牌 (完全对齐图片) */}
      <header className="absolute top-16 right-10 z-30 text-right text-white font-sans">
        <h1 className="text-7xl font-extralight tracking-tighter leading-none opacity-90">
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
        <p className="text-[14px] tracking-[0.4em] font-light mt-2 opacity-80 uppercase">根·Companion</p>
      </header>

      {/* 4. 右侧：S型分布的水灵气泡 (核心视觉) */}
      <section className="absolute inset-0 z-20 pointer-events-none">
        <WaterDrop label="辰好" icon={<Zap size={14}/>} top="28%" right="15%" color="#D4A96A" delay={0} />
        <WaterDrop label="辰好精力" icon={<Layers size={14}/>} top="45%" right="24%" color="#8DA08A" delay={1.5} />
        <WaterDrop label="状态" icon={<Trees size={14}/>} top="58%" right="12%" color="#B08D57" delay={3} />
        <WaterDrop label="平衡" icon={<Heart size={14}/>} top="72%" right="26%" color="#E8A89A" delay={4.5} />
      </section>

      {/* 5. 底部：基地交互逻辑 */}
      <footer className="fixed bottom-12 left-0 right-0 z-50 px-8">
        <div className="max-w-md mx-auto relative flex flex-col items-center">
          <AnimatePresence>
            {showBaseMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="mb-4 bg-white/20 backdrop-blur-3xl rounded-[2.5rem] p-2 border border-white/30 flex flex-col gap-1 shadow-2xl"
              >
                {['日安', '根', '日栖'].map(item => (
                  <button key={item} className="px-10 py-3 rounded-full hover:bg-white/30 text-white text-[11px] tracking-[0.3em] font-bold">
                    {item}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-14 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center px-8 justify-between shadow-lg">
            <button onClick={() => setShowBaseMenu(!showBaseMenu)} className="flex items-center gap-3">
              <Home size={18} className="text-white opacity-80" />
              <span className="text-white text-[12px] tracking-[0.3em] font-bold">基地</span>
            </button>
            <div className="h-4 w-[1px] bg-white/30" />
            <button className="flex items-center gap-3">
              <Settings size={18} className="text-white opacity-60" />
              <span className="text-white/60 text-[12px] tracking-[0.3em] font-bold">目安</span>
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}

function WaterDrop({ label, icon, top, right, color, delay }: any) {
  return (
    <motion.div
      style={{ top, right, position: 'absolute' }}
      animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
      className="flex flex-col items-center gap-2 pointer-events-auto cursor-pointer"
    >
      <div 
        className="w-20 h-20 rounded-full backdrop-blur-md border border-white/40 relative flex flex-col items-center justify-center p-3 transition-transform active:scale-95"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, ${color}50 100%)`,
          boxShadow: `
            inset -6px -6px 12px rgba(0,0,0,0.05), 
            inset 6px 6px 15px rgba(255,255,255,0.4),
            0 15px 35px rgba(0,0,0,0.05)
          `
        }}
      >
        <div className="text-white drop-shadow-md mb-0.5">{icon}</div>
        <span className="text-[9px] text-white tracking-[0.1em] font-bold text-center leading-tight">
          {label}
        </span>
        
        {/* 核心灵魂：极其细微的表面折射高光 */}
        <div className="absolute top-4 left-6 w-3 h-1.5 bg-white/50 rounded-full rotate-[-35deg] blur-[0.3px]" />
      </div>
    </motion.div>
  )
}
