'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { toast } from '@/app/components/Toast'

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(45,50,47,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
  padding: '20px',
  marginBottom: 12,
}

const MOM_SCRIPT_BOX: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(164,99,85,0.06) 0%, rgba(164,99,85,0.02) 100%)',
  border: '1px solid rgba(164,99,85,0.15)',
  borderLeft: '3px solid #a46355',
  borderRadius: 14,
  padding: '16px 18px',
}

const CANVAS_GRID_WRAP: React.CSSProperties = {
  background: '#faf7f0',
  border: '3px double rgba(164,99,85,0.3)',
  borderRadius: 16,
  backgroundImage: `
    linear-gradient(rgba(164,99,85,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(164,99,85,0.07) 1px, transparent 1px)
  `,
  backgroundSize: '50% 50%',
  display: 'inline-block',
  lineHeight: 0,
}

const PROGRESS_TRACK: React.CSSProperties = {
  background: '#ece6dc',
  borderRadius: 4,
  height: 4,
  overflow: 'hidden',
}

const PROGRESS_FILL: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #d5b4ab 0%, #a46355 100%)',
  borderRadius: 4,
  transition: 'width 0.4s ease',
}

function drawTianZiGrid(ctx: CanvasRenderingContext2D, size: number, char: string) {
  ctx.fillStyle = '#faf7f0'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(164, 99, 85, 0.15)'
  ctx.lineWidth = 0.8
  ctx.strokeRect(2, 2, size - 4, size - 4)
  ctx.beginPath()
  ctx.moveTo(size / 2, 2)
  ctx.lineTo(size / 2, size - 2)
  ctx.moveTo(2, size / 2)
  ctx.lineTo(size - 2, size / 2)
  ctx.stroke()
  ctx.font = `${size * 0.75}px "Noto Serif SC", serif`
  ctx.fillStyle = 'rgba(164, 99, 85, 0.08)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, size / 2, size / 2)
}

const PRIMARY_BTN: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: 16,
  border: 'none',
  background: 'linear-gradient(135deg, #a46355 0%, #8a5548 100%)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Noto Serif SC', serif",
  letterSpacing: '0.05em',
  boxShadow: '0 6px 20px rgba(164,99,85,0.28)',
}

type Step = 'origin' | 'structure' | 'write' | 'use'

type Props = {
  data: any
  char: string
  childName?: string
  onComplete: (sentence: string) => void
  onClose: () => void
}

const STEPS: { key: Step; label: string; emoji: string }[] = [
  { key: 'origin',    label: '字的前世', emoji: '🏺' },
  { key: 'structure', label: '字的身体', emoji: '🧩' },
  { key: 'write',     label: '描红练字', emoji: '✍️' },
  { key: 'use',       label: '我会用了', emoji: '🌟' },
]

