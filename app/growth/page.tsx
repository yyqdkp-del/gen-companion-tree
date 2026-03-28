'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Share2, X, Home as HomeIcon, Mic, Camera } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// ── 里程碑类型 ──
const CATEGORY = {
  chinese:  { emoji: '📖', label: '中文学习', bubble: 'rgba(180,220,180,0.55)',  glow: '#7BC47B' },
  academic: { emoji: '🏆', label: '学业成绩', bubble: 'rgba(255,215,120,0.55)',  glow: '#F0C040' },
  hobby:    { emoji: '🎨', label: '兴趣爱好', bubble: 'rgba(220,180,220,0.55)',  glow: '#C87BC8' },
  award:    { emoji: '🌟', label: '比赛获奖', bubble: 'rgba(255,200,100,0.6)',   glow: '#F5A020' },
  travel:   { emoji: '✈️', label: '旅行回忆', bubble: 'rgba(160,200,240,0.55)',  glow: '#60A8E0' },
  family:   { emoji: '🏠', label: '家庭时光', bubble: 'rgba(240,190,150,0.55)',  glow: '#D4845A' },
}

// ── 示例里程碑 ──
const DEMO: Milestone[] = [
  { id:'1', child_name:'William', category:'chinese',  title:'认识100个汉字', date:'2024-09-15', note:'今天考了满分，他超级开心', x:22, y:18 },
  { id:'2', child_name:'William', category:'award',    title:'游泳比赛亚军',  date:'2024-10-20', note:'练了三个月，终于有了成果', x:68, y:12 },
  { id:'3', child_name:'Noah',    category:'family',   title:'第一句完整话',  date:'2024-11-05', note:'说了"妈妈我爱你"，我哭了', x:80, y:30 },
  { id:'4', child_name:'William', category:'travel',   title:'素帖山之旅',    date:'2025-01-10', note:'第一次看到满天星星', x:15, y:38 },
  { id:'5', child_name:'William', category:'chinese',  title:'开始写日记了',  date:'2025-02-18', note:'写了五行，字歪歪但认真', x:55, y:22 },
  { id:'6', child_name:'Noah',    category:'hobby',    title:'爱上画画',      date:'2025-03-01', note:'每天都要画一幅给我', x:38, y:8  },
]

type Milestone = {
  id: string
  child_name: string
  category: string
  title: string
  date: string
  note?: string
  photo_url?: string
  x: number  // 屏幕百分比
  y: number  // 屏幕百分比（树冠区）
}

// ── 气泡浮动参数（每个独立节奏）──
const FLOAT_PARAMS = [
  { duration: 7,   delay: 0,   yRange: 18, xDrift: 6  },
  { duration: 9,   delay: 1.5, yRange: 14, xDrift: 8  },
  { duration: 6.5, delay: 3,   yRange: 20, xDrift: 5  },
  { duration: 8.5, delay: 0.8, yRange: 12, xDrift: 10 },
  { duration: 7.5, delay: 2.2, yRange: 16, xDrift: 7  },
  { duration: 10,  delay: 4,   yRange: 10, xDrift: 9  },
]

