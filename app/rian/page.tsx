'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Home as HomeIcon, Plane, Clock, X, Zap, Send } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function RianPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [children] = useState([{ name: 'William', emoji: '👦🏻', energy: 85 }])
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<any>(null)

  const syncData = useCallback(async () => {
    const { data } = await supabase.from('reminders').select('*').eq('status', 'pending')
    setReminders(data || [])
  }, [])

  useEffect(() => {
    syncData()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [syncData])

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 30%, #E0F7FA 0%, #FCE4EC 100%)',
      fontFamily: 'sans-serif', WebkitFontSmoothing: 'antialiased'
    }}>
      
      {/* 1. 背景纹理：压暗 50% 的波纹 [视觉纠偏 4] */}
      <div style={{ 
        position: 'absolute', inset: 0, opacity: 0.015, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
      }} />

      {/* 2. 右上角：巨型背景水印 (装饰纹理) [UI 纠偏 1] */}
      <div style={{ position: 'absolute', top: '5%', right: '5%', textAlign: 'right', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ fontSize: '10rem', fontWeight: 900, color: '#2C3E50', opacity: 0.05, lineHeight: 1 }}>
          04:11
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: '#2C3E50', opacity: 0.03, marginTop: '-1rem' }}>
          根·陪伴
        </div>
      </div>

      {/* 3. 左上角：仅保留头像 (William) + 金色呼吸光晕 [UI 纠偏 1] */}
      <div style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 100 }}>
        <motion.div
          animate={{ boxShadow: [`0 0 10px rgba(212,169,106,0.1)`, `0 0 30px rgba(212,169,106,0.4)`, `0 0 10px rgba(212,169,106,0.1)`] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ 
            width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid white'
          }}
        >
          <span style={{ fontSize: '30px' }}>👦🏻</span>
        </motion.div>
      </div>

      {/* 4. 中右侧：水珠散落布局 (拇指热区) [UI 纠偏 1/2] */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
        {reminders.map((r, i) => (
          <motion.div
            key={r.id}
            animate={{ 
              y: [0, -10, 0],
              borderRadius: ["66% 34% 71% 29% / 37% 53% 47% 63%", "34% 66% 29% 71% / 53% 37% 63% 47%", "66% 34% 71% 29% / 37% 53% 47% 63%"]
            }}
            transition={{ y: { duration: 8, repeat: Infinity, delay: i * 1.2 }, borderRadius: { duration: 30, repeat: Infinity, ease: "linear" } }}
            style={{
              position: 'absolute', 
              top: `${20 + i * 15}%`, 
              right: `${8 + (i % 2) * 12}%`,
              width: '90px', height: '90px', pointerEvents: 'auto',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(20px) saturate(160%)',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: 'inset 5px 5px 15px rgba(255, 255, 255, 0.4), 10px 15px 30px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer', textAlign: 'center', padding: '10px'
            }}
            onClick={() => setSelectedReminder(r)}
          >
            <div style={{ opacity: 0.5, marginBottom: '2px' }}><Clock size={16}/></div>
            <span style={{ fontSize: '11px', color: '#2C3E50', fontWeight: 600, lineHeight: 1.2 }}>{r.title}</span>
            <div style={{ position: 'absolute', top: '15%', left: '20%', width: '15px', height: '7px', background: 'rgba(255,255,255,0.4)', borderRadius: '50%', transform: 'rotate(-30deg)' }} />
          </motion.div>
        ))}
      </div>

      {/* 5. 底部：‘基地’状态位交互 (不跳转) [UI 纠偏 3] */}
      <footer style={{ position: 'fixed', bottom: '40px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }}
              style={{ 
                marginBottom: '20px', display: 'flex', gap: '12px', padding: '12px 20px',
                background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(30px)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.4)'
              }}
            >
              {['日安', '根', '日栖'].map(label => (
                <button key={label} onClick={() => setShowBaseMenu(false)}
                  style={{ padding: '8px 20px', borderRadius: '15px', border: 'none', background: label === '日安' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 'bold', color: '#2C3E50' }}>
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowBaseMenu(!showBaseMenu)}
          style={{ width: '280px', height: '56px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <HomeIcon size={22} color={showBaseMenu ? '#B08D57' : '#2C3E50'} />
        </button>
      </footer>

      {/* 详情弹窗：马卡龙色内发光 [UI 纠偏 2.3] */}
      <AnimatePresence>
        {selectedReminder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelectedReminder(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '85%', maxWidth: '340px', padding: '25px',
                background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(40px)',
                borderRadius: '35px', border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: 'inset 5px 5px 20px rgba(225, 245, 254, 0.4), 0 20px 50px rgba(0,0,0,0.1)'
              }}
            >
              <h2 style={{ fontSize: '18px', color: '#2C3E50', marginBottom: '8px' }}>{selectedReminder.title}</h2>
              <p style={{ color: '#2C3E50', opacity: 0.7, fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>{selectedReminder.description || '暂无详细描述'}</p>
              <button style={{ width: '100%', padding: '14px', borderRadius: '15px', background: 'rgba(141,200,160,0.6)', border: 'none', color: '#FFF', fontWeight: 'bold' }}>标记完成</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
