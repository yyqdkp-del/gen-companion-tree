'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Share2, Home as HomeIcon, Sprout } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const CATEGORY = {
  chinese:  { emoji: '📖', label: '中文学习', glow: '#7BC47B', bubble: 'rgba(180,230,180,0.42)' },
  academic: { emoji: '🏆', label: '学业成绩', glow: '#F0C040', bubble: 'rgba(255,220,100,0.42)' },
  hobby:    { emoji: '🎨', label: '兴趣爱好', glow: '#C87BC8', bubble: 'rgba(220,180,220,0.42)' },
  award:    { emoji: '🌟', label: '比赛获奖', glow: '#F5A020', bubble: 'rgba(255,200,80,0.48)'  },
  travel:   { emoji: '✈️', label: '旅行回忆', glow: '#60A8E0', bubble: 'rgba(160,210,250,0.42)' },
  family:   { emoji: '🏠', label: '家庭时光', glow: '#D4845A', bubble: 'rgba(240,190,150,0.42)' },
}

type Milestone = {
  id: string; child_name: string; category: string
  title: string; date: string; note?: string; photo_url?: string
}

const DEMO: Milestone[] = [
  { id:'1', child_name:'William', category:'chinese',  title:'认识100个汉字', date:'2024-09-15', note:'今天考了满分，他超级开心' },
  { id:'2', child_name:'William', category:'award',    title:'游泳比赛亚军',  date:'2024-10-20', note:'练了三个月，终于有了成果' },
  { id:'3', child_name:'Noah',    category:'family',   title:'第一句完整话',  date:'2024-11-05', note:'说了"妈妈我爱你"，我哭了' },
  { id:'4', child_name:'William', category:'travel',   title:'素帖山之旅',    date:'2025-01-10', note:'第一次看到满天星星' },
  { id:'5', child_name:'William', category:'chinese',  title:'开始写日记了',  date:'2025-02-18', note:'写了五行，字歪歪但认真' },
  { id:'6', child_name:'Noah',    category:'hobby',    title:'爱上画画',      date:'2025-03-01', note:'每天都要画一幅给我' },
  { id:'7', child_name:'William', category:'academic', title:'数学竞赛优秀',  date:'2025-03-15', note:'第一次参加竞赛' },
]

// 气泡位置：严格对应参考图中气泡位置（%单位）
// 左树枝挂点
const HANG_POINTS = [
  { x: 6,  y: 12, size: 68, lineH: 22 },  // 左最高
  { x: 4,  y: 25, size: 62, lineH: 18 },  // 左中上
  { x: 2,  y: 39, size: 66, lineH: 20 },  // 左中
  { x: 5,  y: 52, size: 58, lineH: 16 },  // 左下
  { x: 19, y: 18, size: 60, lineH: 18 },  // 中左
  { x: 17, y: 32, size: 56, lineH: 16 },  // 中左下
  // 右树枝挂点
  { x: 84, y: 8,  size: 66, lineH: 24 },  // 右顶
  { x: 88, y: 18, size: 72, lineH: 20 },  // 右上大
  { x: 82, y: 28, size: 60, lineH: 18 },  // 右中
  { x: 90, y: 36, size: 64, lineH: 16 },  // 右中下
]

// 中间飘浮小气泡
const FLOAT_POINTS = [
  { x: 42, y: 26, size: 36 },
  { x: 54, y: 16, size: 32 },
  { x: 63, y: 30, size: 28 },
  { x: 47, y: 40, size: 34 },
  { x: 68, y: 22, size: 30 },
]

const FLOAT_P = [
  { dur:7,   d:0,   y:16, x:5  },
  { dur:9,   d:1.8, y:12, x:7  },
  { dur:6.5, d:3.2, y:18, x:4  },
  { dur:8.5, d:0.6, y:10, x:8  },
  { dur:7.5, d:2.5, y:14, x:6  },
  { dur:10,  d:4.2, y:8,  x:9  },
  { dur:8,   d:1.2, y:15, x:5  },
  { dur:6.8, d:3.8, y:11, x:7  },
  { dur:9.5, d:2.0, y:13, x:4  },
  { dur:7.2, d:0.4, y:9,  x:6  },
]

