'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'

const THEME = {
  bgGradient: 'linear-gradient(180deg, #A8D5DA 0%, #D8A5B2 100%)', // 对齐图片的蓝绿到粉红渐变
  text: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.2)',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden font-sans select-none" style={{ background: THEME.bgGradient }}>
      
      {/* 1. 背景波光 (Caustics Effect) - 极淡处理 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />
      
      {/* 2. 左上角：Noah 头像 (带呼吸光晕) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        className="absolute top-16 left-10 z-30"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-white shadow-[0_0_30px_rgba(255,255,255,0.6)] flex items-center justify-center p-1 border border-white/50">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#FEE2E2] flex items-center justify-center text-3xl">
              👶🏻
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#2D3A4A] rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
            ●
          </div>
        </div>
      </motion.div>

      {/* 3. 右上角：时间与品牌 (对齐图片排版) */}
      <header className="absolute top-16 right-10 z-30 text-right text-white">
        <h1 className="text-7xl font-extralight tracking-tight leading-none opacity-90">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </h1>
        <p className="text-[14px] tracking-[0.3em] font-light mt-2 opacity-80">Companion (陪伴)</p>
      </header>

      {/* 4. 右侧：S型分布的水灵气泡 (核心视觉) */}
      <div className="absolute inset-0 z-20">
        <WaterBubble label="辰好" icon="⚡" top="25%" right="15%" size={80} color="rgba(212, 169, 106, 0.4)" delay={0} />
        <WaterBubble label="辰好精力" icon="💧" top="42%" right="22%" size={95} color="rgba(141, 160, 138, 0.4)" delay={1} />
        <WaterBubble label="平衡" icon="♡" top="60%" right="28%" size={90} color="rgba(232, 168, 154, 0.4)" delay={2} />
        <WaterBubble label="状态" icon="≈" top="75%" right="18%" size={110} color="rgba(141, 184, 200, 0.4)" delay={3} />
      </div>

      {/* 5. 底部交互：基地与按钮 */}
      <footer className="fixed bottom-12 left-0 right-0 z-50 px-10">
        <div className="max-w-md mx-auto relative flex items-center gap-4">
          
          {/* 基地弹出菜单 */}
          <AnimatePresence>
            {showBaseMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-20 left-0 bg-white/20 backdrop-blur-3xl rounded-[2rem] p-2 border border-white/30 flex flex-col gap-2 shadow-2xl"
              >
                {['日安', '根', '日栖'].map(item => (
                  <button key={item} className="px-8 py-3 rounded-full hover:bg-white/40 text-white text-[12px] tracking-[0.2em] transition-all">
                    {item}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部功能条 */}
          <div className="flex-1 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center px-6 justify-between">
            <button onClick={() => setShowBaseMenu(!showBaseMenu)} className="text-white text-[13px] tracking-[0.2em] font-light flex items-center gap-2">
              <span className={showBaseMenu ? "text-white" : "opacity-70"}>基地</span>
            </button>
            <div className="w-[1px] h-4 bg-white/30" />
            <button className="text-white text-[13px] tracking-[0.2em] font-light opacity-70">
              目安
            </button>
          </div>
        </div>
      </footer>

      {/* 滤镜定义：产生水滴融合感 */}
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

function WaterBubble({ label, icon, top, right, size, color, delay }: any) {
  return (
    <motion.div
      style={{ top, right, width: size, height: size, position: 'absolute' }}
      animate={{ 
        y: [0, -15, 0],
        scale: [1, 1.05, 1],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
      className="group cursor-pointer"
    >
      <div 
        className="w-full h-full rounded-full backdrop-blur-md border border-white/40 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ 
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, ${color} 100%)`,
          boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.05), inset 5px 5px 15px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.05)'
        }}
      >
        <span className="text-white text-lg mb-1 opacity-90">{icon}</span>
        <span className="text-[10px] text-white tracking-widest font-light text-center leading-tight px-2 uppercase">
          {label}
        </span>
        {/* 水滴表面高光点 */}
        <div className="absolute top-2 left-4 w-3 h-1.5 bg-white/30 rounded-full rotate-[-30deg]" />
      </div>
    </motion.div>
  )
}
