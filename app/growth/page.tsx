'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { X, Plus, Share2, Play, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// ── 森林色系 ──
const THEME = {
  bg: '#F2EDE4',
  bgDeep: '#E8E0D0',
  trunk: '#8B6914',
  trunkDark: '#5C4A1E',
  leaf: '#4A8C5C',
  leafLight: '#7AB87A',
  leafNew: '#A8D5A2',
  gold: '#C8921A',
  goldLight: '#F0C060',
  flower: '#E8A0A0',
  travel: '#A0B8D0',
  award: '#D4A520',
  text: '#3A2E1A',
  textMid: '#6A5A3A',
  textDim: '#9A8A6A',
  paper: '#FDF8EE',
  shadow: 'rgba(58,46,26,0.12)',
}

// ── 里程碑类型 ──
const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  chinese:  { color: THEME.leafLight,  emoji: '📖', label: '中文学习' },
  academic: { color: THEME.goldLight,  emoji: '🏆', label: '学业成绩' },
  hobby:    { color: THEME.flower,     emoji: '🎨', label: '兴趣爱好' },
  award:    { color: THEME.award,      emoji: '🌟', label: '比赛获奖' },
  travel:   { color: THEME.travel,     emoji: '✈️', label: '旅行回忆' },
  family:   { color: '#D4A080',        emoji: '🏠', label: '家庭时光' },
}

// ── 示例里程碑数据 ──
const DEMO_MILESTONES = [
  { id: '1', child_name: 'William', category: 'chinese', title: '认识了100个汉字', date: '2024-09-15', note: '今天考了满分，他超级开心', photo_url: '', branch_x: 45, branch_y: 75 },
  { id: '2', child_name: 'William', category: 'award',   title: '游泳比赛第二名', date: '2024-10-20', note: '练了三个月，终于有了成果', photo_url: '', branch_x: 60, branch_y: 60 },
  { id: '3', child_name: 'Noah',    category: 'family',  title: '第一次说完整句子', date: '2024-11-05', note: '说了"妈妈我爱你"，我哭了', photo_url: '', branch_x: 35, branch_y: 55 },
  { id: '4', child_name: 'William', category: 'travel',  title: '清迈素帖山之旅', date: '2025-01-10', note: '第一次看到满天星星', photo_url: '', branch_x: 65, branch_y: 42 },
  { id: '5', child_name: 'William', category: 'chinese', title: '能写日记了', date: '2025-02-18', note: '写了五行，字歪歪的但很认真', photo_url: '', branch_x: 40, branch_y: 38 },
  { id: '6', child_name: 'Noah',    category: 'hobby',   title: '爱上画画', date: '2025-03-01', note: '每天都要画一幅给我', photo_url: '', branch_x: 55, branch_y: 28 },
]

type Milestone = {
  id: string
  child_name: string
  category: string
  title: string
  date: string
  note?: string
  photo_url?: string
  branch_x: number
  branch_y: number
}

type FilterType = 'all' | string

