'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'

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
        background: playing ? 'rgba(192,57,43,0.15)' : 'rgba(200,160,96,0.1)',
        border: `1px solid ${playing ? T.red : 'rgba(200,160,96,0.3)'}`,
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
          <div style={{ width: '100%', height: 4, borderRadius: 2,
            background: i <= current ? T.red : 'rgba(192,57,43,0.12)',
            transition: 'background 0.3s' }} />
          <span style={{ fontSize: 10,
            color: i === current ? T.red : T.textDim,
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
          <div style={{ fontSize: 96, fontFamily: "'Noto Serif SC', serif",
            color: T.text, lineHeight: 1 }}>{char}</div>
          <div style={{ fontSize: 13, color: T.textDim,
            fontFamily: 'sans-serif', marginTop: 4 }}>{data.pinyin}</div>
        </motion.div>
        <VoiceControl text={voiceText} />
      </div>

      {/* 演变阶段 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T.red, letterSpacing: 3,
          marginBottom: 10, fontFamily: 'sans-serif' }}>🏺 造字演变</div>

        {/* 阶段选择器 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {stages.map((s: any, i: number) => (
            <motion.button key={i} whileTap={{ scale: 0.95 }}
              onClick={() => setActiveStage(i)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 10,
                border: `1px solid ${i === activeStage ? T.red : 'rgba(200,160,96,0.2)'}`,
                background: i === activeStage ? 'rgba(192,57,43,0.08)' : T.paper,
                cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: i === activeStage ? 26 : 20,
                fontFamily: "'Noto Serif SC', serif",
                color: i === activeStage ? T.red : T.textMid,
                lineHeight: 1, marginBottom: 4,
                opacity: i === activeStage ? 1 : 0.5 + i * 0.2 }}>
                {s.form}
              </div>
              <div style={{ fontSize: 9, color: i === activeStage ? T.red : T.textDim,
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
                color: i === activeStage ? T.red : T.textMid,
                opacity: i === activeStage ? 1 : 0.4,
                transition: 'all 0.2s' }}>{s.form}</div>
              {i < stages.length - 1 && (
                <div style={{ fontSize: 14, color: T.textDim }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 当前阶段说明 */}
        <AnimatePresence mode="wait">
          <motion.div key={activeStage}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            style={{ padding: '14px 16px', borderRadius: 12,
              background: 'rgba(192,57,43,0.05)',
              borderLeft: '3px solid rgba(192,57,43,0.3)',
              fontSize: 14, color: T.text, lineHeight: 1.9,
              fontFamily: 'sans-serif' }}>
            <strong style={{ color: T.red }}>{stages[activeStage].stage}</strong>
            {' '}——{' '}{stages[activeStage].desc}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* memory trick */}
      {data.memory_trick && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ padding: '12px 16px', borderRadius: 12,
            background: 'rgba(200,160,96,0.08)',
            border: '1px solid rgba(200,160,96,0.2)',
            fontSize: 14, color: T.gold, fontStyle: 'italic',
            fontFamily: 'sans-serif', marginBottom: 16 }}>
          🎵 {data.memory_trick}
        </motion.div>
      )}

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none', background: T.red, color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        我明白了 →
      </motion.button>
    </div>
  )
}

