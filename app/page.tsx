'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Mic, Send, AlertTriangle, Navigation, ExternalLink } from 'lucide-react'

// 🎨 V2.0 核心美学调色盘：清迈极简主义 [cite: 19, 51]
const THEME = {
  bg: '#F9F8F6',      // 暖白底色 [cite: 19]
  primary: '#8DA08A', // 基地：莫兰迪绿
  rian: '#D4A96A',    // 日安：暖橙
  root: '#B08D57',    // 根：古铜金
  riqi: '#2D3A4A',    // 日栖：深邃蓝
  task: '#8DA08A',    // 今日任务：抹茶绿
  body: '#E8A89A',    // 身体状况：晚霞粉
  school: '#9AB7E8',  // 明日校事：琉璃蓝
  emergency: '#D68D7D' // 应急情况：珊瑚色 [cite: 25]
}

// ⚠️ 请确保在 Vercel 环境变量中配置了这些 Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export default function Home() {
  const [activeTab, setActiveTab] = useState('base')
  const [activeChildId, setActiveChildId] = useState('1')
  const [tasks, setTasks] = useState<any[]>([])
  const [inputText, setInputText] = useState('')

  // 👶 多孩管理数据：支持头像形象联动 [cite: 18, 23]
  const children = [
    { id: '1', name: '小树', emoji: '🌳', energy: 85, color: THEME.primary },
    { id: '2', name: '小花', emoji: '🌸', energy: 40, color: THEME.body },
  ]

  const activeChild = useMemo(() => 
    children.find(c => c.id === activeChildId) || children[0], 
  [activeChildId])

  // 实时订阅与地理位置模拟感知 [cite: 31, 43, 68]
  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .eq('child_id', activeChildId) // 切换孩子时内容自动更新 [cite: 23]
        .order('urgency', { ascending: true })
      setTasks(data || [])
    }

    fetchTasks()
    const channel = supabase.channel('realtime_tasks').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks' }, fetchTasks).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChildId])

  return (
    <main className="min-h-[100dvh] relative overflow-hidden font-serif" style={{ backgroundColor: THEME.bg }}>
      
      {/* 1. 动态呼吸感背景：流体渐变 [cite: 15, 57] */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full blur-[100px]"
          style={{ backgroundColor: THEME.primary + '15' }}
        />
      </div>

      {/* 2. 顶部：艺术化页眉 & 情感关怀 [cite: 6, 12, 16] */}
      <header className="relative z-20 px-8 pt-12">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-[0.3em] text-[#2D3A4A] opacity-80">根·陪伴</h1>
          <motion.span 
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="text-[10px] tracking-[0.4em] text-gray-400 mt-1 uppercase"
          >
            今天您辛苦了
          </motion.span>
        </div>
      </header>

      {/* 3. 头像区：精力条与多孩一键管理 [cite: 18, 23] */}
      <section className="relative z-20 flex flex-col items-center mt-8">
        <div className="relative">
          <motion.div 
            key={activeChildId}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden"
          >
            <span className="text-5xl select-none">{activeChild.emoji}</span>
          </motion.div>
          
          {/* 精力条：根据数值自动变色 (绿/黄/红) [cite: 23] */}
          <div className="w-20 mx-auto mt-4 h-1 bg-gray-200/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${activeChild.energy}%` }}
              className="h-full transition-colors duration-1000"
              style={{ 
                backgroundColor: activeChild.energy > 70 ? THEME.primary : (activeChild.energy > 30 ? THEME.root : THEME.body) 
              }}
            />
          </div>

          <button className="absolute bottom-6 -right-2 w-7 h-7 rounded-full bg-[#2D3A4A] text-white flex items-center justify-center shadow-lg active:scale-90">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex gap-6 mt-4">
          {children.map(c => (
            <button key={c.id} onClick={() => setActiveChildId(c.id)} className={`text-[10px] tracking-widest ${activeChildId === c.id ? 'text-[#2D3A4A] font-bold' : 'text-gray-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* 4. 错落有致的星光气泡：即插即用功能块 [cite: 43, 53] */}
      <section className="relative z-20 px-8 mt-10 grid grid-cols-2 gap-x-4 gap-y-8 justify-items-center">
        <Bubble label="今日任务" color={THEME.task} delay={0} />
        <Bubble label="身体状况" color={THEME.body} delay={0.1} yOffset={20} />
        <Bubble label="明日校事" color={THEME.school} delay={0.2} />
        <Bubble label="事务提示" color={THEME.root} delay={0.3} yOffset={15} />
        {/* 应急情况置顶展示 [cite: 25, 75] */}
        <div className="col-span-2 w-full px-4">
           {tasks.find(t => t.is_emergency) && (
             <motion.div className="bg-red-50/80 border-2 border-red-200 rounded-[2rem] p-4 flex items-center gap-3">
               <AlertTriangle className="text-red-500 w-5 h-5 animate-pulse" />
               <div className="flex-1">
                 <p className="text-[11px] font-bold text-red-900">应急提醒：{tasks.find(t => t.is_emergency).title}</p>
               </div>
               <Navigation className="text-red-500 w-4 h-4" />
             </motion.div>
           )}
        </div>
      </section>

      {/* 5. 树洞指令中心：支持语音与文字 [cite: 31] */}
      <section className="relative z-20 px-8 mt-12 pb-32">
        <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] p-4 flex items-center gap-3 border border-white/60 shadow-glass">
          <Mic size={18} className="text-gray-400 cursor-pointer" />
          <input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="轻声诉说或下达指令..." 
            className="flex-1 bg-transparent border-none text-xs focus:ring-0 placeholder:text-gray-300"
          />
          <Send size={18} className="text-[#B08D57] cursor-pointer" />
        </div>
      </section>

      {/* 6. 底部艺术化导航：去图标艺术字块  */}
      <nav className="fixed bottom-8 left-0 right-0 z-50 px-8">
        <div className="max-w-md mx-auto flex justify-between items-center bg-white/20 backdrop-blur-2xl rounded-[2rem] p-2 border border-white/30">
          <NavItem id="base" label="基地" active={activeTab} color={THEME.primary} onClick={setActiveTab} />
          <NavItem id="rian" label="日安" active={activeTab} color={THEME.rian} onClick={setActiveTab} />
          <NavItem id="root" label="根" active={activeTab} color={THEME.root} onClick={setActiveTab} />
          <NavItem id="riqi" label="日栖" active={activeTab} color={THEME.riqi} onClick={setActiveTab} />
        </div>
      </nav>
    </main>
  )
}

// 子组件：星光气泡 (支持呼吸感动效) 
function Bubble({ label, color, delay, yOffset = 0 }: any) {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: yOffset, opacity: 1 }}
      transition={{ delay, duration: 0.8 }}
      className="w-24 flex flex-col items-center"
    >
      <motion.button 
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity }}
        className="w-full aspect-square rounded-full flex items-center justify-center shadow-glass relative active:scale-95"
        style={{ backgroundColor: color + 'CC', border: `1px solid ${color}40` }}
      >
        <span className="text-white text-[10px] font-bold tracking-widest text-center px-2">{label}</span>
      </motion.button>
    </motion.div>
  )
}

// 子组件：去图标艺术字块导航 
function NavItem({ id, label, active, color, onClick }: any) {
  const isActive = active === id
  return (
    <button onClick={() => onClick(id)} className="flex-1 py-3 flex flex-col items-center transition-all">
      <motion.div 
        animate={{ scale: isActive ? 1.1 : 1 }}
        className={`px-4 py-1.5 rounded-full ${isActive ? 'shadow-soft' : ''}`}
        style={{ backgroundColor: isActive ? color : 'transparent' }}
      >
        <span className={`text-[11px] font-bold tracking-[0.2em] ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {label}
        </span>
      </motion.div>
    </button>
  )
}
