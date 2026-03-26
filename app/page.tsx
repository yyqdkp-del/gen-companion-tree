'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, Trees, Zap, Home, Settings } from 'lucide-react'
import DynamicRenderer from './components/DynamicRenderer'

// 🎨 调色盘：完全同步灵感图
const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  glass: 'rgba(255, 255, 255, 0.25)',
  text: '#FFFFFF',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type ChildStatus = { name: string; status: string }

export default function HydroApp() {
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<ChildStatus[]>([
    { name: 'William', status: 'active' },
    { name: 'Noah', status: 'active' },
  ])
  const [childIndex, setChildIndex] = useState(0)
  const [time, setTime] = useState(new Date())
  const [showBaseMenu, setShowBaseMenu] = useState(false)

  useEffect(() => {
    const syncData = async () => {
      const { data: taskData } = await supabase.from('tasks').select('*').eq('status', 'pending')
      setTasks(taskData || [])

      const { data: childData } = await supabase.from('children_status').select('name, status')
      if (childData && childData.length > 0) setChildren(childData)
    }

    syncData()

    const channel = supabase.channel('realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, syncData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children_status' }, syncData)
      .subscribe()

    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => { supabase.removeChannel(channel); clearInterval(ticker) }
  }, [])

  const hour = time.getHours()
  const greeting = hour < 5 ? '深夜安好' : hour < 12 ? '早安' : hour < 18 ? '午后好' : '晚安'
  const currentChild = children[childIndex]
  const statusMap: Record<string, string> = {
    sleeping: '睡眠中', active: '活跃', school: '上学中', eating: '用餐中',
  }

  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden select-none"
          style={{ background: THEME.bg }}>

      {/* 背景水波纹 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />

      {/* 1. 左上角：头像 */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-16 left-10 z-30">
        <div
          className="relative cursor-pointer transition-transform active:scale-90"
          onClick={() => setChildIndex(i => (i + 1) % children.length)}
        >
          <div className="w-20 h-20 rounded-full bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center p-1 border border-white/50">
            <div className="w-full h-full rounded-full bg-[#FFE4E6] flex items-center justify-center text-4xl">
              {currentChild?.name === 'William' ? '👦🏻' : '👶🏻'}
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#2D3A4A] rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-white/70 tracking-widest uppercase">
            {currentChild?.name}
          </p>
        </div>
      </motion.div>

      {/* 2. 右上角：时间与品牌 */}
      <header className="absolute top-16 right-10 z-30 text-right text-white font-sans">
        <h1 className="text-7xl font-extralight tracking-tighter leading-none opacity-90">
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <div className="flex flex-col items-end mt-2">
          <span className="text-[13px] tracking-[0.2em] font-light opacity-80">{greeting}</span>
          <p className="text-[14px] tracking-[0.4em] font-light mt-1 opacity-60 uppercase">根·Companion</p>
        </div>
      </header>

      {/* 3. 水珠区 — 由 DynamicRenderer 驱动，水珠样式完全保留 */}
      <section className="absolute inset-0 z-20 pointer-events-none">
        <DynamicRenderer
          page="dashboard"
          extraData={{
            TaskCard: { tasks },
            ChildCard: { children, childIndex, statusMap },
          }}
          renderItem={(config, data) => {
            const positions: Record<string, { top: string; right: string; delay: number }> = {
              dashboard_task_card:    { top: '28%', right: '15%', delay: 0 },
              dashboard_energy_card:  { top: '45%', right: '24%', delay: 1.5 },
              dashboard_child_card:   { top: '58%', right: '12%', delay: 3 },
              dashboard_weather_card: { top: '72%', right: '26%', delay: 4.5 },
            }
            const pos = positions[config.config_key]
            if (!pos) return null

            const iconMap: Record<string, React.ReactNode> = {
              TaskCard:    <Bell size={14} />,
              EnergyCard:  <Zap size={14} />,
              ChildCard:   <Heart size={14} />,
              WeatherCard: <Trees size={14} />,
            }
            const colorMap: Record<string, string> = {
              TaskCard:    '#7AB89A',
              EnergyCard:  '#D4A96A',
              ChildCard:   '#C88A8A',
              WeatherCard: '#8AB8C8',
            }

            let value = config.config_value?.value ?? '—'
            let alert = false

            if (config.component === 'TaskCard') {
              const t = data?.TaskCard?.tasks || []
              value = t.length > 0 ? `${t.length} 条` : '静默'
              alert = t.length > 0
            } else if (config.component === 'ChildCard') {
              const ch = data?.ChildCard?.children || []
              const idx = data?.ChildCard?.childIndex ?? 0
              const sm = data?.ChildCard?.statusMap ?? {}
              value = sm[ch[idx]?.status] || '活跃'
            }

            return (
              <WaterDrop
                key={config.id}
                label={config.config_value?.title ?? config.component}
                icon={iconMap[config.component]}
                top={pos.top}
                right={pos.right}
                color={colorMap[config.component] ?? '#7AB89A'}
                value={value}
                alert={alert}
                delay={pos.delay}
              />
            )
          }}
        />
      </section>

      {/* 4. 底部导航 */}
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

function WaterDrop({ label, icon, top, right, color, value, alert, delay }: any) {
  return (
    <motion.div
      style={{ top, right, position: 'absolute' }}
      animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
      className="flex flex-col items-center gap-2 pointer-events-auto"
    >
      <div
        className="w-20 h-20 rounded-full backdrop-blur-md border border-white/40 relative flex flex-col items-center justify-center p-3"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, ${color}50 100%)`,
          boxShadow: `inset -6px -6px 12px rgba(0,0,0,0.05), inset 6px 6px 15px rgba(255,255,255,0.4), 0 15px 35px rgba(0,0,0,0.05)`
        }}
      >
        <div className="text-white drop-shadow-md mb-0.5">{icon}</div>
        <span className="text-[12px] text-white font-light tracking-tight">{value}</span>
        <span className="text-[8px] text-white/70 tracking-widest font-bold uppercase mt-1">{label}</span>

        {alert && (
          <motion.span animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E87A6A] rounded-full border border-white" />
        )}
        <div className="absolute top-4 left-6 w-3 h-1.5 bg-white/50 rounded-full rotate-[-35deg] blur-[0.3px]" />
      </div>
    </motion.div>
  )
}