export default function GrowthPage() {
  const router = useRouter()
  const [milestones, setMilestones] = useState<Milestone[]>(DEMO)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [children, setChildren] = useState<any[]>([])
  const [celebPos, setCelebPos] = useState<{x:number;y:number} | null>(null)

  useEffect(() => {
    supabase.from('children').select('*').then(({ data }) => { if (data?.length) setChildren(data) })
  }, [])

  const filtered = milestones.filter(m => filter === 'all' || m.category === filter)

  const handleBubbleClick = (m: Milestone, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCelebPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    setSelected(m)
    setTimeout(() => setCelebPos(null), 1200)
  }

  return (
    <main style={{
      position: 'fixed', inset: 0,
      width: '100dvw', height: '100dvh',
      overflow: 'hidden',
      fontFamily: "'Noto Serif SC', Georgia, serif",
      background: 'linear-gradient(180deg, #87CEEB 0%, #B8E0A0 35%, #6BAA4A 65%, #4A7A2A 100%)',
    }}>

      {/* ── 天空光晕（清晨感） ── */}
      <motion.div
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: 0, left: '10%',
          width: '80%', height: '45%',
          background: 'radial-gradient(ellipse, rgba(255,240,180,0.5) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── 远景树群（背景层） ── */}
      <svg viewBox="0 0 400 200" style={{ position: 'absolute', top: '28%', left: 0, width: '100%', pointerEvents: 'none', opacity: 0.4 }} preserveAspectRatio="none">
        {[30,80,130,180,240,290,340,380].map((x, i) => (
          <g key={i}>
            <rect x={x-4} y={120+i%3*5} width={8} height={80} fill="#3A5A2A" />
            <ellipse cx={x} cy={100+i%3*5} rx={22+i%3*8} ry={28+i%2*10} fill={i%2===0 ? '#4A7A3A' : '#5A8A4A'} />
          </g>
        ))}
      </svg>

      {/* ── 草地（底部） ── */}
      <svg viewBox="0 0 400 120" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none' }} preserveAspectRatio="none">
        <path d="M0 60 Q50 40 100 55 Q150 70 200 50 Q250 30 300 55 Q350 70 400 50 L400 120 L0 120 Z" fill="#4A7A2A" />
        <path d="M0 80 Q60 65 120 75 Q180 85 240 68 Q300 52 360 72 Q380 78 400 70 L400 120 L0 120 Z" fill="#3A6A1A" />
        {/* 小草 */}
        {[20,50,90,140,200,260,310,360].map((x, i) => (
          <g key={i}>
            <path d={`M${x} 80 Q${x-4} 70 ${x-2} 65`} stroke="#5A9A3A" strokeWidth="1.5" fill="none" />
            <path d={`M${x} 80 Q${x+4} 68 ${x+3} 63`} stroke="#5A9A3A" strokeWidth="1.5" fill="none" />
          </g>
        ))}
      </svg>

      {/* ── 主树（左侧大树） ── */}
      <MainTree side="left" />

      {/* ── 主树（右侧大树） ── */}
      <MainTree side="right" />

      {/* ── 树叶飘落 ── */}
      <FallingLeaves />

      {/* ── 气泡里程碑 ── */}
      {filtered.map((m, i) => {
        const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
        const fp = FLOAT_PARAMS[i % FLOAT_PARAMS.length]
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1, scale: 1,
              y: [0, -fp.yRange, 0],
              x: [0, fp.xDrift, -fp.xDrift/2, 0],
            }}
            transition={{
              opacity: { duration: 0.8, delay: 0.5 + i * 0.2 },
              scale: { duration: 0.8, delay: 0.5 + i * 0.2, type: 'spring', stiffness: 150 },
              y: { duration: fp.duration, repeat: Infinity, delay: fp.delay, ease: 'easeInOut' },
              x: { duration: fp.duration * 1.4, repeat: Infinity, delay: fp.delay + 0.3, ease: 'easeInOut' },
            }}
            onClick={(e) => handleBubbleClick(m, e)}
            style={{
              position: 'absolute',
              left: `${m.x}%`,
              top: `${m.y + 5}%`,
              cursor: 'pointer',
              zIndex: 30,
            }}
          >
            {/* 气泡主体 */}
            <div style={{
              width: '72px', height: '72px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7) 0%, ${cfg.bubble} 60%, rgba(255,255,255,0.15) 100%)`,
              border: '1.5px solid rgba(255,255,255,0.7)',
              boxShadow: `0 4px 20px rgba(0,0,0,0.1), inset 0 -4px 12px rgba(0,0,0,0.05), 0 0 20px ${cfg.glow}40`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(4px)',
            }}>
              {/* 气泡高光 */}
              <div style={{ position: 'absolute', top: '14%', left: '22%', width: '30%', height: '18%', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', transform: 'rotate(-30deg)' }} />
              <div style={{ position: 'absolute', top: '20%', left: '55%', width: '12%', height: '10%', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />

              <span style={{ fontSize: '22px', lineHeight: 1, marginBottom: '2px' }}>{cfg.emoji}</span>
              <span style={{ fontSize: '8px', color: 'rgba(40,60,40,0.8)', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center', padding: '0 4px', lineHeight: 1.2, maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.title.slice(0, 5)}
              </span>

              {/* 奖项脉冲 */}
              {m.category === 'award' && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `2px solid ${cfg.glow}`, pointerEvents: 'none' }}
                />
              )}
            </div>

            {/* 气泡线（悬挂感） */}
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.4)', margin: '0 auto' }} />
          </motion.div>
        )
      })}

      {/* 庆祝金粒子 */}
      <AnimatePresence>
        {celebPos && Array.from({ length: 6 }).map((_, i) => (
          <motion.div key={i}
            initial={{ opacity: 1, scale: 0, x: celebPos.x, y: celebPos.y }}
            animate={{ opacity: 0, scale: 1, x: celebPos.x + (Math.random()-0.5)*80, y: celebPos.y - 40 - Math.random()*40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ position: 'fixed', width: '6px', height: '6px', borderRadius: '50%', background: '#F0C040', pointerEvents: 'none', zIndex: 200 }}
          />
        ))}
      </AnimatePresence>

      {/* ── 树洞入口：根·中文 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        {/* 树洞发光 */}
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: '-12px',
            borderRadius: '50% 50% 46% 46% / 40% 40% 60% 60%',
            background: 'radial-gradient(ellipse, rgba(255,220,100,0.4) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/chinese')}
          style={{
            width: '160px', padding: '16px 20px 14px',
            background: 'radial-gradient(ellipse at 50% 20%, rgba(255,230,160,0.95) 0%, rgba(220,170,80,0.9) 100%)',
            border: '2.5px solid rgba(180,130,40,0.6)',
            borderRadius: '50% 50% 46% 46% / 35% 35% 65% 65%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(180,130,40,0.3), inset 0 2px 8px rgba(255,255,255,0.4)',
          }}
        >
          <span style={{ fontSize: '24px' }}>🌿</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#5A3A0A', letterSpacing: '0.1em' }}>根·中文</span>
          <span style={{ fontSize: '9px', color: 'rgba(90,58,10,0.7)', letterSpacing: '0.15em' }}>学习中心</span>
        </motion.button>
      </motion.div>

      {/* ── 过滤标签 ── */}
      <div style={{
        position: 'absolute', top: 'max(52px, env(safe-area-inset-top, 52px))',
        left: 0, right: 0, zIndex: 50,
        padding: '8px 16px',
        display: 'flex', gap: '7px', overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {[{ key: 'all', emoji: '🌳', label: '全部' }, ...Object.entries(CATEGORY).map(([k, v]) => ({ key: k, emoji: v.emoji, label: v.label }))].map(f => (
          <motion.button key={f.key} whileTap={{ scale: 0.92 }}
            onClick={() => setFilter(f.key)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: '20px',
              background: filter === f.key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
              border: `1.5px solid ${filter === f.key ? 'rgba(100,150,80,0.8)' : 'rgba(255,255,255,0.5)'}`,
              color: filter === f.key ? '#3A5A1A' : 'rgba(30,50,20,0.7)',
              fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: '4px',
              backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
              fontFamily: "'Noto Serif SC', serif",
              fontWeight: filter === f.key ? 600 : 400,
            }}
          >
            <span style={{ fontSize: '12px' }}>{f.emoji}</span>{f.label}
          </motion.button>
        ))}
      </div>

      {/* ── 本周小结 ── */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'absolute',
          bottom: 'calc(14% + 110px)',
          right: '12px',
          zIndex: 40,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '10px 14px',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          minWidth: '80px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '22px', fontWeight: 500, color: '#3A5A1A', margin: 0, lineHeight: 1 }}>
          {milestones.filter(m => { const d = new Date(m.date); return (Date.now()-d.getTime()) < 7*86400000 }).length}
        </p>
        <p style={{ fontSize: '9px', color: 'rgba(40,70,20,0.6)', margin: '3px 0 0', letterSpacing: '0.1em' }}>本周记录</p>
      </motion.div>

      {/* ── 底部导航 ── */}
      <nav style={{
        position: 'fixed',
        bottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
        left: 0, right: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', padding: '0 16px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            width: '100%', maxWidth: '380px', height: '60px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '30px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-around', padding: '0 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {[
            { label: '基地', path: '/' },
            { label: '日安', path: '/rian' },
            { label: '根', path: '/growth' },
            { label: '树洞', path: '/treehouse' },
          ].map(item => (
            <button key={item.label}
              onClick={() => router.push(item.path)}
              style={{
                background: item.path === '/growth' ? 'rgba(255,255,255,0.5)' : 'none',
                border: 'none', cursor: 'pointer',
                padding: '6px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: item.path === '/growth' ? 700 : 500,
                color: item.path === '/growth' ? '#3A5A1A' : 'rgba(30,50,20,0.65)',
                letterSpacing: '0.2em',
                fontFamily: "'Noto Serif SC', serif",
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      </nav>

      {/* ── 里程碑详情卡片 ── */}
      <AnimatePresence>
        {selected && <MilestoneCard milestone={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  )
}

// ── 主树组件 ──
function MainTree({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  return (
    <motion.div
      animate={{ rotate: isLeft ? [0, 0.8, 0, -0.5, 0] : [0, -0.8, 0, 0.5, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: isLeft ? 0 : 2 }}
      style={{
        position: 'absolute',
        bottom: '8%',
        [isLeft ? 'left' : 'right']: '-5%',
        width: '55%',
        height: '80%',
        transformOrigin: 'bottom center',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <svg viewBox="0 0 220 480" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMax meet">
        {/* 树干 */}
        <path
          d={isLeft
            ? "M 100 480 C 100 480 105 380 102 320 C 100 270 105 240 102 200 C 98 160 102 130 100 80"
            : "M 120 480 C 120 480 115 380 118 320 C 120 270 115 240 118 200 C 122 160 118 130 120 80"
          }
          stroke="#6B4A1A" strokeWidth="22" fill="none" strokeLinecap="round"
        />
        <path
          d={isLeft
            ? "M 100 480 C 100 480 105 380 102 320 C 100 270 105 240 102 200 C 98 160 102 130 100 80"
            : "M 120 480 C 120 480 115 380 118 320 C 120 270 115 240 118 200 C 122 160 118 130 120 80"
          }
          stroke="#4A3010" strokeWidth="8" fill="none" strokeLinecap="round" opacity={0.4}
        />

        {/* 树枝 */}
        {(isLeft ? [
          { d: "M 102 320 C 130 300 165 285 185 265", w: 10 },
          { d: "M 102 320 C 75 305 45 295 25 280", w: 8 },
          { d: "M 100 240 C 135 220 168 208 190 190", w: 9 },
          { d: "M 100 240 C 68 225 38 215 18 200", w: 7 },
          { d: "M 100 170 C 128 148 158 138 178 120", w: 8 },
          { d: "M 100 170 C 72 150 45 140 25 125", w: 6 },
        ] : [
          { d: "M 118 320 C 90 300 55 285 35 265", w: 10 },
          { d: "M 118 320 C 145 305 175 295 195 280", w: 8 },
          { d: "M 120 240 C 85 220 52 208 30 190", w: 9 },
          { d: "M 120 240 C 152 225 182 215 202 200", w: 7 },
          { d: "M 120 170 C 92 148 62 138 42 120", w: 8 },
          { d: "M 120 170 C 148 150 175 140 195 125", w: 6 },
        ]).map((b, i) => (
          <path key={i} d={b.d} stroke="#6B4A1A" strokeWidth={b.w} fill="none" strokeLinecap="round" />
        ))}

        {/* 树冠叶簇 */}
        {(isLeft ? [
          { cx: 100, cy: 65, rx: 55, ry: 48 },
          { cx: 60,  cy: 90, rx: 38, ry: 32 },
          { cx: 140, cy: 85, rx: 42, ry: 36 },
          { cx: 75,  cy: 55, rx: 30, ry: 26 },
          { cx: 125, cy: 52, rx: 28, ry: 24 },
          { cx: 100, cy: 38, rx: 32, ry: 28 },
        ] : [
          { cx: 120, cy: 65, rx: 55, ry: 48 },
          { cx: 80,  cy: 90, rx: 38, ry: 32 },
          { cx: 160, cy: 85, rx: 42, ry: 36 },
          { cx: 95,  cy: 55, rx: 28, ry: 24 },
          { cx: 145, cy: 52, rx: 30, ry: 26 },
          { cx: 120, cy: 38, rx: 32, ry: 28 },
        ]).map((l, i) => (
          <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry}
            fill={i % 3 === 0 ? '#3A7A2A' : i % 3 === 1 ? '#4A8A3A' : '#5A9A4A'}
            opacity={0.88}
          />
        ))}

        {/* 树根 */}
        {(isLeft ? [
          { d: "M 100 470 C 80 465 55 475 35 470" },
          { d: "M 100 470 C 115 460 140 468 160 462" },
          { d: "M 100 470 C 95 480 75 485 55 482" },
        ] : [
          { d: "M 120 470 C 140 465 165 475 185 470" },
          { d: "M 120 470 C 105 460 80 468 60 462" },
          { d: "M 120 470 C 125 480 145 485 165 482" },
        ]).map((r, i) => (
          <path key={i} d={r.d} stroke="#4A3010" strokeWidth={5 - i} fill="none" strokeLinecap="round" opacity={0.6} />
        ))}
      </svg>
    </motion.div>
  )
}

// ── 飘落树叶 ──
function FallingLeaves() {
  const leaves = [
    { id:0, startX: 15, duration: 10, delay: 0,   size: 14, rotate: 20  },
    { id:1, startX: 45, duration: 13, delay: 2.5, size: 10, rotate: -30 },
    { id:2, startX: 70, duration: 9,  delay: 5,   size: 12, rotate: 45  },
    { id:3, startX: 30, duration: 12, delay: 1.5, size: 9,  rotate: -15 },
    { id:4, startX: 80, duration: 11, delay: 7,   size: 11, rotate: 35  },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 25 }}>
      {leaves.map(l => (
        <motion.div key={l.id}
          initial={{ y: '-5vh', x: `${l.startX}vw`, opacity: 0.7, rotate: l.rotate }}
          animate={{
            y: '105vh',
            x: [`${l.startX}vw`, `${l.startX + 8}vw`, `${l.startX + 3}vw`, `${l.startX + 12}vw`],
            opacity: [0.7, 0.5, 0.3, 0],
            rotate: [l.rotate, l.rotate + 90, l.rotate + 180, l.rotate + 270],
          }}
          transition={{ duration: l.duration, delay: l.delay, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', fontSize: `${l.size}px` }}
        >
          🍃
        </motion.div>
      ))}
    </div>
  )
}

// ── 里程碑记忆卡片 ──
function MilestoneCard({ milestone: m, onClose }: { milestone: Milestone; onClose: () => void }) {
  const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 12px max(20px, env(safe-area-inset-bottom, 20px))', background: 'rgba(20,40,20,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', background: 'rgba(253,248,238,0.97)', borderRadius: '24px 24px 20px 20px', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
      >
        {/* 顶部色条 */}
        <div style={{ height: '5px', background: `linear-gradient(90deg, ${cfg.glow}, ${cfg.bubble})` }} />

        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: `${cfg.glow}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {cfg.emoji}
              </div>
              <div>
                <p style={{ fontSize: '10px', color: '#8A7A5A', letterSpacing: '0.2em', margin: '0 0 2px', textTransform: 'uppercase' }}>{cfg.label}</p>
                <p style={{ fontSize: '11px', color: '#8A7A5A', margin: 0 }}>{m.child_name} · {m.date}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8A7A5A', cursor: 'pointer', fontSize: '20px', opacity: 0.5, padding: '2px 6px' }}>×</button>
          </div>

          <h2 style={{ fontSize: '21px', fontWeight: 500, color: '#3A2E1A', margin: '0 0 12px', lineHeight: 1.4, letterSpacing: '0.05em' }}>{m.title}</h2>

          {m.photo_url ? (
            <div style={{ width: '100%', height: '150px', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
              <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '80px', borderRadius: '14px', marginBottom: '12px', background: `${cfg.glow}12`, border: `1px dashed ${cfg.glow}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', opacity: 0.35 }}>{cfg.emoji}</span>
            </div>
          )}

          {m.note && (
            <div style={{ background: 'rgba(232,213,184,0.3)', borderRadius: '12px', padding: '11px 14px', marginBottom: '14px', borderLeft: `3px solid ${cfg.glow}` }}>
              <p style={{ fontSize: '14px', color: '#6A5A3A', lineHeight: 1.8, margin: 0, fontStyle: 'italic', letterSpacing: '0.04em' }}>"{m.note}"</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ flex: 1, padding: '11px', borderRadius: '14px', background: `${cfg.glow}18`, border: `1px solid ${cfg.glow}35`, fontSize: '12px', color: '#3A2E1A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: "'Noto Serif SC', serif" }}>
              <Play size={13} /> 语音回忆
            </button>
            <button style={{ flex: 1, padding: '11px', borderRadius: '14px', background: 'transparent', border: '1px solid rgba(139,105,20,0.2)', fontSize: '12px', color: '#3A2E1A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: "'Noto Serif SC', serif" }}>
              <Share2 size={13} /> 分享记忆
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