// ── 六书颜色 ──
const LIUSHU_CFG: Record<string, { color: string; bg: string; desc: string }> = {
  '象形': { color: '#C03A2B', bg: 'rgba(192,57,43,0.08)', desc: '照着东西的样子画出来' },
  '指事': { color: '#BA6A00', bg: 'rgba(186,106,0,0.08)', desc: '用符号指示抽象概念' },
  '会意': { color: '#2D6A4F', bg: 'rgba(45,106,79,0.08)', desc: '两个或多个部件合起来表意' },
  '形声': { color: '#1A3C5E', bg: 'rgba(26,60,94,0.08)', desc: '一部分表意，一部分表音' },
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
  const parts = data.parts || []

  const voiceText = data.mom_script
    ? data.mom_script
    : parts.map((p: any) => `${p.char}，${p.name}，${p.image || ''}`).join('。')

  return (
    <div style={{ padding: '0 24px' }}>

      {/* 顶部：字 + 语音 */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 72, fontFamily: "'Noto Serif SC', serif",
          color: T.text, lineHeight: 1 }}>{char}</div>
        <VoiceControl text={voiceText} />
      </div>

      {/* 六书分类 */}
      {data.liushu && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 20,
            background: LIUSHU_CFG[data.liushu.type]?.bg || 'rgba(200,160,96,0.08)',
            border: `1px solid ${LIUSHU_CFG[data.liushu.type]?.color || T.gold}44`,
            marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700,
              color: LIUSHU_CFG[data.liushu.type]?.color || T.gold,
              fontFamily: "'Noto Serif SC', serif" }}>
              {data.liushu.type}
            </span>
            <span style={{ fontSize: 11, color: T.textDim, fontFamily: 'sans-serif' }}>
              {LIUSHU_CFG[data.liushu.type]?.desc || ''}
            </span>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: 12,
            background: LIUSHU_CFG[data.liushu.type]?.bg || 'rgba(200,160,96,0.06)',
            borderLeft: `3px solid ${LIUSHU_CFG[data.liushu.type]?.color || T.gold}`,
            fontSize: 13, color: T.text, lineHeight: 1.9,
            fontFamily: 'sans-serif' }}>
            {data.liushu.explanation}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif',
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
                background: activeIdx === i ? 'rgba(192,57,43,0.1)' : T.paper,
                border: `1.5px solid ${activeIdx === i
                  ? 'rgba(192,57,43,0.4)' : 'rgba(200,160,96,0.25)'}`,
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', minWidth: 70 }}>
              <div style={{ fontSize: 32, fontFamily: "'Noto Serif SC', serif",
                color: T.red, lineHeight: 1 }}>{p.char}</div>
              <div style={{ fontSize: 10, color: T.textDim,
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
              background: 'rgba(192,57,43,0.06)',
              borderLeft: '3px solid rgba(192,57,43,0.3)',
              fontSize: 13, color: T.text, lineHeight: 1.8,
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
          background: 'rgba(26,60,94,0.05)',
          border: '1px solid rgba(26,60,94,0.1)',
          fontSize: 12, color: T.navy, lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 12 }}>
          🔗 {data.english_link}
        </div>
      )}

      {/* 妈妈台词折叠 */}
      <motion.div whileTap={{ scale: 0.98 }}
        onClick={() => setShowMom(o => !o)}
        style={{ padding: '12px 16px', borderRadius: 14,
          background: showMom ? 'rgba(200,160,96,0.08)' : T.paper,
          border: `1px solid ${showMom ? 'rgba(200,160,96,0.35)' : 'rgba(200,160,96,0.2)'}`,
          cursor: 'pointer', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700,
          color: T.textMid, fontFamily: 'sans-serif' }}>
          👩 妈妈台词
        </span>
        <motion.span animate={{ rotate: showMom ? 180 : 0 }}
          style={{ fontSize: 14, color: T.gold,
            display: 'inline-block' }}>⌄</motion.span>
      </motion.div>

      <AnimatePresence>
        {showMom && data.mom_script && (
          <motion.div initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '16px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.04))',
              border: '1px solid rgba(200,160,96,0.25)' }}>
              <div style={{ fontSize: 14, color: T.text, lineHeight: 2,
                fontStyle: 'italic', fontFamily: 'sans-serif' }}>
                「{data.mom_script}」
              </div>
              {(data.mom_questions || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {data.mom_questions.map((q: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8,
                      marginBottom: 6, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%',
                        background: T.gold, color: '#fff',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10,
                        flexShrink: 0, marginTop: 2,
                        fontFamily: 'sans-serif' }}>{i + 1}</div>
                      <div style={{ fontSize: 12, color: T.textMid,
                        lineHeight: 1.75, fontFamily: 'sans-serif' }}>{q}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none', background: T.red, color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
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
    // 白色背景
    ctx.fillStyle = '#FDFBF7'
    ctx.fillRect(0, 0, size, size)
    // 田字格
    ctx.strokeStyle = 'rgba(200,160,96,0.4)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(2, 2, size - 4, size - 4)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = 'rgba(200,160,96,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(size / 2, 2); ctx.lineTo(size / 2, size - 2)
    ctx.moveTo(2, size / 2); ctx.lineTo(size - 2, size / 2)
    ctx.stroke()
    ctx.setLineDash([])
    // 描红底字（淡色）
    ctx.font = `${size * 0.75}px "Noto Serif SC", serif`
    ctx.fillStyle = 'rgba(192,57,43,0.08)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, size / 2, size / 2)
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
    ctx.fillStyle = '#1A1208'
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
    ctx.strokeStyle = '#1A1208'
    ctx.lineWidth = 3.5
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
    ctx.fillStyle = '#FDFBF7'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(200,160,96,0.4)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(2, 2, size - 4, size - 4)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = 'rgba(200,160,96,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(size / 2, 2); ctx.lineTo(size / 2, size - 2)
    ctx.moveTo(2, size / 2); ctx.lineTo(size - 2, size / 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.font = `${size * 0.75}px "Noto Serif SC", serif`
    ctx.fillStyle = 'rgba(192,57,43,0.08)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, size / 2, size / 2)
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
            style={{ padding: '14px 16px', borderRadius: 16,
              background: 'rgba(192,57,43,0.06)',
              border: '1px solid rgba(192,57,43,0.2)',
              marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: T.red,
                  fontFamily: 'sans-serif', fontWeight: 700 }}>
                  第 {activeStroke + 1} 画 / 共 {strokeCount || strokes.length} 画
                </span>
                <span style={{ fontSize: 18, fontFamily: "'Noto Serif SC', serif",
                  color: T.red, fontWeight: 700 }}>
                  {currentStroke}
                </span>
              </div>
              <VoiceControl text={voiceText} />
            </div>
            {strokeInfo && (
              <>
                <div style={{ fontSize: 15, color: T.text, fontFamily: 'sans-serif',
                  marginBottom: 4, fontWeight: 500 }}>
                  {strokeInfo.icon} {strokeInfo.desc}
                </div>
                <div style={{ fontSize: 12, color: T.textDim,
                  fontFamily: 'sans-serif' }}>
                  方向：{strokeInfo.direction}
                </div>
              </>
            )}
            {/* 进度条 */}
            <div style={{ marginTop: 10, height: 4, borderRadius: 2,
              background: 'rgba(192,57,43,0.1)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(completedStrokes.length / Math.max(strokes.length, 1)) * 100}%` }}
                style={{ height: '100%', background: T.red, borderRadius: 2 }} />
            </div>
          </motion.div>
        ) : showCelebration ? (
          <motion.div key="celebration"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ padding: '16px', borderRadius: 16, textAlign: 'center',
              background: 'rgba(45,106,79,0.08)',
              border: '1px solid rgba(45,106,79,0.3)',
              marginBottom: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🌟</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2D6A4F',
              fontFamily: "'Noto Serif SC', serif" }}>
              写完了！共 {strokeCount} 画
            </div>
            <div style={{ fontSize: 12, color: T.textDim,
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
                  ? 'rgba(45,106,79,0.1)'
                  : i === activeStroke
                    ? T.red : 'rgba(200,160,96,0.08)',
                border: `1px solid ${completedStrokes.includes(i)
                  ? 'rgba(45,106,79,0.3)'
                  : i === activeStroke ? T.red : 'rgba(200,160,96,0.2)'}`,
                fontSize: 11,
                color: completedStrokes.includes(i)
                  ? '#2D6A4F'
                  : i === activeStroke ? '#fff' : T.textMid,
                fontFamily: 'sans-serif', transition: 'all 0.2s',
                fontWeight: i === activeStroke ? 700 : 400 }}>
              {completedStrokes.includes(i) ? '✓' : i + 1}. {s}
            </span>
          ))}
        </div>
      )}

      {/* Canvas 田字格（下方，孩子低头写）*/}
      <div ref={containerRef} style={{ display: 'flex',
        justifyContent: 'center', marginBottom: 12, position: 'relative' }}>
        <canvas ref={canvasRef}
          style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(26,18,8,0.1)',
            touchAction: 'none', cursor: 'crosshair',
            width: Math.min(window.innerWidth - 80, 280),
            height: Math.min(window.innerWidth - 80, 280) }}
          onMouseDown={startDraw} onMouseMove={draw}
          onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw}
          onTouchEnd={endDraw} />
        {showGuide && (
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12, color: T.textDim, fontFamily: 'sans-serif',
              textAlign: 'center', pointerEvents: 'none',
              background: 'rgba(253,251,247,0.7)',
              padding: '4px 10px', borderRadius: 8 }}>
            手指描红
          </motion.div>
        )}
      </div>

      {/* 按钮区 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={clearCanvas}
          style={{ flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid rgba(200,160,96,0.3)`,
            background: 'transparent', fontSize: 13,
            color: T.textMid, cursor: 'pointer',
            fontFamily: 'sans-serif' }}>
          🗑 重写
        </motion.button>

        {strokes.length > 0 && !allDone && !showCelebration && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleStrokeDone}
            style={{ flex: 2, padding: '12px', borderRadius: 12,
              border: 'none', background: T.gold,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'sans-serif',
              boxShadow: '0 3px 12px rgba(200,160,96,0.3)' }}>
            这画写好了 ✓
          </motion.button>
        )}

        <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
          style={{ flex: 2, padding: '12px', borderRadius: 12,
            border: 'none',
            background: (hasDrawn || showCelebration) ? T.red : 'rgba(192,57,43,0.3)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: (hasDrawn || showCelebration) ? 'pointer' : 'default',
            fontFamily: "'Noto Serif SC', serif",
            boxShadow: (hasDrawn || showCelebration)
              ? '0 4px 16px rgba(192,57,43,0.3)' : 'none',
            transition: 'all 0.3s' }}>
          {showCelebration ? '继续 →' : hasDrawn ? '写好了 →' : '跳过 →'}
        </motion.button>
      </div>
    </div>
  )
}

// ── 分享卡片生成 ──
function generateCard(
  char: string,
  pinyin: string,
  meaning: string,
  sentence: string,
  childName: string,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): string {
  const cardCanvas = document.createElement('canvas')
  const W = 750; const H = 1050
  cardCanvas.width = W; cardCanvas.height = H
  const ctx = cardCanvas.getContext('2d')!

  // 背景 - 宣纸质感
  ctx.fillStyle = '#F5F0E8'
  ctx.fillRect(0, 0, W, H)

  // 水墨晕染效果
  const grad1 = ctx.createRadialGradient(150, 150, 0, 150, 150, 300)
  grad1.addColorStop(0, 'rgba(200,160,96,0.08)')
  grad1.addColorStop(1, 'transparent')
  ctx.fillStyle = grad1
  ctx.fillRect(0, 0, W, H)

  const grad2 = ctx.createRadialGradient(600, 900, 0, 600, 900, 350)
  grad2.addColorStop(0, 'rgba(192,57,43,0.06)')
  grad2.addColorStop(1, 'transparent')
  ctx.fillStyle = grad2
  ctx.fillRect(0, 0, W, H)

  // 外框 - 朱砂红细线
  ctx.strokeStyle = 'rgba(192,57,43,0.6)'
  ctx.lineWidth = 3
  ctx.strokeRect(30, 30, W - 60, H - 60)
  ctx.strokeStyle = 'rgba(192,57,43,0.2)'
  ctx.lineWidth = 1
  ctx.strokeRect(40, 40, W - 80, H - 80)

  // 四角印章装饰
  const corners = [[55, 55], [W - 55, 55], [55, H - 55], [W - 55, H - 55]]
  corners.forEach(([x, y]) => {
    ctx.fillStyle = 'rgba(192,57,43,0.15)'
    ctx.fillRect(x - 12, y - 12, 24, 24)
    ctx.strokeStyle = 'rgba(192,57,43,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(x - 12, y - 12, 24, 24)
  })

  // 顶部标题
  ctx.fillStyle = 'rgba(192,57,43,0.5)'
  ctx.font = '500 26px "Noto Serif SC", serif'
  ctx.textAlign = 'center'
  ctx.fillText('根 · 中文', W / 2, 95)

  // 分隔线
  ctx.strokeStyle = 'rgba(200,160,96,0.4)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(80, 115); ctx.lineTo(W - 80, 115)
  ctx.stroke()
  ctx.setLineDash([])

  // 大字
  ctx.font = `900 280px "Noto Serif SC", serif`
  ctx.fillStyle = '#1A1208'
  ctx.textAlign = 'center'
  ctx.fillText(char, W / 2, 420)

  // 拼音
  ctx.font = '300 36px sans-serif'
  ctx.fillStyle = 'rgba(74,55,40,0.6)'
  ctx.fillText(pinyin, W / 2, 470)

  // 含义
  ctx.font = '600 32px "Noto Serif SC", serif'
  ctx.fillStyle = '#4A3728'
  ctx.fillText(meaning, W / 2, 520)

  // 孩子手写的字（从 canvas 截图）
  const writingCanvas = canvasRef.current
  if (writingCanvas && writingCanvas.width > 0) {
    const wSize = 160
    const wx = W / 2 - wSize / 2
    const wy = 550
    // 手写背景
    ctx.fillStyle = 'rgba(253,251,247,0.8)'
    ctx.beginPath()
    const r = 16, x0 = wx - 8, y0 = wy - 8, w0 = wSize + 16, h0 = wSize + 16
    ctx.moveTo(x0 + r, y0)
    ctx.lineTo(x0 + w0 - r, y0); ctx.arcTo(x0 + w0, y0, x0 + w0, y0 + r, r)
    ctx.lineTo(x0 + w0, y0 + h0 - r); ctx.arcTo(x0 + w0, y0 + h0, x0 + w0 - r, y0 + h0, r)
    ctx.lineTo(x0 + r, y0 + h0); ctx.arcTo(x0, y0 + h0, x0, y0 + h0 - r, r)
    ctx.lineTo(x0, y0 + r); ctx.arcTo(x0, y0, x0 + r, y0, r)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(200,160,96,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.drawImage(writingCanvas, wx, wy, wSize, wSize)
    // 标注
    ctx.font = '400 20px sans-serif'
    ctx.fillStyle = 'rgba(122,92,72,0.6)'
    ctx.textAlign = 'center'
    ctx.fillText(`${childName || '孩子'} 的手迹`, W / 2, wy + wSize + 28)
  }

  // 分隔线
  ctx.strokeStyle = 'rgba(200,160,96,0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(80, 770); ctx.lineTo(W - 80, 770)
  ctx.stroke()
  ctx.setLineDash([])

  // 孩子造的句子
  if (sentence && sentence.length > 0) {
    ctx.font = '500 34px "Noto Serif SC", serif'
    ctx.fillStyle = '#1A1208'
    ctx.textAlign = 'center'
    const maxWidth = W - 160
    const words = sentence.split('')
    let line = '「'; let y = 825
    words.forEach(w => {
      const test = line + w
      if (ctx.measureText(test + '」').width > maxWidth && line !== '「') {
        ctx.fillText(line, W / 2, y)
        line = w; y += 48
      } else { line += w }
    })
    ctx.fillText(line + '」', W / 2, y)
  }

  // 成就标签
  const achievements = ['字源溯源', '六书解构', '笔顺临摹', '情境造句']
  const tagW = 140; const tagH = 36
  const startX = (W - (tagW * 2 + 16)) / 2
  achievements.forEach((tag, i) => {
    const x = startX + (i % 2) * (tagW + 16)
    const y = H - 200 + Math.floor(i / 2) * (tagH + 8)
    ctx.fillStyle = 'rgba(192,57,43,0.08)'
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(x, y, tagW, tagH, 18)
      : (ctx.rect(x, y, tagW, tagH))
    ctx.fill()
    ctx.strokeStyle = 'rgba(192,57,43,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.font = '500 20px "Noto Serif SC", serif'
    ctx.fillStyle = T.red
    ctx.textAlign = 'center'
    ctx.fillText(`✅ ${tag}`, x + tagW / 2, y + tagH / 2 + 7)
  })

  // 底部信息
  const today = new Date().toLocaleDateString('zh-CN',
    { year: 'numeric', month: 'long', day: 'numeric' })
  ctx.font = '300 22px sans-serif'
  ctx.fillStyle = 'rgba(122,92,72,0.5)'
  ctx.textAlign = 'center'
  ctx.fillText(`${childName || '孩子'} · ${today} · 根·中文`, W / 2, H - 55)

  return cardCanvas.toDataURL('image/png')
}

// ── 第四步：我会用了（语音输入 + 分享卡片）──
function StepUse({ data, char, childName, canvasRef, onComplete }: {
  data: any; char: string; childName?: string
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onComplete: (s: string) => void
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
      alert('你的浏览器不支持语音输入，请手动输入')
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
      const res = await fetch('/api/rian/chat', {
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
      const url = generateCard(
        char,
        data.pinyin || '',
        data.meaning || '',
        sentence,
        childName || '孩子',
        canvasRef,
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

  if (cardUrl) {
    return (
      <div style={{ padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: T.textDim, marginBottom: 12,
          fontFamily: 'sans-serif' }}>
          🎉 今日学习完成！
        </div>

        {/* 卡片预览 */}
        <img src={cardUrl} alt="学习卡片"
          style={{ width: '100%', maxWidth: 320, borderRadius: 16,
            boxShadow: '0 8px 32px rgba(26,18,8,0.15)', marginBottom: 16 }} />

        {/* AI 评价 */}
        {aiComment && (
          <div style={{ padding: '14px 16px', borderRadius: 14,
            background: 'rgba(45,106,79,0.08)',
            border: '1px solid rgba(45,106,79,0.2)',
            fontSize: 14, color: '#2D6A4F', lineHeight: 1.8,
            fontFamily: 'sans-serif', marginBottom: 16, textAlign: 'left' }}>
            🌟 {aiComment}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={shareCard}
            style={{ width: '100%', padding: '14px', borderRadius: 14,
              border: 'none', background: T.red, color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Noto Serif SC', serif",
              boxShadow: '0 4px 16px rgba(192,57,43,0.3)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8 }}>
            <span>📤</span> 分享给家人
          </motion.button>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={downloadCard}
              style={{ flex: 1, padding: '12px', borderRadius: 12,
                border: `1px solid rgba(200,160,96,0.4)`,
                background: 'transparent', fontSize: 13,
                color: T.textMid, cursor: 'pointer',
                fontFamily: 'sans-serif' }}>
              💾 保存到相册
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => onComplete(sentence)}
              style={{ flex: 1, padding: '12px', borderRadius: 12,
                border: `1px solid ${T.gold}`, background: 'transparent',
                fontSize: 13, color: T.gold, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'sans-serif' }}>
              完成学习
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text,
          fontFamily: 'sans-serif' }}>
          用「<span style={{ color: T.red,
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 20 }}>{char}</span>」造一个句子
        </div>
        <VoiceControl text={voiceText} />
      </div>

      {data.scene && (
        <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 12,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(200,160,96,0.06)' }}>
          🌍 {data.scene}
        </div>
      )}

      {/* 语音输入区 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <textarea value={sentence}
          onChange={e => setSentence(e.target.value)}
          placeholder={`孩子说，妈妈帮忙打\n或者按话筒让孩子直接说`}
          rows={3}
          style={{ flex: 1, padding: '14px', borderRadius: 14,
            border: '1px solid rgba(200,160,96,0.3)',
            background: T.paper, fontSize: 15,
            color: T.text, fontFamily: "'Noto Serif SC', serif",
            lineHeight: 1.7, outline: 'none', resize: 'none',
            boxSizing: 'border-box' as const,
            textAlign: 'left' }} />
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={isRecording ? stopRecording : startRecording}
          animate={isRecording ? {
            boxShadow: ['0 0 0 0 rgba(192,57,43,0.4)',
              '0 0 0 12px rgba(192,57,43,0)',
              '0 0 0 0 rgba(192,57,43,0)']
          } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ width: 56, borderRadius: 14, border: 'none',
            background: isRecording ? T.red : 'rgba(192,57,43,0.1)',
            color: isRecording ? '#fff' : T.red,
            fontSize: 24, cursor: 'pointer',
            flexShrink: 0, alignSelf: 'stretch' }}>
          {isRecording ? '⏹' : '🎤'}
        </motion.button>
      </div>

      {isRecording && (
        <div style={{ fontSize: 12, color: T.red, textAlign: 'center',
          fontFamily: 'sans-serif', marginBottom: 8 }}>
          正在听孩子说话...
        </div>
      )}

      <motion.button whileTap={{ scale: 0.96 }} onClick={handleComplete}
        disabled={loading}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none',
          background: sentence.trim() ? T.green : T.red,
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          opacity: loading ? 0.7 : 1,
          boxShadow: `0 4px 16px ${sentence.trim()
            ? 'rgba(45,106,79,0.3)' : 'rgba(192,57,43,0.3)'}`,
          transition: 'background 0.3s' }}>
        {loading ? '生成中...' : sentence.trim() ? '🌟 生成学习卡片' : '跳过完成'}
      </motion.button>
    </div>
  )
}

// ── 主组件 ──
export default function LearnSession({
  data, char, childName, onComplete, onClose
}: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const step = STEPS[currentStep]

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }, [currentStep])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', inset: 0, background: T.bg,
        zIndex: 400, display: 'flex', flexDirection: 'column',
        fontFamily: 'sans-serif',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>

      {/* 顶部导航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '16px 20px 8px' }}>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none',
            fontSize: 13, color: T.textDim,
            cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ← 退出
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text,
          fontFamily: "'Noto Serif SC', serif" }}>
          {step.emoji} {step.label}
        </div>
        <div style={{ fontSize: 12, color: T.textDim,
          fontFamily: 'sans-serif' }}>
          {currentStep + 1} / {STEPS.length}
        </div>
      </div>

      <ProgressBar current={currentStep} />

      {/* 内容 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
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
                onComplete={onComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
