'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home as HomeIcon, Sprout, Mic, Camera, Send, AlertTriangle, BookOpen, Clock, Upload, X } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// ⑤ Make.com Webhook
const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

export default function HydroApp() {
  const router = useRouter()

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

  // ⑤ 指令发送状态
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  // ① app_config 动态水珠配置
  const [dropConfigs, setDropConfigs] = useState<any[]>([])

  // ③ Grok 热点
  const [localEvents, setLocalEvents] = useState<any[]>([])

  useEffect(() => {
    const syncData = async () => {
      // 任务
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])

      // ① 孩子 — 改从 children 表读（有 energy/progress 字段）
      const { data: childData } = await supabase.from('children').select('*')
      if (childData?.length) setChildren(childData)

      // ① ② app_config — is_visible 控制水珠
      const { data: configData } = await supabase
        .from('app_config')
        .select('*')
        .eq('page', 'dashboard')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
      setDropConfigs(configData || [])

      // ③ local_events — Grok 热点真实数据
      const { data: eventData } = await supabase
        .from('local_events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      setLocalEvents(eventData || [])
    }

    syncData()
    const channel = supabase.channel('realtime_sync').on('postgres_changes', { event: '*', schema: 'public' }, syncData).subscribe()
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const currentChild = children[childIndex]
  const getEnergyColor = (val: number) => val > 70 ? '#4ADE80' : val > 40 ? '#FACC15' : '#FB7185'

  // ⑤ 发送指令到 Make.com
  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    setSending(true)
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: inputText.trim(),
          child: currentChild?.name,
          timestamp: new Date().toISOString(),
          source: 'app_text_input',
        }),
      })
      setInputText('')
      setInputMode('none')
    } catch (e) {
      console.error('Webhook error', e)
    } finally {
      setSending(false)
    }
  }

  // ① 动态水珠内容
  const iconMap: Record<string, React.ReactNode> = {
    TaskCard:    <Bell size={18} />,
    EnergyCard:  <Zap size={18} />,
    ChildCard:   <Heart size={18} />,
    WeatherCard: <Trees size={18} />,
    AlertCard:   <AlertTriangle size={18} />,
    ClockCard:   <Clock size={18} />,
    BookCard:    <BookOpen size={18} />,
  }
  const colorMap: Record<string, string> = {
    TaskCard:    'rgba(141, 160, 138, 0.4)',
    EnergyCard:  'rgba(212, 169, 106, 0.4)',
    ChildCard:   'rgba(232, 168, 154, 0.4)',
    WeatherCard: 'rgba(154, 183, 232, 0.4)',
    AlertCard:   '#FB7185',
    ClockCard:   'rgba(154, 183, 232, 0.4)',
    BookCard:    'rgba(212, 169, 106, 0.4)',
  }
  const positions = [
    { top: '25%', right: '15%' },
    { top: '42%', right: '28%' },
    { top: '59%', right: '12%' },
    { top: '76%', right: '24%' },
    { top: '33%', right: '35%' },
    { top: '65%', right: '38%' },
  ]
  const getDropValue = (component: string, config: any) => {
    if (component === 'TaskCard') return tasks.length > 0 ? `${tasks.length} 条` : '静默'
    if (component === 'ChildCard') {
      const sm: Record<string, string> = { sleeping: '睡眠中', active: '活跃', school: '上学中', eating: '用餐中' }
      return sm[currentChild?.status] || '活跃'
    }
    if (component === 'AlertCard') return localEvents[0]?.title_cn?.slice(0, 4) || 'Grok 侦察'
    if (component === 'BookCard') return `${currentChild?.progress ?? 0} 字`
    return config.config_value?.value ?? '—'
  }

  return (
    <main style={{ 
      position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)', fontFamily: 'sans-serif'
    }}>
      
      {/* 1. 背景水印 */}
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

      {/* ① ② 水珠区 — 由 app_config 动态驱动 */}
      {dropConfigs.map((config, i) => {
        const pos = positions[i] || positions[0]
        const value = getDropValue(config.component, config)
        const label = config.config_value?.title ?? config.component
        const alert = config.component === 'TaskCard' ? tasks.length > 0 : config.component === 'AlertCard' ? localEvents.length > 0 : false
        return (
          <LiquidDrop
            key={config.id}
            icon={iconMap[config.component] ?? <Bell size={18} />}
            label={label}
            value={value}
            top={pos.top}
            right={pos.right}
            color={colorMap[config.component] ?? 'rgba(141,160,138,0.4)'}
            alert={alert}
            delay={i * 1.5}
          />
        )
      })}

      {/* 5. 底部指挥仓 */}
      <footer style={{ position: 'fixed', bottom: '48px', left: 0, right: 0, zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
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
                  {/* ⑤ 输入框接 Make.com */}
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '15px', padding: '10px 15px' }}>
                    <input
                      autoFocus
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendCommand()}
                      placeholder="输入文字指令..."
                      style={{ flex: 1, background: 'none', border: 'none', fontSize: '14px', color: '#2C3E50', outline: 'none' }}
                    />
                    <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand} style={{ cursor: 'pointer', opacity: sending ? 0.4 : 1 }}>
                      <Send size={18} style={{ color: '#B08D57' }} />
                    </motion.div>
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

        <div style={{ width: '340px', height: '64px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
          
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

          <button 
            onClick={() => setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')} 
            style={{ width: '54px', height: '48px', borderRadius: '24px', background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s' }}
          >
            <Camera size={22} color={inputMode === 'vision_file' ? "#B08D57" : "#2C3E50"} />
          </button>
        </div>

        {/* ④ 基地菜单 — 点击跳转页面 */}
        <AnimatePresence>
          {showBaseMenu && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '80px', display: 'flex', gap: '10px' }}
            >
              {[
                { label: '日安', path: '/rian' },
                { label: '根', path: '/' },
                { label: '树洞', path: '/treehouse' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  style={{ padding: '8px 20px', borderRadius: '15px', background: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '11px', fontWeight: 'bold', color: '#2C3E50', backdropFilter: 'blur(10px)', cursor: 'pointer' }}
                >
                  {item.label}
                </button>
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
