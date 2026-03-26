'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home as HomeIcon, Sprout, Mic, Camera, Send, AlertTriangle, BookOpen, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function HydroApp() {
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([
    { name: 'William', emoji: '👦🏻', energy: 85, progress: 12 },
    { name: 'Noah', emoji: '👶🏻', energy: 42, progress: 5 },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)
  const [showFamilyTree, setShowFamilyTree] = useState(false)
  const [inputMode, setInputMode] = useState<'none' | 'active'>('none')

  useEffect(() => {
    const syncData = async () => {
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
  const getEnergyColor = (val: number) => val > 70 ? '#4ADE80' : val > 40 ? '#FACC15' : '#FB7185'

  return (
    <main style={{ 
      position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)', fontFamily: 'sans-serif'
    }}>
      
      {/* 1. 背景水印 */}
      <div style={{ position: 'absolute', top: '15%', right: '-5%', fontSize: '18vw', fontWeight: 'bold', color: '#2C3E50', opacity: 0.1, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
        Gen Companion
      </div>

      {/* 2. 左上角：成长树苗与孩子控制 */}
      <div style={{ position: 'absolute', top: '6%', left: '6%', zIndex: 100 }}>
        <div style={{ position: 'relative' }}>
          <motion.div 
            onClick={() => setChildIndex(i => (i + 1) % children.length)}
            animate={{ boxShadow: [`0 0 15px ${getEnergyColor(currentChild?.energy)}40`, `0 0 35px ${getEnergyColor(currentChild?.energy)}80`, `0 0 15px ${getEnergyColor(currentChild?.energy)}40`] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '36px' }}>{currentChild?.emoji}</span>
          </motion.div>
          
          {/* 🌱 成长树苗图标 (管理多孩功能) */}
          <motion.button 
            onClick={() => setShowFamilyTree(!showFamilyTree)}
            whileTap={{ scale: 0.8 }}
            style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8DA08A', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
          >
            <Sprout size={18} />
          </motion.button>
        </div>
        <p style={{ marginTop: '12px', fontSize: '11px', color: '#2C3E50', fontWeight: 'bold', letterSpacing: '0.2em', textAlign: 'center' }}>{currentChild?.name}</p>
        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden', margin: '4px auto' }}>
          <motion.div animate={{ width: `${currentChild?.energy}%`, backgroundColor: getEnergyColor(currentChild?.energy) }} style={{ height: '100%' }} />
        </div>
      </div>

      {/* 家族树弹窗 (SC-02) */}
      <AnimatePresence>
        {showFamilyTree && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '15%', left: '6%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: '25px', padding: '15px', border: '1px solid rgba(255,255,255,0.5)', width: '200px' }}
          >
            <p style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.5, marginBottom: '10px' }}>管理家族成员</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {children.map((c, i) => (
                <div key={i} onClick={() => setChildIndex(i)} style={{ cursor: 'pointer', opacity: childIndex === i ? 1 : 0.4 }}>{c.emoji}</div>
              ))}
            </div>
            <input placeholder="+ 添加孩子名字" style={{ width: '100%', background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '10px', padding: '5px 10px', fontSize: '11px', outline: 'none' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. 右上角：时间 */}
      <header style={{ position: 'absolute', top: '6%', right: '8%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: '72px', fontWeight: 100, color: '#2C3E50', opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
      </header>

      {/* 4. 四个功能水珠：任务、提醒、中文、紧急 */}
      <LiquidDrop icon={<Bell size={18}/>} label="任务感应" value={`${tasks.length} 条`} top="25%" right="15%" color="rgba(141, 160, 138, 0.4)" alert={tasks.length > 0} delay={0} />
      <LiquidDrop icon={<Clock size={18}/>} label="事务提醒" value="下午游泳" top="42%" right="28%" color="rgba(154, 183, 232, 0.4)" delay={1.5} />
      <LiquidDrop icon={<BookOpen size={18}/>} label="中文学习" value={`${currentChild?.progress} 字`} top="59%" right="12%" color="rgba(212, 169, 106, 0.4)" delay={3} />
      <LiquidDrop icon={<AlertTriangle size={18}/>} label="紧急提醒" value="Grok 侦察中" top="76%" right="24%" color="#FB7185" alert={true} delay={4.5} />

      {/* 5. 底部指挥仓：重构感知器官 */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence>
          {inputMode === 'active' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: '20px', width: '320px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)', borderRadius: '30px', padding: '15px', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Mic size={20} style={{ color: '#2C3E50', opacity: 0.6 }} />
                <Camera size={20} style={{ color: '#2C3E50', opacity: 0.6 }} />
                <input placeholder="输入指令..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid rgba(44,62,80,0.2)', fontSize: '12px', color: '#2C3E50', outline: 'none' }} />
                <Send size={20} style={{ color: '#B08D57' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ width: '340px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px shadow-lg' }}>
          {/* 左侧：感知入口 (语音/文字/视频) */}
          <button onClick={() => setInputMode(inputMode === 'none' ? 'active' : 'none')} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Mic size={20} color="#2C3E50" />
          </button>
          
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={20} color={showBaseMenu ? "#B08D57" : "#2C3E50"} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: showBaseMenu ? "#B08D57" : "#2C3E50" }}>基地</span>
          </button>

          {/* 右侧：视觉采集入口 */}
          <button onClick={() => setInputMode(inputMode === 'none' ? 'active' : 'none')} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Camera size={20} color="#2C3E50" />
          </button>
        </div>
      </footer>
    </main>
  )
}

function LiquidDrop({ icon, label, value, top, right, color, alert, delay }: any) {
  return (
    <motion.div animate={{ y: [0, -15, 0], rotate: [0, 2, -2, 0] }} transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
      style={{ position: 'absolute', top, right, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div style={{ width: '92px', height: '92px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3) 0%, ${color} 100%)`, boxShadow: 'inset 5px 5px 10px rgba(255,255,255,0.3), 10px 15px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ color: '#2C3E50', opacity: 0.7, marginBottom: '2px' }}>{icon}</div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2C3E50' }}>{value}</span>
        <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#2C3E50', opacity: 0.3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        {alert && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ position: 'absolute', top: '10px', right: '15px', width: '10px', height: '10px', backgroundColor: '#FB7185', borderRadius: '50%', border: '2px solid white' }} />}
      </div>
    </motion.div>
  )
}