// ── 全局语音按钮 ──
function VoiceControl({ text }: { text: string }) {
  const { speak, stop } = useApp()
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    if (playing) { stop(); setPlaying(false) }
    else { speak(text); setPlaying(true) }
  }

  // 步骤切换时重置
  useEffect(() => { setPlaying(false) }, [text])

  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={toggle}
      style={{ width: 36, height: 36, borderRadius: '50%',
        background: playing ? 'rgba(164,99,85,0.12)' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${playing ? '#a46355' : 'rgba(164,99,85,0.2)'}`,
        boxShadow: '0 2px 8px rgba(45,50,47,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 16 }}>
      {playing ? '⏹' : '🔊'}
    </motion.button>
  )
}

// ── 进度条 ──
function ProgressBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 20px', marginBottom: 20 }}>
      {STEPS.map((s, i) => (
        <div key={s.key} style={{ flex: 1, display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ ...PROGRESS_TRACK, width: '100%' }}>
            <div style={{
              ...PROGRESS_FILL,
              width: i <= current ? '100%' : '0%',
            }} />
          </div>
          <span style={{ fontSize: 10,
            color: i === current ? '#a46355' : 'rgba(45,50,47,0.45)',
            fontFamily: 'sans-serif',
            fontWeight: i === current ? 700 : 400 }}>
            {s.emoji} {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── 笔画生活比喻 ──
const STROKE_METAPHOR: Record<string, { icon: string; desc: string; direction: string }> = {
  '横': { icon: '→', desc: '一条平稳的路，从左走到右', direction: '左 → 右' },
  '竖': { icon: '↓', desc: '一棵树，直直站好', direction: '上 → 下' },
  '撇': { icon: '↙', desc: '风来了，往左下飘', direction: '右上 → 左下' },
  '捺': { icon: '↘', desc: '脚踩下去，收尾有力', direction: '左上 → 右下' },
  '点': { icon: '·', desc: '一滴水落下来', direction: '右上 → 左下' },
  '折': { icon: '↳', desc: '走路转了个弯', direction: '先横再竖' },
  '钩': { icon: '↩', desc: '钓鱼钩，最后一甩', direction: '最后往左钩' },
  '横折': { icon: '⌐', desc: '先走一段路，再转弯', direction: '先横再折' },
  '横撇': { icon: '⌐', desc: '走一段路再往左飘', direction: '先横再撇' },
  '竖弯钩': { icon: '↙', desc: '像一个问号，最后甩出去', direction: '竖下再弯钩' },
  '撇折': { icon: '↗', desc: '先飘下来再转回去', direction: '先撇再折' },
}

function getStrokeInfo(stroke: string) {
  // 精确匹配
  if (STROKE_METAPHOR[stroke]) return STROKE_METAPHOR[stroke]
  // 模糊匹配
  for (const key of Object.keys(STROKE_METAPHOR)) {
    if (stroke.includes(key)) return STROKE_METAPHOR[key]
  }
  return { icon: '✏️', desc: '跟着感觉写', direction: '按笔顺来' }
}

// ── 第一步：字的前世 ──
function StepOrigin({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const [activeStage, setActiveStage] = useState(0)
  const evolution: any[] = data.char_evolution || []

  // 构建语音文本
  const voiceText = evolution.length > 0
    ? evolution.map((e: any) => `${e.stage}：${e.desc}`).join('。')
    : data.evolution || `${char}这个字有很有趣的来历。`

  // 如果没有 char_evolution，构建默认三阶段
  const stages = evolution.length > 0 ? evolution : [
    { stage: '象形起源', form: data.parts?.[0]?.char || '古', desc: data.parts?.[0]?.image || '古人观察自然所得' },
    { stage: '结构演变', form: data.parts?.map((p: any) => p.char).join('+') || char, desc: data.evolution || '部件组合形成新意' },
    { stage: '现代楷书', form: char, desc: data.meaning || '沿用至今' },
  ]

  return (
    <div style={{ padding: '0 24px' }}>

      {/* 顶部：大字 + 语音 */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20 }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 10 }}>
          <div style={{
            fontSize: 'clamp(80px, 20vw, 120px)',
            fontFamily: "'Noto Serif SC', serif",
            color: '#2d322f',
            lineHeight: 1,
            textAlign: 'center',
            textShadow: '0 8px 32px rgba(45,50,47,0.12)',
            letterSpacing: '-0.02em',
            margin: '32px 0',
          }}>{char}</div>
          <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.45)',
            fontFamily: 'sans-serif', marginTop: 4 }}>{data.pinyin}</div>
        </motion.div>
        <VoiceControl text={voiceText} />
      </div>

      {/* 演变阶段 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#a46355', letterSpacing: 3,
          marginBottom: 10, fontFamily: 'sans-serif' }}>🏺 造字演变</div>

        {/* 阶段选择器 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {stages.map((s: any, i: number) => (
            <motion.button key={i} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveStage(i)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 10,
                border: `1px solid ${i === activeStage ? '#a46355' : 'rgba(164,99,85,0.2)'}`,
                background: i === activeStage ? 'rgba(164,99,85,0.08)' : '#f7f4ee',
                cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: i === activeStage ? 26 : 20,
                fontFamily: "'Noto Serif SC', serif",
                color: i === activeStage ? '#a46355' : '#5a5a4a',
                lineHeight: 1, marginBottom: 4,
                opacity: i === activeStage ? 1 : 0.5 + i * 0.2 }}>
                {s.form}
              </div>
              <div style={{ fontSize: 9, color: i === activeStage ? '#a46355' : 'rgba(45,50,47,0.45)',
                fontFamily: 'sans-serif', fontWeight: i === activeStage ? 700 : 400 }}>
                {s.stage}
              </div>
            </motion.button>
          ))}
        </div>

        {/* 连接箭头 */}
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          {stages.map((s: any, i: number) => (
            <React.Fragment key={i}>
              <div style={{ fontSize: 20, fontFamily: "'Noto Serif SC', serif",
                color: i === activeStage ? '#a46355' : '#5a5a4a',
                opacity: i === activeStage ? 1 : 0.4,
                transition: 'all 0.2s' }}>{s.form}</div>
              {i < stages.length - 1 && (
                <div style={{ fontSize: 14, color: 'rgba(45,50,47,0.45)' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 当前阶段说明 */}
        <AnimatePresence mode="wait">
          <motion.div key={activeStage}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            style={{ ...GLASS_CARD, padding: '14px 16px', borderRadius: 14,
              borderLeft: '3px solid rgba(164,99,85,0.35)',
              fontSize: 14, color: T.text, lineHeight: 1.9,
              fontFamily: 'sans-serif' }}>
            <strong style={{ color: '#a46355' }}>{stages[activeStage].stage}</strong>
            {' '}——{' '}{stages[activeStage].desc}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* memory trick */}
      {data.memory_trick && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ ...GLASS_CARD, padding: '12px 16px', marginBottom: 16,
            fontSize: 14, color: T.gold, fontStyle: 'italic',
            fontFamily: 'sans-serif' }}>
          🎵 {data.memory_trick}
        </motion.div>
      )}

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext} style={PRIMARY_BTN}>
        我明白了 →
      </motion.button>
    </div>
  )
}

// ── 六书颜色 ──
const LIUSHU_CFG: Record<string, { color: string; bg: string; desc: string }> = {
  '象形': { color: '#a46355', bg: 'rgba(164,99,85,0.08)', desc: '照着东西的样子画出来' },
  '指事': { color: '#BA6A00', bg: 'rgba(186,106,0,0.08)', desc: '用符号指示抽象概念' },
  '会意': { color: '#5c7a5e', bg: 'rgba(45,106,79,0.08)', desc: '两个或多个部件合起来表意' },
  '形声': { color: '#2d3f4a', bg: 'rgba(45,63,74,0.08)', desc: '一部分表意，一部分表音' },
  '转注': { color: '#7A5C48', bg: 'rgba(122,92,72,0.08)', desc: '意义相通的字互相解释' },
  '假借': { color: '#5C6E00', bg: 'rgba(92,110,0,0.08)', desc: '借用同音字表达新意思' },
}

// ── 第二步：字的身体（含妈妈台词）──
function StepStructure({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const { stop } = useApp()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [showMom, setShowMom] = useState(false)
  const [showMomExplain, setShowMomExplain] = useState(false)
  const parts = data.parts || []

  const voiceText = data.mom_script
    ? data.mom_script
    : parts.map((p: any) => `${p.char}，${p.name}，${p.image || ''}`).join('。')

  return (
    <div style={{ padding: '0 24px' }}>

      {/* 顶部：字 + 语音 */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          fontSize: 'clamp(80px, 20vw, 120px)',
          fontFamily: "'Noto Serif SC', serif",
          color: '#2d322f',
          lineHeight: 1,
          textAlign: 'center',
          textShadow: '0 8px 32px rgba(45,50,47,0.12)',
          letterSpacing: '-0.02em',
        }}>{char}</div>
        <VoiceControl text={voiceText} />
      </div>

      {/* 六书分类 */}
      {data.liushu && (() => {
        const cfg = LIUSHU_CFG[data.liushu.type] || { color: '#8a7355', bg: 'rgba(164,99,85,0.08)', desc: '' }
        return (
          <div style={{ marginBottom: 14 }}>
            {/* 类型标签 */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 20,
              background: cfg.bg,
              border: `1px solid ${cfg.color}44`,
              marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700,
                color: cfg.color, fontFamily: "'Noto Serif SC', serif" }}>
                {data.liushu.type}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(45,50,47,0.45)', fontFamily: 'sans-serif' }}>
                {cfg.desc}
              </span>
            </div>

            {/* 孩子版（默认展示）*/}
            <div style={{ padding: '14px', borderRadius: 12,
              background: cfg.bg,
              borderLeft: `3px solid ${cfg.color}`,
              fontSize: 14, color: '#2d322f', lineHeight: 2,
              fontFamily: 'sans-serif', marginBottom: 8 }}>
              {data.liushu.child_explain || data.liushu.explanation}
            </div>

            {/* 妈妈版（折叠）*/}
            <motion.div whileTap={{ scale: 0.98 }}
              onClick={() => setShowMomExplain((o: boolean) => !o)}
              style={{ padding: '10px 14px', borderRadius: 12,
                background: showMomExplain ? 'rgba(45,63,74,0.06)' : 'transparent',
                border: '1px solid rgba(45,63,74,0.15)',
                cursor: 'pointer', marginBottom: 6,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: T.navy,
                fontFamily: 'sans-serif', fontWeight: 600 }}>
                📚 妈妈版学术解释
              </span>
              <motion.span animate={{ rotate: showMomExplain ? 180 : 0 }}
                style={{ fontSize: 12, color: T.navy, display: 'inline-block' }}>
                ⌄
              </motion.span>
            </motion.div>

            <AnimatePresence>
              {showMomExplain && data.liushu.mom_explain && (
                <motion.div initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ padding: '14px', borderRadius: 12,
                    background: 'rgba(45,63,74,0.05)',
                    borderLeft: '3px solid rgba(45,63,74,0.3)',
                    fontSize: 13, color: T.navy, lineHeight: 1.9,
                    fontFamily: 'sans-serif' }}>
                    {data.liushu.mom_explain}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })()}

      <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)', fontFamily: 'sans-serif',
        marginBottom: 12 }}>点击部件，了解它的含义</div>

      {/* 部件 */}
      {parts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap',
          marginBottom: 12 }}>
          {parts.map((p: any, i: number) => (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => {
                setActiveIdx(activeIdx === i ? null : i)
                stop()
              }}
              style={{ padding: '12px 16px', borderRadius: 14,
                background: activeIdx === i ? 'rgba(164,99,85,0.1)' : '#f7f4ee',
                border: `1.5px solid ${activeIdx === i
                  ? 'rgba(164,99,85,0.4)' : 'rgba(164,99,85,0.25)'}`,
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', minWidth: 70 }}>
              <div style={{ fontSize: 32, fontFamily: "'Noto Serif SC', serif",
                color: '#a46355', lineHeight: 1 }}>{p.char}</div>
              <div style={{ fontSize: 10, color: 'rgba(45,50,47,0.45)',
                marginTop: 4, fontFamily: 'sans-serif' }}>{p.name}</div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeIdx !== null && parts[activeIdx] && (
          <motion.div initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ padding: '12px 16px', borderRadius: 12,
              background: 'rgba(164,99,85,0.06)',
              borderLeft: '3px solid rgba(164,99,85,0.3)',
              fontSize: 13, color: '#2d322f', lineHeight: 1.8,
              fontFamily: 'sans-serif' }}>
              <strong>{parts[activeIdx].char}</strong> ——{' '}
              {parts[activeIdx].image || parts[activeIdx].meaning || '古人观察自然所得'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 英文联结 */}
      {data.english_link && (
        <div style={{ padding: '10px 14px', borderRadius: 12,
          background: 'rgba(45,63,74,0.05)',
          border: '1px solid rgba(45,63,74,0.1)',
          fontSize: 12, color: T.navy, lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 12 }}>
          🔗 {data.english_link}
        </div>
      )}

      {/* 妈妈台词折叠 */}
      <motion.div whileTap={{ scale: 0.98 }}
        onClick={() => setShowMom(o => !o)}
        style={{ padding: '12px 16px', borderRadius: 14,
          background: showMom ? 'rgba(164,99,85,0.08)' : '#f7f4ee',
          border: `1px solid ${showMom ? 'rgba(164,99,85,0.35)' : 'rgba(164,99,85,0.2)'}`,
          cursor: 'pointer', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700,
          color: '#5a5a4a', fontFamily: 'sans-serif' }}>
          👩 妈妈台词
        </span>
        <motion.span animate={{ rotate: showMom ? 180 : 0 }}
          style={{ fontSize: 14, color: '#8a7355',
            display: 'inline-block' }}>⌄</motion.span>
      </motion.div>

      <AnimatePresence>
        {showMom && data.mom_script && (
          <motion.div initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 12 }}>
            <div style={MOM_SCRIPT_BOX}>
              <div style={{ fontSize: 14, color: '#2d322f', lineHeight: 2,
                fontStyle: 'italic', fontFamily: 'sans-serif' }}>
                「{data.mom_script}」
              </div>
              {(data.mom_questions || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {data.mom_questions.map((q: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8,
                      marginBottom: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%',
                        background: '#8a7355', color: '#fff',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10,
                        flexShrink: 0, marginTop: 2,
                        fontFamily: 'sans-serif' }}>{i + 1}</div>
                      <div style={{ fontSize: 12, color: '#5a5a4a',
                        lineHeight: 1.75, fontFamily: 'sans-serif' }}>{q}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext} style={PRIMARY_BTN}>
        明白了 →
      </motion.button>
    </div>
  )
}

// ── 第三步：描红练字（逐画引导 + Canvas手写）──
function StepWrite({ data, char, canvasRef, onNext }: {
  data: any; char: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onNext: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  const [activeStroke, setActiveStroke] = useState(0)
  const [completedStrokes, setCompletedStrokes] = useState<number[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const { speak } = useApp()

  const strokes = data.stroke_order || []
  const strokeCount = data.stroke_count || strokes.length
  const currentStroke = strokes[activeStroke]
  const strokeInfo = currentStroke ? getStrokeInfo(currentStroke) : null
  const allDone = completedStrokes.length >= strokes.length && strokes.length > 0

  // 每次切换笔画时语音播报
  useEffect(() => {
    if (currentStroke && strokeInfo) {
      speak(`第${activeStroke + 1}画，${currentStroke}，${strokeInfo.desc}`)
    }
  }, [activeStroke])

  const handleStrokeDone = () => {
    const newCompleted = [...completedStrokes, activeStroke]
    setCompletedStrokes(newCompleted)
    if (activeStroke < strokes.length - 1) {
      setActiveStroke(s => s + 1)
    } else {
      setShowCelebration(true)
      speak(`太棒了！${char}这个字你写完了，共${strokeCount}画！`)
    }
  }


  // 初始化 Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const size = Math.min(window.innerWidth - 80, 280)
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawTianZiGrid(ctx, size, char)
  }, [char])

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    setHasDrawn(true)
    setShowGuide(false)
    const pos = getPos(e, canvas)
    lastPos.current = pos
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#2d322f'
    ctx.fill()
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#2d322f'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const endDraw = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = canvas.width
    drawTianZiGrid(ctx, size, char)
    setHasDrawn(false)
    setShowGuide(true)
  }

  const voiceText = data.writing_guide || `${char}，共${strokeCount}画`

  return (
    <div style={{ padding: '0 24px' }}>

      {/* 当前笔画大卡（孩子抬头看）*/}
      <AnimatePresence mode="wait">
        {!allDone && !showCelebration ? (
          <motion.div key={activeStroke}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ ...GLASS_CARD, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#a46355',
                  fontFamily: 'sans-serif', fontWeight: 700 }}>
                  第 {activeStroke + 1} 画 / 共 {strokeCount || strokes.length} 画
                </span>
                <span style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif",
                  color: '#a46355', fontWeight: 700 }}>
                  {currentStroke}
                </span>
              </div>
              <VoiceControl text={voiceText} />
            </div>
            {strokeInfo && (
              <>
                <div style={{ fontSize: 15, color: '#2d322f', fontFamily: 'sans-serif',
                  marginBottom: 4, fontWeight: 500 }}>
                  {strokeInfo.icon} {strokeInfo.desc}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)',
                  fontFamily: 'sans-serif' }}>
                  方向：{strokeInfo.direction}
                </div>
              </>
            )}
            {/* 进度条 */}
            <div style={{ ...PROGRESS_TRACK, marginTop: 10 }}>
              <motion.div
                animate={{ width: `${(completedStrokes.length / Math.max(strokes.length, 1)) * 100}%` }}
                style={PROGRESS_FILL} />
            </div>
          </motion.div>
        ) : showCelebration ? (
          <motion.div key="celebration"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ padding: '16px', borderRadius: 16, textAlign: 'center',
              background: 'rgba(164,99,85,0.08)',
              border: '1px solid rgba(164,99,85,0.2)',
              marginBottom: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🌟</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#a46355',
              fontFamily: "'Noto Serif SC', serif" }}>
              写完了！共 {strokeCount} 画
            </div>
            <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)',
              fontFamily: 'sans-serif', marginTop: 4 }}>
              你的手迹会出现在学习卡片上
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 所有笔画小标签 */}
      {strokes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {strokes.map((s: string, i: number) => (
            <span key={i}
              onClick={() => { setActiveStroke(i); setShowCelebration(false) }}
              style={{ padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                background: completedStrokes.includes(i)
                  ? 'rgba(164,99,85,0.12)'
                  : i === activeStroke
                    ? '#a46355' : 'rgba(164,99,85,0.08)',
                border: `1px solid ${completedStrokes.includes(i)
                  ? 'rgba(164,99,85,0.25)'
                  : i === activeStroke ? '#a46355' : 'rgba(164,99,85,0.2)'}`,
                fontSize: 11,
                color: completedStrokes.includes(i)
                  ? '#a46355'
                  : i === activeStroke ? '#fff' : '#5a5a4a',
                fontFamily: 'sans-serif', transition: 'all 0.2s',
                fontWeight: i === activeStroke ? 700 : 400 }}>
              {completedStrokes.includes(i) ? '✓' : i + 1}. {s}
            </span>
          ))}
        </div>
      )}

      {/* Canvas 田字格（下方，孩子低头写）*/}
      <motion.div ref={containerRef} style={{ display: 'flex',
        justifyContent: 'center', marginBottom: 12, position: 'relative' }}>
        <div style={CANVAS_GRID_WRAP}>
        <canvas ref={canvasRef}
          style={{
            borderRadius: 14,
            boxShadow: '0 8px 28px rgba(45,50,47,0.08)',
            touchAction: 'none',
            cursor: 'crosshair',
            display: 'block',
            width: Math.min(window.innerWidth - 80, 280),
            height: Math.min(window.innerWidth - 80, 280),
          }}
          onMouseDown={startDraw} onMouseMove={draw}
          onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw}
          onTouchEnd={endDraw} />
        </div>
        {showGuide && (
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12, color: 'rgba(45,50,47,0.45)', fontFamily: 'sans-serif',
              textAlign: 'center', pointerEvents: 'none',
              background: 'rgba(253,251,247,0.7)',
              padding: '4px 10px', borderRadius: 8 }}>
            手指描红
          </motion.div>
        )}
      </motion.div>

      {/* 按钮区 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={clearCanvas}
          style={{ flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid rgba(164,99,85,0.3)`,
            background: 'transparent', fontSize: 13,
            color: '#5a5a4a', cursor: 'pointer',
            fontFamily: 'sans-serif' }}>
          🗑 重写
        </motion.button>

        {strokes.length > 0 && !allDone && !showCelebration && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleStrokeDone}
            style={{ flex: 2, padding: '12px', borderRadius: 12,
              border: 'none', background: '#8a7355',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'sans-serif',
              boxShadow: '0 3px 12px rgba(164,99,85,0.3)' }}>
            这画写好了 ✓
          </motion.button>
        )}

        <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
          style={{ flex: 2, padding: '12px', borderRadius: 12,
            border: 'none',
            background: (hasDrawn || showCelebration) ? '#a46355' : 'rgba(164,99,85,0.3)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: (hasDrawn || showCelebration) ? 'pointer' : 'default',
            fontFamily: "'Noto Serif SC', serif",
            boxShadow: (hasDrawn || showCelebration)
              ? '0 4px 16px rgba(164,99,85,0.3)' : 'none',
            transition: 'all 0.3s' }}>
          {showCelebration ? '继续 →' : hasDrawn ? '写好了 →' : '跳过 →'}
        </motion.button>
      </div>
    </div>
  )
}

