'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home as HomeIcon, Settings } from 'lucide-react'

// 强制 Next.js 跳过静态预渲染，防止构建时因缺失 Env 报错
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function HydroApp() {
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
      // WF-01/02/08: 实时任务与孩子状态同步
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])
      const { data: childData } = await supabase.from('children_status').select('*')
      if (childData?.length) setChildren(childData)
    }
    syncData()
    const channel = supabase.channel('realtime_sync').on('postgres_changes', { event: '*', schema: 'public' }, syncData).subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const greeting = time.getHours() < 12 ? '早安' : time.getHours() < 18 ? '午后好' : '晚安'

  return (
    <main style={{ 
      position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)', fontFamily: 'sans-serif'
    }}>
      
      {/* 1. 空间重组：背景巨型水印 [UI 纠偏] */}
      <div style={{
        position: 'absolute', top: '15%', right: '-5%', fontSize: '18vw', fontWeight: 'bold',
        color: '#2C3E50', opacity: 0.1, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap'
      }}>
        根·陪伴
      </div>

      {/* 2. 左上角：头像与金色呼吸圈 [修订①] */}
      <motion.div 
        onClick={() => setChildIndex(i => (i + 1) % children.length)}
        style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 50, cursor: 'pointer' }}
      >
        <motion.div 
          animate={{ boxShadow: ['0 0 15px rgba(212,169,106,0.2)', '0 0 40px rgba(212,169,106,0.5)', '0 0 15px rgba(212,169,106,0.2)'] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ 
            width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.5)'
          }}
        >
          <span style={{ fontSize: '32px' }}>{currentChild?.emoji}</span>
        </motion.div>
        <p style={{ marginTop: '8px', fontSize: '10px', color: '#2C3E50', opacity: 0.4, fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.4em' }}>
          {currentChild?.name}
        </p>
      </motion.div>

      {/* 3. 右上角：大字号时间 [UI 纠偏] */}
      <header style={{ position: 'absolute', top: '6%', right: '8%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: '72px', fontWeight: 100, color: '#2C3E50', opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
        <div style={{ marginTop: '8px', color: '#2C3E50', opacity: 0.3, fontSize: '12px', letterSpacing: '0.2em' }}>
          {greeting}
        </div>
      </header>

      {/* 4. 液态水珠：S型散落分布 [UI 纠偏] [WF-08 预警] */}
      <LiquidDrop icon={<Bell size={18}/>} label="任务感应" value={tasks.length > 0 ? `${tasks.length} 条` : '静默'} top="28%" right="15%" color="rgba(141, 160, 138, 0.4)" alert={tasks.length > 0} delay={0} />
      <LiquidDrop icon={<Zap size={18}/>} label="精力状态" value="85%" top="45%" right="28%" color="rgba(212, 169, 106, 0.4)" delay={1.5} />
      <LiquidDrop icon={<Heart size={18}/>} label="当前状态" value="活跃" top="60%" right="12%" color="rgba(232, 168, 154, 0.4)" delay={3} />
      <LiquidDrop icon={<Trees size={18}/>} label="清迈天气" value="28°" top="75%" right="24%" color="rgba(154, 183, 232, 0.4)" delay={4.5} />

      {/* 5. 底部交互：基地弹出菜单 [修订②] */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(30px)', borderRadius: '40px', padding: '12px', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', gap: '16px' }}
            >
              {['日安', '根', '日栖'].map(item => (
                <button key={item} style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', 
                  border: '1px solid rgba(255,255,255,0.5)', color: '#2C3E50', fontSize: '11px', 
                  fontWeight: 'bold', letterSpacing: '0.2em', cursor: 'pointer' 
                }}>{item}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ 
          width: '320px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', 
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', 
          alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' 
        }}>
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', color: showBaseMenu ? '#B08D57' : '#2C3E50', 
            opacity: showBaseMenu ? 1 : 0.5, border: 'none', background: 'none', cursor: 'pointer' 
          }}>
            <HomeIcon size={20} /> <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em' }}>基地</span>
          </button>
          <div style={{ height: '16px', width: '1px', background: 'rgba(44,62,80,0.1)' }} />
          <button style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', color: '#2C3E50', 
            opacity: 0.2, border: 'none', background: 'none', cursor: 'default' 
          }}>
            <Settings size={20} /> <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em' }}>目安</span>
          </button>
        </div>
      </footer>
    </main>
  )
}

function LiquidDrop({ icon, label, value, top, right, color, alert, delay }: any) {
  return (
    <motion.div
      animate={{ y: [0, -20, 0], x: [0, 8, 0], rotate: [0, 4, -4, 0] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
      style={{ position: 'absolute', top, right, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
    >
      <div style={{ 
        width: '96px', height: '96px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%', position: 'relative', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, ${color} 100%)`,
        boxShadow: 'inset 8px 8px 15px rgba(255, 255, 255, 0.4), inset -8px -8px 15px rgba(0, 0, 0, 0.05), 10px 20px 30px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ color: '#2C3E50', opacity: 0.6, marginBottom: '2px' }}>{icon}</div>
        <span style={{ fontSize: '14px', fontWeight: 300, color: '#2C3E50', fontStyle: 'italic' }}>{value}</span>
        <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#2C3E50', opacity: 0.3, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</span>
        
        {alert && (
          <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }}
            style={{ position: 'absolute', top: '12px', right: '20px', width: '12px', height: '12px', backgroundColor: '#E8A89A', borderRadius: '50%', border: '2px solid white' }} 
          />
        )}
        <div style={{ position: 'absolute', top: '16px', left: '24px', width: '16px', height: '8px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '50%', transform: 'rotate(-35deg)', filter: 'blur(0.5px)' }} />
      </div>
    </motion.div>
  )
}
