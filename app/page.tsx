'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'

// 🎨 全局美学配置：莫兰迪绿、古铜金、暖白
const COLORS = {
  bg: '#F9F8F6',
  primary: '#8DA08A', // 莫兰迪绿
  accent: '#B08D57',  // 古铜金
  text: '#2D3A4A',
  urgent: '#E8A89A',  // 珊瑚粉（替代警示红）
  school: '#9AB7E8',  // 琉璃蓝
  growth: '#D4A96A',  // 暖阳金
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [activeTab, setActiveTab] = useState('base') // 基地、日安、根、日栖
  const [activeChildId, setActiveChildId] = useState('1') // 默认大宝
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 孩子数据：支持头像形象实验室
  const children = [
    { id: '1', name: '小树', emoji: '🌳', energy: 85, color: '#8DA08A' },
    { id: '2', name: '小花', emoji: '🌸', energy: 45, color: '#E8A89A' },
  ]

  const activeChild = useMemo(() => 
    children.find(c => c.id === activeChildId) || children[0], 
  [activeChildId])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeChildId])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('child_id', activeChildId) // 核心逻辑：内容随孩子切换
      .order('urgency', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }

  // 精力条颜色逻辑
  const getEnergyColor = (val: number) => {
    if (val > 70) return '#8DA08A' // 绿
    if (val > 30) return '#D4A96A' // 黄
    return '#E8A89A' // 红
  }

  return (
    <main className="min-h-screen relative overflow-hidden font-serif" style={{ backgroundColor: COLORS.bg }}>
      
      {/* 1. 背景流体光影（呼吸感来源） */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[120px]"
          style={{ backgroundColor: COLORS.primary + '20' }}
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -30, 0] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[120px]"
          style={{ backgroundColor: COLORS.accent + '20' }}
        />
      </div>

      {/* 2. 顶部艺术化页眉 */}
      <header className="relative z-10 px-8 pt-12 pb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-widest text-[#2D3A4A] opacity-90">根·陪伴</h1>
          <motion.span 
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] text-gray-400 font-light"
          >
            今天您辛苦了
          </motion.span>
        </div>
      </header>

      {/* 3. 中部核心区 */}
      <div className="relative z-10 px-6 space-y-8">
        
        {/* 宝宝头像与精力管理 */}
        <section className="flex flex-col items-center py-4">
          <div className="relative group">
            {/* 头像切换容器 */}
            <motion.div 
              key={activeChildId}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden cursor-pointer"
            >
              {/* 这里未来可接入形象实验室选择界面 */}
              <span className="text-6xl select-none">{activeChild.emoji}</span>
            </motion.div>
            
            {/* 精力条（极简线条） */}
            <div className="w-24 mx-auto mt-4 h-[3px] bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${activeChild.energy}%` }}
                className="h-full transition-colors duration-1000"
                style={{ backgroundColor: getEnergyColor(activeChild.energy) }}
              />
            </div>

            {/* 多孩切换 + 号 */}
            <button className="absolute bottom-6 -right-2 w-8 h-8 rounded-full bg-[#2D3A4A] text-white flex items-center justify-center shadow-lg active:scale-90 transition">
              <span className="text-lg">+</span>
            </button>
          </div>

          {/* 切换控制（错落分布） */}
          <div className="flex gap-6 mt-6">
            {children.map(c => (
              <button 
                key={c.id}
                onClick={() => setActiveChildId(c.id)}
                className={`text-xs tracking-widest transition-all ${activeChildId === c.id ? 'text-[#2D3A4A] font-bold border-b border-[#2D3A4A]' : 'text-gray-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* 4. 星光气泡（错落有致的功能球） */}
        <section className="grid grid-cols-2 gap-4">
          <Bubble label="今日任务" color={COLORS.primary} delay={0.1} />
          <Bubble label="身体状况" color="#E8A89A" delay={0.2} offset="-15px" />
          <Bubble label="明日校事" color={COLORS.school} delay={0.3} />
          <Bubble label="事务提示" color={COLORS.accent} delay={0.4} offset="10px" />
          <Bubble label="应急情报" color="#D68D7D" delay={0.5} isEmergency />
        </section>

        {/* 5. 树洞指令中心（玻璃拟态） */}
        <section className="mt-12 bg-white/30 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 shadow-glass">
          <input 
            type="text"
            placeholder="轻声说，或输入指令..."
            className="w-full bg-transparent border-none text-sm placeholder:text-gray-400 focus:ring-0"
          />
          <div className="flex justify-between items-center mt-4">
             <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-gray-200 animate-pulse delay-75" />
             </div>
             <button className="text-[10px] tracking-[0.2em] uppercase text-[#B08D57] font-bold">Send</button>
          </div>
        </section>
      </div>

      {/* 6. 底部艺术导航 */}
      <nav className="fixed bottom-10 left-0 right-0 z-50 px-8">
        <div className="max-w-md mx-auto flex justify-between items-end">
          <ArtTab id="base" label="基地" active={activeTab} color={COLORS.primary} onClick={setActiveTab} />
          <ArtTab id="rian" label="日安" active={activeTab} color="#D4A96A" onClick={setActiveTab} />
          <ArtTab id="gen" label="根" active={activeTab} color="#B08D57" onClick={setActiveTab} />
          <ArtTab id="riqi" label="日栖" active={activeTab} color="#2D3A4A" onClick={setActiveTab} />
        </div>
      </nav>
    </main>
  )
}

// --- 子组件：星光气泡 ---
function Bubble({ label, color, delay, offset = "0px", isEmergency = false }: any) {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.8 }}
      style={{ marginTop: offset }}
      className="flex flex-col items-center"
    >
      <motion.button
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4 + delay*2, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 rounded-full flex items-center justify-center shadow-glass relative group active:scale-95 transition"
        style={{ backgroundColor: color + 'CC', border: `1px solid ${color}` }}
      >
        <span className="text-white text-[11px] font-bold tracking-tighter text-center px-4 leading-tight">
          {label}
        </span>
        {isEmergency && (
          <div className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full flex items-center justify-center animate-bounce shadow-sm">
             <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
          </div>
        )}
      </motion.button>
    </motion.div>
  )
}

// --- 子组件：艺术字块导航 ---
function ArtTab({ id, label, active, color, onClick }: any) {
  const isActive = active === id
  return (
    <button 
      onClick={() => onClick(id)}
      className="flex flex-col items-center gap-1 group"
    >
      <motion.div 
        animate={{ 
          height: isActive ? 48 : 42,
          y: isActive ? -8 : 0 
        }}
        className="px-5 rounded-2xl flex items-center justify-center shadow-soft transition-colors"
        style={{ backgroundColor: isActive ? color : 'white' }}
      >
        <span className={`text-xs font-bold tracking-[0.2em] ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {label}
        </span>
      </motion.div>
    </button>
  )
}