// ── 分享卡片生成（宣纸手账 × 书卷极简）──
async function generateCard(
  char: string,
  pinyin: string,
  meaning: string,
  sentence: string,
  childName: string,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  city?: string,
  childAge?: string,
  culturalStory?: string,
): Promise<string> {
  void canvasRef
  void childAge

  await document.fonts.ready

  const W = 750
  const H = 1334
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cardCanvas = document.createElement('canvas')
  cardCanvas.width = W * dpr
  cardCanvas.height = H * dpr
  const ctx = cardCanvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // 背景
  ctx.fillStyle = '#faf7f2'
  ctx.fillRect(0, 0, W, H)

  // 左侧装饰线
  ctx.fillStyle = '#a46355'
  ctx.fillRect(0, 0, 5, H)

  // 顶部品牌栏
  ctx.fillStyle = 'rgba(164,99,85,0.07)'
  ctx.fillRect(0, 0, W, 72)
  ctx.fillStyle = '#a46355'
  ctx.font = '400 17px "Noto Serif SC", serif'
  ctx.textAlign = 'left'
  ctx.fillText('根 · 中文', 28, 44)
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  ctx.fillStyle = 'rgba(45,50,47,0.35)'
  ctx.font = '300 14px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(today, W - 28, 44)

  // 主字背景圆
  ctx.fillStyle = 'rgba(164,99,85,0.07)'
  ctx.beginPath()
  ctx.arc(W / 2, 220, 140, 0, Math.PI * 2)
  ctx.fill()

  // 主字
  ctx.fillStyle = '#a46355'
  ctx.font = '900 210px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText(char, W / 2, 305)

  // 拼音
  ctx.fillStyle = 'rgba(45,50,47,0.5)'
  ctx.font = '300 30px sans-serif'
  ctx.fillText(pinyin, W / 2, 352)

  // 释义
  ctx.fillStyle = 'rgba(45,50,47,0.55)'
  ctx.font = '400 22px "Noto Serif SC", serif'
  ctx.fillText(meaning.slice(0, 18), W / 2, 392)

  // 分隔
  ctx.strokeStyle = 'rgba(164,99,85,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(60, 415); ctx.lineTo(W - 60, 415); ctx.stroke()
  ctx.fillStyle = '#a46355'
  ctx.font = '13px serif'
  ctx.fillText('◆', W / 2, 426)

  // 字形演变标题
  ctx.fillStyle = 'rgba(45,50,47,0.38)'
  ctx.font = '300 13px sans-serif'
  ctx.fillText('— 字形演变 —', W / 2, 452)

  // 演变五阶
  const stages = [
    { label: '甲骨文', alpha: 0.2, size: 20 },
    { label: '金文', alpha: 0.35, size: 23 },
    { label: '小篆', alpha: 0.52, size: 26 },
    { label: '隶书', alpha: 0.72, size: 29 },
    { label: '楷书', alpha: 1.0, size: 33 },
  ]
  const sw = (W - 80) / 5
  stages.forEach((s, i) => {
    const x = 40 + sw * i + sw / 2
    ctx.fillStyle = `rgba(164,99,85,${s.alpha})`
    ctx.font = `${i === 4 ? '700' : '400'} ${s.size}px "Noto Serif SC", serif`
    ctx.textAlign = 'center'
    ctx.fillText(char, x, 500)
    ctx.fillStyle = 'rgba(45,50,47,0.3)'
    ctx.font = '10px sans-serif'
    ctx.fillText(s.label, x, 522)
    if (i < 4) {
      ctx.fillStyle = 'rgba(164,99,85,0.22)'
      ctx.font = '14px sans-serif'
      ctx.fillText('›', x + sw / 2, 497)
    }
  })

  // 分隔
  ctx.strokeStyle = 'rgba(164,99,85,0.12)'
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(60, 540); ctx.lineTo(W - 60, 540); ctx.stroke()

  // 造句标题
  ctx.fillStyle = 'rgba(45,50,47,0.38)'
  ctx.font = '300 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('— 情境造句 —', W / 2, 564)

  // 造句区背景
  ctx.fillStyle = 'rgba(164,99,85,0.04)'
  ctx.beginPath()
  ctx.roundRect(40, 575, W - 80, 200, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(164,99,85,0.12)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 左引号
  ctx.fillStyle = 'rgba(164,99,85,0.22)'
  ctx.font = '700 52px "Noto Serif SC", serif'
  ctx.textAlign = 'left'
  ctx.fillText('「', 32, 640)

  // 造句文字
  ctx.fillStyle = '#2d322f'
  ctx.font = '400 36px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  const maxLW = W - 170
  const sc = sentence.split('')
  let sLine = '', sY = 630, sCount = 0
  for (const c of sc) {
    const test = sLine + c
    if (ctx.measureText(test).width > maxLW && sLine) {
      if (sCount === 2) { ctx.fillText(sLine + '…', W / 2, sY); sLine = ''; break }
      ctx.fillText(sLine, W / 2, sY)
      sLine = c; sY += 52; sCount++
    } else { sLine = test }
  }
  if (sLine) ctx.fillText(sLine, W / 2, sY)

  // 右引号
  ctx.fillStyle = 'rgba(164,99,85,0.22)'
  ctx.font = '700 52px "Noto Serif SC", serif'
  ctx.textAlign = 'right'
  ctx.fillText('」', W - 32, sY + 18)

  const afterS = Math.max(sY + 60, 790)

  // 分隔
  ctx.strokeStyle = 'rgba(164,99,85,0.12)'
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(60, afterS); ctx.lineTo(W - 60, afterS); ctx.stroke()

  // 文化贴士标题
  ctx.fillStyle = 'rgba(45,50,47,0.38)'
  ctx.font = '300 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('— 文化小贴士 —', W / 2, afterS + 24)

  // 贴士背景
  ctx.fillStyle = 'rgba(92,122,94,0.05)'
  ctx.beginPath()
  ctx.roundRect(40, afterS + 34, W - 80, 100, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(92,122,94,0.18)'
  ctx.lineWidth = 0.8
  ctx.stroke()

  // 贴士内容
  const tip = culturalStory
    ? culturalStory.replace(/[\n\r]/g, ' ').slice(0, 52) + (culturalStory.length > 52 ? '…' : '')
    : `「${char}」承载着中华文化的智慧与美好。`
  ctx.fillStyle = 'rgba(45,50,47,0.62)'
  ctx.font = '400 20px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  const tc = tip.split('')
  let tLine = '', tY = afterS + 72, tCount = 0
  for (const c of tc) {
    const test = tLine + c
    if (ctx.measureText(test).width > W - 130 && tLine) {
      ctx.fillText(tLine, W / 2, tY)
      tLine = c; tY += 30; tCount++
      if (tCount >= 2) break
    } else { tLine = test }
  }
  if (tCount < 2 && tLine) ctx.fillText(tLine, W / 2, tY)

  // 底部区
  ctx.fillStyle = 'rgba(164,99,85,0.06)'
  ctx.fillRect(0, H - 148, W, 148)
  ctx.strokeStyle = 'rgba(164,99,85,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0, H - 148); ctx.lineTo(W, H - 148); ctx.stroke()

  const dName = childName || '小朋友'
  ctx.fillStyle = '#2d322f'
  ctx.font = '600 25px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${dName} 学会了「${char}」`, W / 2, H - 104)

  const cName = city && city.length < 12 ? city : ''
  ctx.fillStyle = 'rgba(45,50,47,0.38)'
  ctx.font = '300 17px sans-serif'
  ctx.fillText(cName ? `${cName} · ${today}` : today, W / 2, H - 74)

  ctx.fillStyle = 'rgba(164,99,85,0.4)'
  ctx.font = '300 14px "Noto Serif SC", serif'
  ctx.fillText('让中文的根，扎在异乡的土地上', W / 2, H - 44)

  return cardCanvas.toDataURL('image/png', 0.95)
}

// ── 第四步：我会用了（语音输入 + 分享卡片）──
function StepUse({ data, char, childName, canvasRef, onComplete, onBottomBarChange }: {
  data: any; char: string; childName?: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onComplete: (s: string) => void
  onBottomBarChange?: (node: React.ReactNode) => void
}) {
  const { speak } = useApp()
  const [sentence, setSentence] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [cardUrl, setCardUrl] = useState<string | null>(null)
  const [aiComment, setAiComment] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef<any>(null)

  const voiceText = childName
    ? `${childName}，用「${char}」说一件今天发生的事吧！`
    : `用「${char}」说一件今天发生的事！`

  // 语音输入
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition
      || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast('你的浏览器不支持语音输入，请手动输入', 'info')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setSentence(text)
      setIsRecording(false)
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  // AI 评价 + 生成卡片
  const handleComplete = async () => {
    if (!sentence.trim()) {
      onComplete(sentence)
      return
    }
    setLoading(true)
    try {
      // AI 评价 - 走后端
      const res = await fetchWithAuth('/api/rian/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `请评价这个造句：孩子名字「${childName || '小朋友'}」，学的字「${char}」，造的句子「${sentence}」。用2句话：先鼓励，再指出亮点。温暖口语化，像邻居大姐说话。只输出评价文字，不要其他格式。`,
          context: `中文学习造句评价`,
          history: [],
        }),
      })
      const aiData = await res.json()
      const comment = aiData.reply || '你的造句很棒！继续加油！'
      setAiComment(comment)
      speak(comment)

      // 生成卡片
      const url = await generateCard(
        char,
        data.pinyin || '',
        data.meaning || '',
        sentence,
        childName || '孩子',
        canvasRef,
        data.scene || '',
        '',
        data.cultural_story || data.story || '',
      )
      setCardUrl(url)
    } catch {
      setAiComment('你的造句很棒！继续加油！')
      speak('你的造句很棒！')
    } finally {
      setLoading(false)
    }
  }

  // 下载卡片
  const downloadCard = () => {
    if (!cardUrl) return
    const a = document.createElement('a')
    a.href = cardUrl
    a.download = `${childName || '孩子'}_学会了_${char}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.png`
    a.click()
  }

  // 分享卡片（微信/相册）
  const shareCard = async () => {
    if (!cardUrl) return
    try {
      const blob = await (await fetch(cardUrl)).blob()
      const file = new File([blob],
        `${childName || '孩子'}_学会了_${char}.png`,
        { type: 'image/png' })
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${childName || '孩子'}今天学会了「${char}」！`,
          text: `用根·中文，${childName || '孩子'}今天完成了「${char}」的字源溯源、六书解构、笔顺临摹和情境造句！`,
        })
      } else {
        downloadCard()
      }
    } catch (e) {
      downloadCard()
    }
  }

  const shareFooter = cardUrl ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, margin: '0 auto' }}>
      <motion.button whileTap={{ scale: 0.96 }} onClick={shareCard}
        style={{ width: '100%', padding: '14px', borderRadius: 14,
          border: 'none', background: '#a46355', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(164,99,85,0.3)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8 }}>
        <span>📤</span> 分享给家人
      </motion.button>
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button whileTap={{ scale: 0.96 }} onClick={downloadCard}
          style={{ flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid rgba(164,99,85,0.4)`,
            background: 'transparent', fontSize: 13,
            color: '#5a5a4a', cursor: 'pointer',
            fontFamily: 'sans-serif' }}>
          💾 保存到相册
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }}
          onClick={() => onComplete(sentence)}
          style={{ flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid ${'#8a7355'}`, background: 'transparent',
            fontSize: 13, color: '#8a7355', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'sans-serif' }}>
          完成学习
        </motion.button>
      </div>
    </div>
  ) : (
    <motion.button whileTap={{ scale: 0.96 }} onClick={handleComplete}
      disabled={loading}
      style={{
        ...PRIMARY_BTN,
        background: sentence.trim()
          ? 'linear-gradient(135deg, #5c7a5e 0%, #4a6650 100%)'
          : PRIMARY_BTN.background,
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'default' : 'pointer',
        boxShadow: sentence.trim()
          ? '0 6px 20px rgba(92,122,94,0.28)'
          : PRIMARY_BTN.boxShadow,
        transition: 'background 0.3s, box-shadow 0.3s',
        maxWidth: 360,
        margin: '0 auto',
      }}>
      {loading ? '生成中...' : sentence.trim() ? '🌟 生成学习卡片' : '跳过完成'}
    </motion.button>
  )

  useEffect(() => {
    onBottomBarChange?.(shareFooter)
    return () => { onBottomBarChange?.(null) }
  }, [onBottomBarChange, cardUrl, loading, sentence, isRecording])

  if (cardUrl) {
    return (
      <div style={{ padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.45)', marginBottom: 12,
            fontFamily: 'sans-serif' }}>
            🎉 今日学习完成！
          </div>

          <img src={cardUrl} alt="学习卡片"
            style={{ width: '100%', maxWidth: 320, borderRadius: 16,
              boxShadow: '0 8px 32px rgba(26,18,8,0.15)', marginBottom: 16 }} />

          {aiComment && (
            <div style={{ padding: '14px 16px', borderRadius: 14,
              background: 'rgba(164,99,85,0.08)',
              border: '1px solid rgba(164,99,85,0.2)',
              fontSize: 14, color: '#5c7a5e', lineHeight: 1.8,
              fontFamily: 'sans-serif', marginBottom: 16, textAlign: 'left' }}>
              🌟 {aiComment}
            </div>
          )}
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#2d322f',
          fontFamily: 'sans-serif' }}>
          用「<span style={{ color: '#a46355',
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 20 }}>{char}</span>」造一个句子
        </div>
        <VoiceControl text={voiceText} />
      </div>

      {data.scene && (
        <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)', lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 12,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(164,99,85,0.06)' }}>
          🌍 {data.scene}
        </div>
      )}

      {/* 语音输入区 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <textarea value={sentence}
          onChange={e => setSentence(e.target.value)}
          onFocus={(e) => {
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 300)
          }}
          placeholder={`孩子说，妈妈帮忙打\n或者按话筒让孩子直接说`}
          rows={3}
          style={{ flex: 1, padding: '14px', borderRadius: 14,
            border: '1px solid rgba(164,99,85,0.15)',
            background: 'rgba(255,255,255,0.85)', fontSize: 15,
            color: '#2d322f', fontFamily: "'Noto Serif SC', serif",
            lineHeight: 1.7, outline: 'none', resize: 'none',
            boxSizing: 'border-box' as const,
            textAlign: 'left' }} />
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={isRecording ? stopRecording : startRecording}
          animate={isRecording ? {
            boxShadow: ['0 0 0 0 rgba(164,99,85,0.4)',
              '0 0 0 12px rgba(164,99,85,0)',
              '0 0 0 0 rgba(164,99,85,0)']
          } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ width: 56, borderRadius: 14, border: 'none',
            background: isRecording ? '#a46355' : 'rgba(164,99,85,0.1)',
            color: isRecording ? '#fff' : '#a46355',
            fontSize: 24, cursor: 'pointer',
            flexShrink: 0, alignSelf: 'stretch' }}>
          {isRecording ? '⏹' : '🎤'}
        </motion.button>
      </div>

      {isRecording && (
        <div style={{ fontSize: 12, color: '#a46355', textAlign: 'center',
          fontFamily: 'sans-serif', marginBottom: 8 }}>
          正在听孩子说话...
        </div>
      )}
    </div>
  )
}

// ── 主组件 ──
export default function LearnSession({
  data, char, childName, onComplete, onClose
}: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bottomBar, setBottomBar] = useState<React.ReactNode>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const step = STEPS[currentStep]

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }, [currentStep])

  useEffect(() => {
    if (currentStep !== 3) setBottomBar(null)
  }, [currentStep])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#fbf9f6',
        backgroundImage: `
    radial-gradient(at 80% 10%, rgba(228,237,228,0.3) 0px, transparent 50%),
    radial-gradient(at 20% 90%, rgba(245,214,209,0.2) 0px, transparent 50%)
  `,
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
      }}>

      {/* 顶部导航 */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(251,249,246,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(45,50,47,0.06)',
        padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none',
            fontSize: 13, color: 'rgba(45,50,47,0.45)',
            cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ← 退出
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2d322f',
          fontFamily: "'Noto Serif SC', serif" }}>
          {step.emoji} {step.label}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(45,50,47,0.45)',
          fontFamily: 'sans-serif' }}>
          {currentStep + 1} / {STEPS.length}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <ProgressBar current={currentStep} />
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 12 }}>
        <AnimatePresence mode="wait">
          <motion.div key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}>
            {currentStep === 0 && (
              <StepOrigin data={data} char={char} onNext={next} />
            )}
            {currentStep === 1 && (
              <StepStructure data={data} char={char} onNext={next} />
            )}
            {currentStep === 2 && (
              <StepWrite data={data} char={char}
                canvasRef={canvasRef} onNext={next} />
            )}
            {currentStep === 3 && (
              <StepUse data={data} char={char}
                childName={childName} canvasRef={canvasRef}
                onComplete={onComplete}
                onBottomBarChange={setBottomBar} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {currentStep === 3 && bottomBar && (
        <div style={{
          flexShrink: 0,
          padding: '12px 16px',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          background: 'rgba(251,249,246,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(45,50,47,0.06)',
        }}>
          {bottomBar}
        </div>
      )}
    </motion.div>
  )
}
