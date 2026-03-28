'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Share2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const CATEGORY = {
  chinese:  { emoji: '📖', label: '中文学习', glow: '#7BC47B', bubble: 'rgba(180,230,180,0.45)' },
  academic: { emoji: '🏆', label: '学业成绩', glow: '#F0C040', bubble: 'rgba(255,220,100,0.45)' },
  hobby:    { emoji: '🎨', label: '兴趣爱好', glow: '#C87BC8', bubble: 'rgba(220,180,220,0.45)' },
  award:    { emoji: '🌟', label: '比赛获奖', glow: '#F5A020', bubble: 'rgba(255,200,80,0.5)'  },
  travel:   { emoji: '✈️', label: '旅行回忆', glow: '#60A8E0', bubble: 'rgba(160,210,250,0.45)' },
  family:   { emoji: '🏠', label: '家庭时光', glow: '#D4845A', bubble: 'rgba(240,190,150,0.45)' },
}

type Milestone = {
  id: string; child_name: string; category: string
  title: string; date: string; note?: string; photo_url?: string
}

// 气泡挂点：严格按图，挂在树枝末端，用SVG坐标百分比
// 左树枝挂点（左侧大树）
const LEFT_HANG = [
  { x: 8,  y: 14 }, // 最左最高
  { x: 5,  y: 26 }, // 左中上
  { x: 3,  y: 40 }, // 左中
  { x: 6,  y: 52 }, // 左下
  { x: 18, y: 20 }, // 中左上
  { x: 16, y: 34 }, // 中左
]
// 右树枝挂点（右侧树）
const RIGHT_HANG = [
  { x: 88, y: 10 }, // 右顶
  { x: 92, y: 20 }, // 右上
  { x: 86, y: 30 }, // 右中上
  { x: 94, y: 38 }, // 右中
]
// 中间飘浮气泡（空中散落的小气泡）
const MID_FLOAT = [
  { x: 42, y: 28 }, { x: 55, y: 18 }, { x: 62, y: 32 },
  { x: 48, y: 42 }, { x: 70, y: 24 },
]

const DEMO: Milestone[] = [
  { id:'1', child_name:'William', category:'chinese',  title:'认识100个汉字', date:'2024-09-15', note:'今天考了满分，他超级开心' },
  { id:'2', child_name:'William', category:'award',    title:'游泳比赛亚军',  date:'2024-10-20', note:'练了三个月，终于有了成果' },
  { id:'3', child_name:'Noah',    category:'family',   title:'第一句完整话',  date:'2024-11-05', note:'说了"妈妈我爱你"，我哭了' },
  { id:'4', child_name:'William', category:'travel',   title:'素帖山之旅',    date:'2025-01-10', note:'第一次看到满天星星' },
  { id:'5', child_name:'William', category:'chinese',  title:'开始写日记了',  date:'2025-02-18', note:'写了五行，字歪歪但认真' },
  { id:'6', child_name:'Noah',    category:'hobby',    title:'爱上画画',      date:'2025-03-01', note:'每天都要画一幅给我' },
  { id:'7', child_name:'William', category:'academic', title:'数学竞赛优秀',  date:'2025-03-15', note:'第一次参加竞赛' },
]

const FLOAT_PARAMS = [
  { dur:7,   delay:0,   y:14, x:5  },
  { dur:9,   delay:1.8, y:10, x:7  },
  { dur:6.5, delay:3.2, y:16, x:4  },
  { dur:8.5, delay:0.6, y:12, x:8  },
  { dur:7.5, delay:2.5, y:18, x:6  },
  { dur:10,  delay:4.2, y:8,  x:9  },
  { dur:8,   delay:1.2, y:13, x:5  },
  { dur:6.8, delay:3.8, y:11, x:7  },
  { dur:9.5, delay:2.0, y:15, x:4  },
  { dur:7.2, delay:0.4, y:9,  x:6  },
  { dur:8.8, delay:5.0, y:12, x:5  },
]

