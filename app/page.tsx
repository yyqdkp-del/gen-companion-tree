'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home as HomeIcon, Sprout, Mic, Camera, Send, AlertTriangle, BookOpen, Clock, Upload, X } from 'lucide-react'

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
  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')

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
      
      {/* 1. 背景水印：恢复“根·陪伴” [纠偏重点] */}
      <div style={{ position: 'absolute', top: '15%', right: '-5%', fontSize: '18vw', fontWeight: 'bold', color: '#2C3E50', opacity: 0.1, pointerEvents: 'none', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
        根·陪伴
      </div>

      {/* 2. 左上角：头像与成长树苗 */}
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

      {/* 家族树管理弹窗 */}
      <AnimatePresence>
        {showFamilyTree && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', top: '15%', left: '6%', zIndex: 120, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(30px)', borderRadius: '25px', padding: '15px', border: '1px solid rgba(255,255,255,0.5)', width: '220px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.5 }}>家族成员</span>
              <X size={14} onClick={() => setShowFamilyTree(false)} style={{ cursor: 'pointer', opacity: 0.4 }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
              {children.map((c, i) => (
                <div key={i} onClick={() => setChildIndex(i)} style={{ cursor: 'pointer', fontSize: '24px', opacity: childIndex === i ? 1 : 0.3 }}>{c.emoji}</div>
              ))}
            </div>
            <input placeholder="+ 输入孩子姓名添加" style={{ width: '100%', background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '12px', padding: '8px 12px', fontSize: '11px', outline: 'none', color: '#2C3E50' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. 时间 */}
      <header style={{ position: 'absolute', top: '6%', right: '8%', zIndex: 50, textAlign: 'right' }}>
        <h1 style={{ fontSize: '72px', fontWeight: 100, color: '#2C3E50', opacity: 0.9, lineHeight: 1, margin: 0 }}>
          {time.getHours()}:{time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}
        </h1>
      </header>

      {/* 4. 四个悬浮水珠 [功能重新对齐] */}
      <LiquidDrop icon={<Bell size={18}/>} label="任务感应" value={`${tasks.length} 条`} top="25%" right="15%" color="rgba(141, 160, 138, 0.4)" alert={tasks.length > 0} delay={0} />
      <LiquidDrop icon={<Clock size={18}/>} label="事务提醒" value="下午游泳" top="42%" right="28%" color="rgba(154, 183, 232, 0.4)" delay={1.5} />
      <LiquidDrop icon={<BookOpen size={18}/>} label="中文学习" value={`${currentChild?.progress} 字`} top="59%" right="12%" color="rgba(212, 169, 106, 0.4)" delay={3} />
      <LiquidDrop icon={<AlertTriangle size={18}/>} label="紧急提醒" value="Grok 侦察" top="76%" right="24%" color="#FB7185" alert={true} delay={4.5} />

      {/* 5. 底部指挥仓 [感官化纠偏] */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* 感知面板：根据点击的按钮显示不同功能 */}
        <AnimatePresence>
          {inputMode !== 'none' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: '20px', width: '340px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)', borderRadius: '30px', padding: '20px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            >
              {inputMode === 'audio_text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
                    <Mic size={18} /> <span style={{ fontSize: '12px', fontWeight: 'bold' }}>语音与指令采集</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '15px', padding: '10px 15px' }}>
                    <input autoFocus placeholder="输入文字指令..." style={{ flex: 1, background: 'none', border: 'none', fontSize: '14px', color: '#2C3E50', outline: 'none' }} />
                    <Send size={18} style={{ color: '#B08D57', cursor: 'pointer' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
                    <Camera size={18} /> <span style={{ fontSize: '12px', fontWeight: 'bold' }}>视频与文件采集</span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', padding: '10px' }}>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.4)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}><Camera size={24} /></div>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>拍摄</span>
                    </div>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.4)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}><Upload size={24} /></div>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>上传文件</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ width: '340px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px shadow-lg' }}>
          
          {/* 左侧：麦克风（语音 + 文字） [功能重组] */}
          <button 
            onClick={() => setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')} 
            style={{ width: '54px', height: '48px', borderRadius: '24px', background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
          >
            <Mic size={22} color={inputMode === 'audio_text' ? "#B08D57" : "#2C3E50"} />
          </button>
          
          <button onClick={() => setShowBaseMenu(!showBaseMenu)} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={20} color={showBaseMenu ? "#B08D57" : "#2C3E50"} />
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em', color: showBaseMenu ? "#B08D57" : "#2C3E50" }}>基地</span>
          </button>

          {/* 右侧：相机（拍照 + 文件上传） [功能重组] */}
          <button 
            onClick={() => setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')} 
            style={{ width: '54px', height: '48px', borderRadius: '24px', background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
          >
            <Camera size={22} color={inputMode === 'vision_file' ? "#B08D57" : "#2C3E50"} />
          </button>
        </div>

        {/* 基地二级菜单 */}
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '80px', display: 'flex', gap: '10px' }}
            >
              {['日安', '根', '日栖'].map(item => (
                <button key={item} style={{ padding: '8px 20px', borderRadius: '15px', background: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '11px', fontWeight: 'bold', color: '#2C3E50', backdropFilter: 'blur(10px)' }}>{item}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </main>
  )
}

function LiquidDrop({ icon, label, value, top, right, color, alert, delay }: any) {
  return (
    <motion.div animate={{ y: [0, -12, 0], rotate: [0, 1, -1, 0] }} transition={{ duration: 7, repeat: Infinity, delay, ease: "easeInOut" }}
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