export default function GrowthPage() {
  const router = useRouter()
  const [milestones] = useState<Milestone[]>(DEMO)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [celebPos, setCelebPos] = useState<{x:number;y:number}|null>(null)

  const handleClick = (m: Milestone, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCelebPos({ x: rect.left + rect.width/2, y: rect.top })
    setSelected(m)
    setTimeout(() => setCelebPos(null), 1200)
  }

  // 分配里程碑到挂点
  const hangBubbles = milestones.slice(0, HANG_POINTS.length).map((m, i) => ({
    m, pos: HANG_POINTS[i], fp: FLOAT_P[i % FLOAT_P.length]
  }))
  const floatBubbles = milestones.slice(HANG_POINTS.length, HANG_POINTS.length + FLOAT_POINTS.length).map((m, i) => ({
    m, pos: FLOAT_POINTS[i], fp: FLOAT_P[(i+4) % FLOAT_P.length]
  }))

  return (
    <main style={{
      position: 'fixed', inset: 0,
      width: '100dvw', height: '100dvh',
      overflow: 'hidden',
      fontFamily: "'Noto Serif SC', Georgia, serif",
    }}>

      {/* ══ 背景图（参考图直接作为背景） ══ */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('/forest-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* 轻微遮罩增加层次感 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,40,10,0.08)' }} />

      {/* ══ 挂点气泡里程碑 ══ */}
      {hangBubbles.map(({ m, pos, fp }, i) => {
        const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
        return (
          <motion.div key={m.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1, scale: 1,
              y: [0, -fp.y, 0],
              x: [0, pos.x < 50 ? -fp.x : fp.x, 0],
            }}
            transition={{
              opacity: { duration: 0.7, delay: 0.2 + i * 0.12 },
              scale: { duration: 0.7, delay: 0.2 + i * 0.12, type: 'spring', stiffness: 150 },
              y: { duration: fp.dur, repeat: Infinity, delay: fp.d, ease: 'easeInOut' },
              x: { duration: fp.dur * 1.4, repeat: Infinity, delay: fp.d + 0.5, ease: 'easeInOut' },
            }}
            onClick={(e) => handleClick(m, e)}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              cursor: 'pointer', zIndex: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            {/* 悬挂线 */}
            <div style={{
              width: '1px', height: `${pos.lineH}px`,
              background: 'linear-gradient(to bottom, rgba(180,160,100,0.6), rgba(180,160,100,0.2))',
            }} />
            {/* 气泡 */}
            <Bubble size={pos.size} cfg={cfg} title={m.title} category={m.category} />
          </motion.div>
        )
      })}

      {/* ══ 中间飘浮小气泡 ══ */}
      {floatBubbles.map(({ m, pos, fp }, i) => {
        const cfg = CATEGORY[m.category as keyof typeof CATEGORY] || CATEGORY.family
        return (
          <motion.div key={`f-${m.id}`}
            animate={{
              y: [0, -fp.y * 0.6, 0],
              x: [0, fp.x * 0.5, -fp.x * 0.3, 0],
              opacity: [0.55, 0.75, 0.55],
            }}
            transition={{ duration: fp.dur * 1.2, repeat: Infinity, delay: fp.d + 0.8, ease: 'easeInOut' }}
            onClick={(e) => handleClick(m, e)}
            style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, cursor: 'pointer', zIndex: 28 }}
          >
            <Bubble size={pos.size} cfg={cfg} title={m.title} category={m.category} small />
          </motion.div>
        )
      })}

      {/* ══ 庆祝粒子 ══ */}
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

      {/* ══ 树洞入口：根·中文（右下角，覆盖在图中树洞位置） ══ */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push('/chinese/decode')}        style={{
          position: 'absolute',
          right: '14%',
          bottom: '12%',
          zIndex: 50,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          width: '80px',
        }}
      >
        {/* 发光覆盖在树洞上 */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: '-16px',
            borderRadius: '50% 50% 48% 48% / 42% 42% 58% 58%',
            background: 'radial-gradient(ellipse, rgba(255,210,80,0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <motion.span
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ fontSize: '13px', fontWeight: 700, color: '#FFE080', letterSpacing: '0.1em', textShadow: '0 0 10px rgba(255,180,0,0.9), 0 1px 3px rgba(0,0,0,0.5)', lineHeight: 1.3, textAlign: 'center' }}
        >
          根·中文
        </motion.span>
        <span style={{ fontSize: '9px', color: 'rgba(255,220,120,0.8)', letterSpacing: '0.15em', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          进入
        </span>
      </motion.button>

      {/* ══ 飘落树叶 ══ */}
      <FallingLeaves />

      {/* ══ 底部导航（首页同款） ══ */}
      <footer style={{
        position: 'fixed',
        bottom: 'max(36px, env(safe-area-inset-bottom, 36px))',
        left: 0, right: 0, zIndex: 110,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 16px',
      }}>
        {/* 弹出菜单 */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ marginBottom: '12px', display: 'flex', gap: '10px' }}
            >
              {[
                { label: '基地', path: '/' },
                { label: '日安', path: '/rian' },
                { label: '日栖', path: '/treehouse' },
              ].map(item => (
                <button key={item.label}
                  onClick={() => { router.push(item.path); setShowMenu(false) }}
                  style={{
                    padding: '8px 20px', borderRadius: '15px',
                    background: 'rgba(255,255,255,0.35)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    fontSize: '11px', fontWeight: 'bold',
                    color: 'rgba(20,50,10,0.85)',
                    cursor: 'pointer', letterSpacing: '0.2em',
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 导航条 */}
        <div style={{
          width: '100%', maxWidth: '340px', height: '62px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: '31px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {/* 左：麦克风（预留） */}
          <button style={{
            width: '52px', height: '46px', borderRadius: '23px',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
          }}>
            🌿
          </button>

          {/* 中：根（当前页，点击弹出菜单） */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              border: 'none', background: 'none', cursor: 'pointer',
            }}
          >
            <HomeIcon size={19} color={showMenu ? '#8B6914' : 'rgba(20,50,10,0.7)'} />
            <span style={{
              fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.3em',
              color: showMenu ? '#8B6914' : 'rgba(20,50,10,0.7)',
              fontFamily: "'Noto Serif SC', serif",
            }}>
              根
            </span>
          </button>

          {/* 右：相机（预留） */}
          <button style={{
            width: '52px', height: '46px', borderRadius: '23px',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
          }}>
            🌸
          </button>
        </div>
      </footer>

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

// ── 气泡组件 ──
function Bubble({ size, cfg, title, category, small }: {
  size: number
  cfg: { emoji: string; glow: string; bubble: string }
  title: string
  category: string
  small?: boolean
}) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.72) 0%, ${cfg.bubble} 55%, rgba(255,255,255,0.08) 100%)`,
      border: '1.5px solid rgba(255,255,255,0.72)',
      boxShadow: `0 4px 20px rgba(0,0,0,0.1), inset 0 -3px 10px rgba(0,0,0,0.03), 0 0 20px ${cfg.glow}32`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      backdropFilter: 'blur(4px)',
    }}>
      {/* 主高光 */}
      <div style={{ position:'absolute', top:'13%', left:'19%', width:'34%', height:'20%', borderRadius:'50%', background:'rgba(255,255,255,0.65)', transform:'rotate(-32deg)' }} />
      {/* 副高光 */}
      <div style={{ position:'absolute', top:'22%', left:'58%', width:'13%', height:'10%', borderRadius:'50%', background:'rgba(255,255,255,0.38)' }} />

      <span style={{ fontSize: small ? '14px' : size > 64 ? '22px' : '18px', lineHeight: 1, marginBottom: '2px' }}>
        {cfg.emoji}
      </span>
      {!small && (
        <span style={{
          fontSize: '7px', color: 'rgba(20,50,10,0.75)', fontWeight: 600,
          letterSpacing: '0.04em', textAlign: 'center', padding: '0 4px',
          lineHeight: 1.2, maxWidth: `${size - 10}px`,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title.slice(0, 5)}
        </span>
      )}

      {/* 奖项脉冲 */}
      {category === 'award' && (
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ position:'absolute', inset:-5, borderRadius:'50%', border:`2px solid ${cfg.glow}`, pointerEvents:'none' }}
        />
      )}
    </div>
  )
}

// ── 飘落树叶 ──
function FallingLeaves() {
  const leaves = [
    { id:0, sx:28, dur:12, d:0,   size:13, r:20  },
    { id:1, sx:58, dur:15, d:3.5, size:10, r:-38 },
    { id:2, sx:42, dur:10, d:7,   size:12, r:42  },
    { id:3, sx:72, dur:14, d:1.8, size:9,  r:-22 },
    { id:4, sx:18, dur:13, d:9,   size:11, r:55  },
    { id:5, sx:82, dur:11, d:5,   size:8,  r:-30 },
  ]
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', overflow:'hidden', zIndex:35 }}>
      {leaves.map(l => (
        <motion.div key={l.id}
          initial={{ y:'-4vh', x:`${l.sx}vw`, opacity:0.55, rotate:l.r }}
          animate={{
            y:'108vh',
            x:[`${l.sx}vw`,`${l.sx+7}vw`,`${l.sx+2}vw`,`${l.sx+10}vw`],
            opacity:[0.55, 0.42, 0.28, 0],
            rotate:[l.r, l.r+80, l.r+160, l.r+240],
          }}
          transition={{ duration:l.dur, delay:l.d, repeat:Infinity, ease:'linear' }}
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
          <h2 style={{ fontSize:'20px', fontWeight:500, color:'#3A2E1A', margin:'0 0 10px', lineHeight:1.4 }}>{m.title}</h2>
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
              <p style={{ fontSize:'13px', color:'#6A5A3A', lineHeight:1.8, margin:0, fontStyle:'italic' }}>"{m.note}"</p>
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