export default function GrowthPage() {
  const router = useRouter()
  const [milestones] = useState<Milestone[]>(DEMO)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [filter, setFilter] = useState('all')
  const [celebPos, setCelebPos] = useState<{x:number;y:number}|null>(null)

  const filtered = milestones.filter(m => filter === 'all' || m.category === filter)

  // 分配气泡挂点
  const allHangPoints = [...LEFT_HANG, ...RIGHT_HANG]
  const assignedBubbles = filtered.slice(0, allHangPoints.length).map((m, i) => ({
    milestone: m,
    hang: allHangPoints[i],
    fp: FLOAT_PARAMS[i % FLOAT_PARAMS.length],
  }))
  // 多余的里程碑作为中间飘浮小气泡
  const floatBubbles = filtered.slice(allHangPoints.length, allHangPoints.length + MID_FLOAT.length).map((m, i) => ({
    milestone: m,
    pos: MID_FLOAT[i],
    fp: FLOAT_PARAMS[(i + 4) % FLOAT_PARAMS.length],
  }))

  const handleClick = (m: Milestone, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCelebPos({ x: rect.left + rect.width/2, y: rect.top })
    setSelected(m)
    setTimeout(() => setCelebPos(null), 1200)
  }

  return (
    <main style={{
      position: 'fixed', inset: 0,
      width: '100dvw', height: '100dvh',
      overflow: 'hidden',
      fontFamily: "'Noto Serif SC', Georgia, serif",
    }}>

      {/* ══ 背景分层 ══ */}
      {/* 天空 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #87CEEB 0%, #A8D8EA 25%, #C8E8B0 50%, #8BC870 70%, #5A9040 85%, #3A6A20 100%)',
      }} />

      {/* 天空光晕（清晨暖光） */}
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '15%', left: '20%',
          width: '60%', height: '40%',
          background: 'radial-gradient(ellipse, rgba(255,240,160,0.55) 0%, rgba(255,220,100,0.2) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* 远景山丘 */}
      <svg viewBox="0 0 400 120" style={{ position: 'absolute', top: '40%', left: 0, width: '100%', pointerEvents: 'none', opacity: 0.5 }} preserveAspectRatio="none">
        <path d="M0 80 Q60 40 120 60 Q180 80 240 45 Q300 20 360 55 Q380 65 400 50 L400 120 L0 120Z" fill="#5A8A40" />
        <path d="M0 95 Q80 70 160 85 Q240 100 320 75 Q360 65 400 80 L400 120 L0 120Z" fill="#4A7A30" />
      </svg>

      {/* 远景废墟石柱 */}
      <svg viewBox="0 0 400 200" style={{ position: 'absolute', top: '30%', left: 0, width: '100%', pointerEvents: 'none', opacity: 0.35 }} preserveAspectRatio="none">
        {/* 左侧石柱 */}
        <rect x="145" y="60" width="12" height="80" rx="2" fill="#8A9A7A" />
        <rect x="142" y="58" width="18" height="8" rx="1" fill="#9AAA8A" />
        <rect x="148" y="80" width="6" height="3" fill="#7A8A6A" opacity={0.6} />
        {/* 右侧石柱组 */}
        <rect x="238" y="70" width="10" height="70" rx="2" fill="#8A9A7A" />
        <rect x="235" y="68" width="16" height="7" rx="1" fill="#9AAA8A" />
        <rect x="252" y="75" width="8" height="65" rx="2" fill="#8A9A7A" opacity={0.8} />
        <rect x="249" y="73" width="14" height="7" rx="1" fill="#9AAA8A" opacity={0.8} />
      </svg>

      {/* 草地层 */}
      <svg viewBox="0 0 400 160" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none' }} preserveAspectRatio="none">
        <path d="M0 60 Q30 45 70 55 Q110 65 150 48 Q190 32 230 50 Q270 68 310 52 Q350 38 400 48 L400 160 L0 160Z" fill="#5A9038" />
        <path d="M0 85 Q50 70 100 80 Q160 92 220 72 Q280 54 340 76 Q370 84 400 72 L400 160 L0 160Z" fill="#4A7A28" />
        <path d="M0 105 Q60 95 130 100 Q200 107 270 95 Q330 86 400 98 L400 160 L0 160Z" fill="#3A6A18" />
        {/* 灌木丛 */}
        <ellipse cx="40"  cy="100" rx="28" ry="18" fill="#4A8030" opacity={0.8} />
        <ellipse cx="80"  cy="108" rx="20" ry="14" fill="#3A7020" opacity={0.7} />
        <ellipse cx="320" cy="102" rx="24" ry="16" fill="#4A8030" opacity={0.8} />
        <ellipse cx="360" cy="110" rx="18" ry="12" fill="#3A7020" opacity={0.7} />
        {/* 小花点缀 */}
        {[100,140,200,260,290].map((x,i) => (
          <g key={i}>
            <circle cx={x} cy={100+i%3*4} r="2.5" fill={['#FFE0A0','#FFB0B0','#B0E0FF'][i%3]} opacity={0.7} />
          </g>
        ))}
      </svg>

      {/* ══ 左侧大树（主树，占画面左半） ══ */}
      <motion.div
        animate={{ rotate: [0, 0.6, 0, -0.4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', left: '-8%', bottom: '8%', width: '58%', height: '88%', transformOrigin: 'bottom center', pointerEvents: 'none', zIndex: 10 }}
      >
        <svg viewBox="0 0 260 520" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMax meet">
          {/* 树干 */}
          <path d="M 120 520 C 118 460 122 400 118 340 C 115 290 120 260 116 210 C 112 165 118 130 115 80" stroke="#7B5220" strokeWidth="26" fill="none" strokeLinecap="round" />
          <path d="M 120 520 C 118 460 122 400 118 340 C 115 290 120 260 116 210 C 112 165 118 130 115 80" stroke="#5A3A10" strokeWidth="10" fill="none" strokeLinecap="round" opacity={0.35} />
          {/* 树皮纹理 */}
          <path d="M 115 400 C 112 380 118 360 114 340" stroke="#5A3A10" strokeWidth="3" fill="none" opacity={0.2} />
          <path d="M 122 300 C 119 280 124 260 120 240" stroke="#5A3A10" strokeWidth="3" fill="none" opacity={0.2} />

          {/* 主枝干（向右伸展覆盖中间天空） */}
          <path d="M 118 340 C 148 318 185 305 215 288" stroke="#7B5220" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M 116 280 C 148 258 182 245 210 228" stroke="#7B5220" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d="M 116 220 C 145 198 178 185 205 168" stroke="#7B5220" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 115 165 C 140 142 168 128 192 112" stroke="#7B5220" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 115 120 C 135 98 158 85 178 68" stroke="#7B5220" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* 向左枝 */}
          <path d="M 118 340 C 90 322 62 312 40 300" stroke="#7B5220" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 116 270 C 88 255 55 248 28 238" stroke="#7B5220" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 115 200 C 88 185 58 178 30 168" stroke="#7B5220" strokeWidth="7" fill="none" strokeLinecap="round" />

          {/* 树冠叶簇 */}
          {[
            {cx:115,cy:65,rx:62,ry:52,c:'#3A7A2A'},
            {cx:68, cy:88,rx:45,ry:38,c:'#4A8A3A'},
            {cx:162,cy:82,rx:48,ry:40,c:'#3A7A2A'},
            {cx:85, cy:55,rx:36,ry:30,c:'#5A9A4A'},
            {cx:145,cy:52,rx:38,ry:32,c:'#4A8A3A'},
            {cx:112,cy:38,rx:40,ry:34,c:'#3A7A2A'},
            {cx:42, cy:110,rx:32,ry:26,c:'#4A8A3A'},
            {cx:188,cy:105,rx:35,ry:28,c:'#3A7A2A'},
            {cx:115,cy:25,rx:30,ry:26,c:'#5A9A4A'},
          ].map((l,i) => (
            <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.c} opacity={0.9} />
          ))}

          {/* 树根 */}
          <path d="M 118 510 C 95 505 68 515 45 508" stroke="#5A3A10" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M 118 510 C 138 502 162 512 182 505" stroke="#5A3A10" strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M 118 510 C 108 520 88 528 68 524" stroke="#5A3A10" strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.5} />
          <path d="M 118 510 C 128 518 148 524 165 520" stroke="#5A3A10" strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.5} />

          {/* 树洞（右下角，主角入口） */}
          <ellipse cx="168" cy="478" rx="28" ry="22" fill="#3A2010" opacity={0.8} />
          <ellipse cx="168" cy="478" rx="24" ry="18" fill="#2A1808" />
          {/* 树洞发光 */}
          <motion.ellipse
            cx="168" cy="478" rx="22" ry="16"
            fill="url(#hollowGlow)"
            animate={{ opacity: [0.6, 1, 0.6] } as any}
          />
          {/* 小灯笼 */}
          <rect x="160" y="488" width="6" height="8" rx="1" fill="#F0A020" opacity={0.8} />
          <line x1="163" y1="486" x2="163" y2="488" stroke="#8B6914" strokeWidth="1" />
          {/* 藤蔓 */}
          <path d="M 142 468 C 148 462 155 465 152 472" stroke="#3A6A1A" strokeWidth="2" fill="none" />
          <path d="M 152 472 C 155 478 150 482 145 480" stroke="#3A6A1A" strokeWidth="2" fill="none" />
          <circle cx="142" cy="467" r="3" fill="#4A8A2A" opacity={0.8} />
          <circle cx="153" cy="473" r="2.5" fill="#4A8A2A" opacity={0.8} />

          <defs>
            <radialGradient id="hollowGlow" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#FFD060" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#FF8020" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8B4010" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </motion.div>

      {/* ══ 右侧小树 ══ */}
      <motion.div
        animate={{ rotate: [0, -0.7, 0, 0.5, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        style={{ position: 'absolute', right: '-4%', bottom: '8%', width: '45%', height: '75%', transformOrigin: 'bottom center', pointerEvents: 'none', zIndex: 10 }}
      >
        <svg viewBox="0 0 200 440" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMax meet">
          {/* 树干 */}
          <path d="M 100 440 C 98 380 102 320 98 265 C 94 215 100 180 98 130 C 95 90 100 65 98 30" stroke="#7B5220" strokeWidth="20" fill="none" strokeLinecap="round" />
          <path d="M 100 440 C 98 380 102 320 98 265 C 94 215 100 180 98 130 C 95 90 100 65 98 30" stroke="#5A3A10" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.3} />

          {/* 枝干（向左伸向中间） */}
          <path d="M 98 265 C 72 245 45 232 22 218" stroke="#7B5220" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 98 200 C 70 180 42 168 18 155" stroke="#7B5220" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 98 145 C 72 125 45 112 20 100" stroke="#7B5220" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 98 95 C 72 75 48 62 25 50" stroke="#7B5220" strokeWidth="7" fill="none" strokeLinecap="round" />
          {/* 向右枝 */}
          <path d="M 98 230 C 120 212 148 200 168 188" stroke="#7B5220" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 98 170 C 118 152 142 140 162 128" stroke="#7B5220" strokeWidth="7" fill="none" strokeLinecap="round" />

          {/* 树冠 */}
          {[
            {cx:98, cy:22, rx:52,ry:44,c:'#3A7A2A'},
            {cx:58, cy:45, rx:38,ry:32,c:'#4A8A3A'},
            {cx:138,cy:42, rx:40,ry:34,c:'#3A7A2A'},
            {cx:78, cy:15, rx:30,ry:26,c:'#5A9A4A'},
            {cx:118,cy:12, rx:32,ry:28,c:'#4A8A3A'},
            {cx:98, cy:5,  rx:28,ry:24,c:'#3A7A2A'},
          ].map((l,i) => (
            <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.c} opacity={0.9} />
          ))}

          {/* 树根 */}
          <path d="M 98 430 C 78 424 55 432 35 426" stroke="#5A3A10" strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.6} />
          <path d="M 98 430 C 116 422 138 430 155 424" stroke="#5A3A10" strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.6} />
        </svg>
      </motion.div>

      {/* ══ 气泡里程碑（挂在树枝上） ══ */}
      {assignedBubbles.map(({ milestone: m, hang, fp }, i) => {
        const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
        const isLarge = hang.x < 20 || hang.x > 80 // 靠近树的气泡更大
        const size = isLarge ? 64 : 54
        return (
          <motion.div key={m.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1, scale: 1,
              y: [0, -fp.y, 0],
              x: [0, fp.x * (hang.x < 50 ? -1 : 1), 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: 0.3 + i * 0.15 },
              scale: { duration: 0.6, delay: 0.3 + i * 0.15, type: 'spring', stiffness: 160 },
              y: { duration: fp.dur, repeat: Infinity, delay: fp.delay, ease: 'easeInOut' },
              x: { duration: fp.dur * 1.3, repeat: Infinity, delay: fp.delay + 0.4, ease: 'easeInOut' },
            }}
            onClick={(e) => handleClick(m, e)}
            style={{
              position: 'absolute',
              left: `${hang.x}%`,
              top: `${hang.y}%`,
              cursor: 'pointer',
              zIndex: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            {/* 悬挂细线 */}
            <div style={{ width: '1px', height: '20px', background: 'rgba(200,180,140,0.5)', marginBottom: '-1px' }} />
            {/* 气泡 */}
            <div style={{
              width: `${size}px`, height: `${size}px`, borderRadius: '50%',
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75) 0%, ${cfg.bubble} 55%, rgba(255,255,255,0.1) 100%)`,
              border: '1.5px solid rgba(255,255,255,0.75)',
              boxShadow: `0 4px 18px rgba(0,0,0,0.1), inset 0 -3px 10px rgba(0,0,0,0.04), 0 0 18px ${cfg.glow}35`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', backdropFilter: 'blur(3px)',
            }}>
              {/* 高光 */}
              <div style={{ position:'absolute', top:'14%', left:'20%', width:'32%', height:'18%', borderRadius:'50%', background:'rgba(255,255,255,0.65)', transform:'rotate(-30deg)' }} />
              <div style={{ position:'absolute', top:'22%', left:'58%', width:'12%', height:'10%', borderRadius:'50%', background:'rgba(255,255,255,0.4)' }} />
              <span style={{ fontSize: isLarge ? '20px' : '16px', lineHeight:1, marginBottom:'1px' }}>{cfg.emoji}</span>
              <span style={{ fontSize:'7px', color:'rgba(30,50,20,0.75)', fontWeight:600, letterSpacing:'0.04em', textAlign:'center', padding:'0 3px', lineHeight:1.2, maxWidth:`${size-8}px`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {m.title.slice(0,4)}
              </span>
              {m.category === 'award' && (
                <motion.div animate={{ scale:[1,1.6,1], opacity:[0.5,0,0.5] }} transition={{ duration:2.2, repeat:Infinity }}
                  style={{ position:'absolute', inset:-5, borderRadius:'50%', border:`2px solid ${cfg.glow}`, pointerEvents:'none' }} />
              )}
            </div>
          </motion.div>
        )
      })}

      {/* 中间小飘浮气泡（更透明更小） */}
      {floatBubbles.map(({ milestone: m, pos, fp }, i) => {
        const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
        return (
          <motion.div key={`float-${m.id}`}
            animate={{ y:[0,-fp.y*0.7,0], x:[0,fp.x*0.5,0], opacity:[0.5,0.75,0.5] }}
            transition={{ duration: fp.dur*1.2, repeat:Infinity, delay:fp.delay+0.6, ease:'easeInOut' }}
            onClick={(e) => handleClick(m, e)}
            style={{ position:'absolute', left:`${pos.x}%`, top:`${pos.y}%`, cursor:'pointer', zIndex:28 }}
          >
            <div style={{
              width:'38px', height:'38px', borderRadius:'50%',
              background:`radial-gradient(circle at 35% 30%, rgba(255,255,255,0.65) 0%, ${cfg.bubble} 60%, rgba(255,255,255,0.05) 100%)`,
              border:'1px solid rgba(255,255,255,0.65)',
              boxShadow:`0 2px 12px rgba(0,0,0,0.07), 0 0 12px ${cfg.glow}25`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <span style={{ fontSize:'14px' }}>{cfg.emoji}</span>
            </div>
          </motion.div>
        )
      })}

      {/* 庆祝粒子 */}
      <AnimatePresence>
        {celebPos && Array.from({length:6}).map((_,i) => (
          <motion.div key={i}
            initial={{ opacity:1, scale:0, x:celebPos.x, y:celebPos.y }}
            animate={{ opacity:0, scale:1.2, x:celebPos.x+(Math.random()-0.5)*70, y:celebPos.y-50-Math.random()*30 }}
            exit={{ opacity:0 }}
            transition={{ duration:0.9, ease:'easeOut' }}
            style={{ position:'fixed', width:'6px', height:'6px', borderRadius:'50%', background:'#F0C040', pointerEvents:'none', zIndex:200 }}
          />
        ))}
      </AnimatePresence>

      {/* ══ 树洞入口按钮（右下角，覆盖在SVG树洞上） ══ */}
      <motion.button
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        transition={{ delay:1.5 }}
        whileHover={{ scale:1.08 }}
        whileTap={{ scale:0.94 }}
        onClick={() => router.push('/chinese')}
        style={{
          position: 'absolute',
          right: '12%',
          bottom: '13%',
          zIndex: 50,
          width: '72px', height: '58px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2px',
        }}
      >
        <motion.div
          animate={{ opacity:[0.4,0.9,0.4] }}
          transition={{ duration:2.5, repeat:Infinity }}
          style={{ fontSize:'11px', fontWeight:700, color:'#FFE080', letterSpacing:'0.08em', textShadow:'0 0 8px rgba(255,180,0,0.8)', lineHeight:1.3, textAlign:'center' }}
        >
          根·中文
        </motion.div>
        <div style={{ fontSize:'9px', color:'rgba(255,220,120,0.7)', letterSpacing:'0.12em' }}>进入</div>
      </motion.button>

      {/* ══ 飘落树叶 ══ */}
      <FallingLeaves />

      {/* ══ 过滤标签（顶部） ══ */}
      <div style={{
        position: 'absolute',
        top: 'max(48px, env(safe-area-inset-top, 48px))',
        left: 0, right: 0, zIndex: 60,
        padding: '6px 12px',
        display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {[{key:'all',emoji:'🌳',label:'全部'}, ...Object.entries(CATEGORY).map(([k,v])=>({key:k,emoji:v.emoji,label:v.label}))].map(f => (
          <motion.button key={f.key} whileTap={{ scale:0.9 }}
            onClick={() => setFilter(f.key)}
            style={{
              flexShrink:0, padding:'4px 11px', borderRadius:'18px',
              background: filter===f.key ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
              border: `1.5px solid ${filter===f.key ? 'rgba(80,130,60,0.8)' : 'rgba(255,255,255,0.5)'}`,
              color: filter===f.key ? '#2A4A10' : 'rgba(20,40,10,0.7)',
              fontSize:'10px', cursor:'pointer', letterSpacing:'0.06em',
              display:'flex', alignItems:'center', gap:'3px',
              backdropFilter:'blur(8px)', whiteSpace:'nowrap',
              fontFamily:"'Noto Serif SC', serif",
              fontWeight: filter===f.key ? 700 : 400,
            }}
          >
            <span style={{fontSize:'11px'}}>{f.emoji}</span>{f.label}
          </motion.button>
        ))}
      </div>

      {/* ══ 本周小结（右上） ══ */}
      <motion.div
        initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:1.8 }}
        style={{
          position:'absolute', top:'max(90px, calc(env(safe-area-inset-top, 48px) + 48px))',
          right:'10px', zIndex:60,
          background:'rgba(255,255,255,0.5)', backdropFilter:'blur(10px)',
          borderRadius:'14px', padding:'8px 12px',
          border:'1px solid rgba(255,255,255,0.7)',
          boxShadow:'0 3px 12px rgba(0,0,0,0.08)',
          textAlign:'center', minWidth:'68px',
        }}
      >
        <p style={{ fontSize:'20px', fontWeight:500, color:'#2A5010', margin:0, lineHeight:1 }}>
          {milestones.filter(m=>(Date.now()-new Date(m.date).getTime())<7*86400000).length}
        </p>
        <p style={{ fontSize:'8px', color:'rgba(30,60,10,0.6)', margin:'2px 0 0', letterSpacing:'0.1em' }}>本周记录</p>
      </motion.div>

      {/* ══ 底部导航 ══ */}
      <nav style={{
        position: 'fixed',
        bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        left:0, right:0, zIndex:70,
        display:'flex', justifyContent:'center', padding:'0 16px',
      }}>
        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6 }}
          style={{
            width:'100%', maxWidth:'380px', height:'56px',
            background:'rgba(255,255,255,0.18)',
            backdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.45)',
            borderRadius:'28px',
            display:'flex', alignItems:'center', justifyContent:'space-around',
            padding:'0 8px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {[
            {label:'基地', path:'/'},
            {label:'日安', path:'/rian'},
            {label:'根',   path:'/growth'},
            {label:'树洞', path:'/treehouse'},
          ].map(item => (
            <button key={item.label} onClick={() => router.push(item.path)}
              style={{
                background: item.path==='/growth' ? 'rgba(255,255,255,0.55)' : 'none',
                border:'none', cursor:'pointer',
                padding:'5px 12px', borderRadius:'18px',
                fontSize:'12px', fontWeight: item.path==='/growth' ? 700 : 500,
                color: item.path==='/growth' ? '#2A5010' : 'rgba(20,40,10,0.6)',
                letterSpacing:'0.18em',
                fontFamily:"'Noto Serif SC', serif",
                transition:'all 0.2s',
              }}
            >{item.label}</button>
          ))}
        </motion.div>
      </nav>

      {/* ══ 里程碑详情卡片 ══ */}
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

// ── 飘落树叶 ──
function FallingLeaves() {
  const leaves = [
    {id:0, sx:25, dur:11, delay:0,   size:13, r:25 },
    {id:1, sx:60, dur:14, delay:3,   size:10, r:-40},
    {id:2, sx:40, dur:9,  delay:6,   size:11, r:35 },
    {id:3, sx:75, dur:13, delay:1.5, size:9,  r:-20},
    {id:4, sx:15, dur:12, delay:8,   size:12, r:50 },
    {id:5, sx:85, dur:10, delay:4.5, size:8,  r:-35},
  ]
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:35 }}>
      {leaves.map(l => (
        <motion.div key={l.id}
          initial={{ y:'-4vh', x:`${l.sx}vw`, opacity:0.65, rotate:l.r }}
          animate={{
            y:'108vh',
            x:[`${l.sx}vw`,`${l.sx+6}vw`,`${l.sx+2}vw`,`${l.sx+9}vw`],
            opacity:[0.65, 0.5, 0.35, 0],
            rotate:[l.r, l.r+80, l.r+160, l.r+240],
          }}
          transition={{ duration:l.dur, delay:l.delay, repeat:Infinity, ease:'linear' }}
          style={{ position:'absolute', fontSize:`${l.size}px` }}
        >🍃</motion.div>
      ))}
    </div>
  )
}

// ── 里程碑卡片 ──
function MilestoneCard({ milestone:m, onClose }: { milestone:Milestone; onClose:()=>void }) {
  const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:`0 12px max(20px, env(safe-area-inset-bottom, 20px))`, background:'rgba(10,30,10,0.5)', backdropFilter:'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y:100, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:100, opacity:0 }}
        transition={{ type:'spring', stiffness:280, damping:28 }}
        onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:'420px', background:'rgba(253,248,238,0.97)', borderRadius:'24px 24px 20px 20px', overflow:'hidden', boxShadow:'0 -8px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ height:'5px', background:`linear-gradient(90deg, ${cfg.glow}, ${cfg.bubble})` }} />
        <div style={{ padding:'18px 18px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:`${cfg.glow}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{cfg.emoji}</div>
              <div>
                <p style={{ fontSize:'9px', color:'#8A7A5A', letterSpacing:'0.2em', margin:'0 0 2px', textTransform:'uppercase' }}>{cfg.label}</p>
                <p style={{ fontSize:'10px', color:'#8A7A5A', margin:0 }}>{m.child_name} · {m.date}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#8A7A5A', cursor:'pointer', fontSize:'20px', opacity:0.5, padding:'2px 6px' }}>×</button>
          </div>
          <h2 style={{ fontSize:'20px', fontWeight:500, color:'#3A2E1A', margin:'0 0 10px', lineHeight:1.4, letterSpacing:'0.05em' }}>{m.title}</h2>
          {m.photo_url ? (
            <div style={{ width:'100%', height:'140px', borderRadius:'12px', overflow:'hidden', marginBottom:'10px' }}>
              <img src={m.photo_url} alt={m.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          ) : (
            <div style={{ width:'100%', height:'72px', borderRadius:'12px', marginBottom:'10px', background:`${cfg.glow}10`, border:`1px dashed ${cfg.glow}38`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:'26px', opacity:0.3 }}>{cfg.emoji}</span>
            </div>
          )}
          {m.note && (
            <div style={{ background:'rgba(232,213,184,0.28)', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', borderLeft:`3px solid ${cfg.glow}` }}>
              <p style={{ fontSize:'13px', color:'#6A5A3A', lineHeight:1.8, margin:0, fontStyle:'italic', letterSpacing:'0.04em' }}>"{m.note}"</p>
            </div>
          )}
          <div style={{ display:'flex', gap:'10px' }}>
            <button style={{ flex:1, padding:'10px', borderRadius:'12px', background:`${cfg.glow}16`, border:`1px solid ${cfg.glow}32`, fontSize:'12px', color:'#3A2E1A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', fontFamily:"'Noto Serif SC', serif" }}>
              <Play size={12} /> 语音回忆
            </button>
            <button style={{ flex:1, padding:'10px', borderRadius:'12px', background:'transparent', border:'1px solid rgba(139,105,20,0.2)', fontSize:'12px', color:'#3A2E1A', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', fontFamily:"'Noto Serif SC', serif" }}>
              <Share2 size={12} /> 分享记忆
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