// ══════════════════════════════════════
// 主页面
// ══════════════════════════════════════
export default function GrowthPage() {
  const router = useRouter()

  const [milestones, setMilestones] = useState<Milestone[]>(DEMO_MILESTONES)
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [mode, setMode] = useState<'mom' | 'child'>('mom')
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [particles, setParticles] = useState<{ id: string; x: number; y: number }[]>([])
  const [newMilestonePos, setNewMilestonePos] = useState<{ x: number; y: number } | null>(null)

  // 加载数据
  useEffect(() => {
    const load = async () => {
      const { data: childData } = await supabase.from('children').select('*')
      if (childData?.length) setChildren(childData)

      // 加载里程碑（如果有表的话）
      // const { data: msData } = await supabase.from('milestones').select('*').order('date', { ascending: true })
      // if (msData?.length) setMilestones(msData)
    }
    load()
  }, [])

  // 过滤后的里程碑
  const filtered = milestones.filter(m => {
    const catOk = filter === 'all' || m.category === filter
    const childOk = selectedChild === 'all' || m.child_name === selectedChild
    return catOk && childOk
  })

  // 庆祝粒子
  const celebrate = (x: number, y: number) => {
    const ps = Array.from({ length: 8 }, () => ({
      id: crypto.randomUUID(),
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
    }))
    setParticles(ps)
    setTimeout(() => setParticles([]), 1500)
  }

  return (
    <main style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      background: `linear-gradient(180deg, ${THEME.bg} 0%, ${THEME.bgDeep} 100%)`,
      overflow: 'hidden', fontFamily: "'Noto Serif SC', Georgia, serif",
      display: 'flex', flexDirection: 'column',
    }}>

      {/* 飘落树叶粒子 */}
      <FallingLeaves />

      {/* 庆祝粒子 */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div key={p.id}
            initial={{ opacity: 1, scale: 0, x: p.x, y: p.y }}
            animate={{ opacity: 0, scale: 1.5, x: p.x + (Math.random() - 0.5) * 40, y: p.y - 50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ position: 'fixed', width: '8px', height: '8px', borderRadius: '50%', background: THEME.goldLight, pointerEvents: 'none', zIndex: 100 }}
          />
        ))}
      </AnimatePresence>

      {/* ── 顶部导航 ── */}
      <div style={{ padding: '52px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🌳</span>
          <h1 style={{ fontSize: '20px', fontWeight: 400, color: THEME.text, margin: 0, letterSpacing: '0.15em' }}>根</h1>
        </div>

        {/* 妈妈/孩子模式切换 */}
        <div style={{ display: 'flex', background: 'rgba(139,105,20,0.1)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
          {(['mom', 'child'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: '5px 14px', borderRadius: '17px', border: 'none', fontSize: '11px', fontWeight: mode === m ? 600 : 400, cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.3s', background: mode === m ? THEME.trunk : 'transparent', color: mode === m ? '#FDF8EE' : THEME.textMid }}>
              {m === 'mom' ? '妈妈' : '孩子'}
            </button>
          ))}
        </div>

        <button onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: THEME.textDim, fontSize: '12px', letterSpacing: '0.2em', cursor: 'pointer', opacity: 0.6 }}>
          ← 基地
        </button>
      </div>

      {/* ── 孩子选择 ── */}
      <div style={{ padding: '4px 20px 0', display: 'flex', gap: '8px', flexShrink: 0, position: 'relative', zIndex: 20 }}>
        {['all', ...children.map(c => c.name)].map(name => (
          <button key={name} onClick={() => setSelectedChild(name)}
            style={{ padding: '4px 14px', borderRadius: '14px', border: `1px solid ${selectedChild === name ? THEME.trunk : 'rgba(139,105,20,0.2)'}`, background: selectedChild === name ? THEME.trunk : 'transparent', color: selectedChild === name ? '#FDF8EE' : THEME.textMid, fontSize: '11px', cursor: 'pointer', letterSpacing: '0.1em', transition: 'all 0.2s' }}>
            {name === 'all' ? '全部' : name}
          </button>
        ))}
      </div>

      {/* ── 生命树主体 ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MemoryTree
          milestones={filtered}
          filter={filter}
          onSelectMilestone={(m, x, y) => { setSelected(m); celebrate(x, y) }}
          mode={mode}
        />

        {/* 根·中文入口 — 树洞样式 */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/chinese')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          style={{
            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
            width: '220px', padding: '14px 20px',
            background: `radial-gradient(ellipse at 50% 30%, rgba(74,140,92,0.3) 0%, rgba(74,140,92,0.15) 100%)`,
            border: `2px solid ${THEME.leaf}`,
            borderRadius: '50% 50% 46% 46% / 30% 30% 70% 70%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 24px rgba(74,140,92,0.2), inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}>
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ fontSize: '20px' }}>🌿</motion.span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: THEME.leaf, letterSpacing: '0.15em' }}>根·中文学习中心</span>
          <span style={{ fontSize: '10px', color: THEME.textDim, letterSpacing: '0.1em' }}>点击进入</span>
        </motion.button>
      </div>

      {/* ── 过滤标签 ── */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0, position: 'relative', zIndex: 20, scrollbarWidth: 'none' }}>
        <FilterTag label="全部" value="all" current={filter} onClick={setFilter} />
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <FilterTag key={key} label={cfg.label} value={key} current={filter} onClick={setFilter} emoji={cfg.emoji} />
        ))}
      </div>

      {/* ── 里程碑详情卡片 ── */}
      <AnimatePresence>
        {selected && (
          <MilestoneCard
            milestone={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </main>
  )
}

// ══════════════════════════════════════
// 生命树 SVG 组件
// ══════════════════════════════════════
function MemoryTree({ milestones, filter, onSelectMilestone, mode }: {
  milestones: Milestone[]
  filter: FilterType
  onSelectMilestone: (m: Milestone, x: number, y: number) => void
  mode: 'mom' | 'child'
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        viewBox="0 0 400 520"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 树干 */}
        <motion.path
          d="M 200 510 C 200 510 195 420 198 370 C 200 330 195 300 200 260 C 205 220 198 190 200 150"
          stroke={THEME.trunk} strokeWidth="18" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        <motion.path
          d="M 200 510 C 200 510 195 420 198 370 C 200 330 195 300 200 260 C 205 220 198 190 200 150"
          stroke={THEME.trunkDark} strokeWidth="6" fill="none" strokeLinecap="round" opacity={0.3}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut', delay: 0.1 }}
        />

        {/* 主枝干 */}
        {[
          { d: "M 200 380 C 220 360 260 340 290 320", delay: 0.4 },
          { d: "M 200 380 C 180 360 140 350 110 335", delay: 0.5 },
          { d: "M 200 310 C 225 290 265 275 285 255", delay: 0.6 },
          { d: "M 200 310 C 175 295 145 280 125 265", delay: 0.7 },
          { d: "M 200 240 C 220 215 255 205 275 190", delay: 0.8 },
          { d: "M 200 240 C 180 218 150 208 130 195", delay: 0.9 },
          { d: "M 200 180 C 215 160 240 148 258 138", delay: 1.0 },
          { d: "M 200 180 C 185 162 160 150 142 142", delay: 1.1 },
          { d: "M 200 150 C 200 130 198 110 200 85", delay: 1.2 },
        ].map((branch, i) => (
          <motion.path key={i} d={branch.d}
            stroke={THEME.trunk} strokeWidth={8 - i * 0.6} fill="none" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: branch.delay }}
          />
        ))}

        {/* 树冠叶簇 */}
        {[
          { cx: 200, cy: 75, r: 45 },
          { cx: 162, cy: 95, r: 32 },
          { cx: 238, cy: 92, r: 35 },
          { cx: 148, cy: 130, r: 26 },
          { cx: 252, cy: 128, r: 28 },
          { cx: 185, cy: 68, r: 25 },
          { cx: 215, cy: 65, r: 22 },
        ].map((leaf, i) => (
          <motion.ellipse key={i}
            cx={leaf.cx} cy={leaf.cy} rx={leaf.r} ry={leaf.r * 0.85}
            fill={i % 2 === 0 ? THEME.leaf : THEME.leafLight} opacity={0.85}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.85 }}
            transition={{ duration: 0.8, delay: 1.3 + i * 0.08, type: 'spring', stiffness: 120 }}
            style={{ transformOrigin: `${leaf.cx}px ${leaf.cy}px` }}
          />
        ))}

        {/* 呼吸动画 — 整棵树轻微摇曳 */}
        <motion.g
          animate={{ rotate: [0, 0.5, 0, -0.5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '200px 510px' }}
        >
          {/* 里程碑果实/叶片 */}
          {milestones.map((m, i) => {
            const cfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.family
            const isHighlighted = filter === 'all' || filter === m.category
            return (
              <motion.g key={m.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isHighlighted ? 1 : 0.5, opacity: isHighlighted ? 1 : 0.25 }}
                transition={{ duration: 0.6, delay: 1.5 + i * 0.12, type: 'spring', stiffness: 200 }}
                style={{ cursor: 'pointer', transformOrigin: `${m.branch_x * 4}px ${m.branch_y * 5.2}px` }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectMilestone(m, m.branch_x * 4, m.branch_y * 5.2)
                }}
                whileHover={{ scale: isHighlighted ? 1.3 : 0.6 }}
              >
                {/* 果实圆圈 */}
                <circle
                  cx={m.branch_x * 4} cy={m.branch_y * 5.2}
                  r={m.category === 'award' ? 14 : 11}
                  fill={cfg.color} opacity={0.9}
                  filter="url(#fruitShadow)"
                />
                {/* 高光 */}
                <circle
                  cx={m.branch_x * 4 - 3} cy={m.branch_y * 5.2 - 3}
                  r={3} fill="rgba(255,255,255,0.5)"
                />
                {/* emoji */}
                <text
                  x={m.branch_x * 4} y={m.branch_y * 5.2 + 5}
                  textAnchor="middle" fontSize="10"
                  style={{ userSelect: 'none' }}
                >
                  {cfg.emoji}
                </text>

                {/* 奖项闪光 */}
                {m.category === 'award' && (
                  <motion.circle
                    cx={m.branch_x * 4} cy={m.branch_y * 5.2} r={18}
                    fill="none" stroke={THEME.goldLight} strokeWidth={1.5}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                    style={{ transformOrigin: `${m.branch_x * 4}px ${m.branch_y * 5.2}px` }}
                  />
                )}
              </motion.g>
            )
          })}
        </motion.g>

        {/* 滤镜 */}
        <defs>
          <filter id="fruitShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>
      </svg>

      {/* 今日/本周成长小结 — 右下角 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(253,248,238,0.85)', backdropFilter: 'blur(8px)',
          borderRadius: '16px', padding: '12px 14px',
          border: `1px solid rgba(139,105,20,0.15)`,
          boxShadow: '0 4px 16px rgba(58,46,26,0.08)',
          maxWidth: '140px',
        }}
      >
        <p style={{ fontSize: '9px', color: THEME.textDim, letterSpacing: '0.2em', margin: '0 0 6px', textTransform: 'uppercase' }}>本周成长</p>
        <p style={{ fontSize: '22px', fontWeight: 500, color: THEME.trunk, margin: '0 0 2px', lineHeight: 1 }}>
          {milestones.filter(m => {
            const d = new Date(m.date)
            const now = new Date()
            const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
            return diff <= 7
          }).length}
        </p>
        <p style={{ fontSize: '10px', color: THEME.textMid, margin: 0 }}>条新记录</p>
        <div style={{ marginTop: '8px', height: '1px', background: 'rgba(139,105,20,0.1)' }} />
        <p style={{ fontSize: '9px', color: THEME.textDim, margin: '6px 0 0', letterSpacing: '0.1em' }}>
          共 {milestones.length} 个里程碑
        </p>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════
// 飘落树叶粒子
// ══════════════════════════════════════
function FallingLeaves() {
  const leaves = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    delay: i * 2.5,
    duration: 8 + Math.random() * 6,
    size: 8 + Math.random() * 8,
    rotate: Math.random() * 360,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {leaves.map(leaf => (
        <motion.div key={leaf.id}
          initial={{ y: -20, x: `${leaf.x}vw`, opacity: 0.6, rotate: leaf.rotate }}
          animate={{ y: '110vh', x: `${leaf.x + (Math.random() - 0.5) * 20}vw`, opacity: [0.6, 0.4, 0], rotate: leaf.rotate + 180 }}
          transition={{ duration: leaf.duration, delay: leaf.delay, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', fontSize: `${leaf.size}px` }}
        >
          🍃
        </motion.div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════
// 过滤标签
// ══════════════════════════════════════
function FilterTag({ label, value, current, onClick, emoji }: {
  label: string; value: string; current: string; onClick: (v: string) => void; emoji?: string
}) {
  const active = current === value
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => onClick(value)}
      style={{
        flexShrink: 0, padding: '5px 14px', borderRadius: '16px',
        border: `1px solid ${active ? THEME.trunk : 'rgba(139,105,20,0.2)'}`,
        background: active ? THEME.trunk : 'rgba(253,248,238,0.7)',
        color: active ? '#FDF8EE' : THEME.textMid,
        fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em',
        display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'all 0.2s', whiteSpace: 'nowrap',
        fontFamily: "'Noto Serif SC', serif",
      }}
    >
      {emoji && <span style={{ fontSize: '12px' }}>{emoji}</span>}
      {label}
    </motion.button>
  )
}

// ══════════════════════════════════════
// 里程碑记忆卡片
// ══════════════════════════════════════
function MilestoneCard({ milestone: m, onClose }: { milestone: Milestone; onClose: () => void }) {
  const cfg = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.family

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 12px 20px', background: 'rgba(58,46,26,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '400px',
          background: THEME.paper,
          borderRadius: '24px 24px 20px 20px',
          overflow: 'hidden',
          boxShadow: `0 -4px 40px rgba(58,46,26,0.15)`,
          border: `1px solid rgba(139,105,20,0.15)`,
        }}
      >
        {/* 卡片顶部色条 */}
        <div style={{ height: '5px', background: cfg.color }} />

        <div style={{ padding: '20px 20px 24px' }}>

          {/* 头部 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {cfg.emoji}
              </div>
              <div>
                <p style={{ fontSize: '10px', color: THEME.textDim, letterSpacing: '0.2em', margin: '0 0 3px', textTransform: 'uppercase' }}>{cfg.label}</p>
                <p style={{ fontSize: '10px', color: THEME.textDim, margin: 0 }}>{m.child_name} · {m.date}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.textDim, cursor: 'pointer', fontSize: '18px', opacity: 0.5, padding: '4px' }}>×</button>
          </div>

          {/* 标题 */}
          <h2 style={{ fontSize: '22px', fontWeight: 500, color: THEME.text, margin: '0 0 12px', lineHeight: 1.4, letterSpacing: '0.05em' }}>
            {m.title}
          </h2>

          {/* 照片区域 */}
          {m.photo_url ? (
            <div style={{ width: '100%', height: '160px', borderRadius: '14px', overflow: 'hidden', marginBottom: '14px', background: `${cfg.color}20` }}>
              <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100px', borderRadius: '14px', marginBottom: '14px', background: `${cfg.color}15`, border: `1px dashed ${cfg.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '32px', opacity: 0.4 }}>{cfg.emoji}</span>
            </div>
          )}

          {/* 手写备注 */}
          {m.note && (
            <div style={{ background: 'rgba(232,213,184,0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', borderLeft: `3px solid ${cfg.color}` }}>
              <p style={{ fontSize: '14px', color: THEME.textMid, lineHeight: 1.8, margin: 0, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                "{m.note}"
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ flex: 1, padding: '11px', borderRadius: '14px', background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`, fontSize: '12px', color: THEME.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Noto Serif SC', serif" }}>
              <Play size={14} /> 语音回忆
            </button>
            <button style={{ flex: 1, padding: '11px', borderRadius: '14px', background: 'transparent', border: `1px solid rgba(139,105,20,0.2)`, fontSize: '12px', color: THEME.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Noto Serif SC', serif" }}>
              <Share2 size={14} /> 分享记忆
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
