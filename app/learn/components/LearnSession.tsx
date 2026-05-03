'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'

type Step = 'origin' | 'structure' | 'understand' | 'write' | 'use'

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
  { key: 'understand',label: '妈妈来说', emoji: '👩' },
  { key: 'write',     label: '孩子来写', emoji: '✍️' },
  { key: 'use',       label: '生活中用', emoji: '💬' },
]

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
            {s.emoji}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── 第一步：字的前世 ──
function StepOrigin({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const { speak } = useApp()

  useEffect(() => {
    const script = data.evolution
      ? `这个字有很有趣的来历。${data.evolution}`
      : `${char}这个字，是古人观察生活画出来的。`
    speak(script)
  }, [])

  // 用emoji模拟甲骨文演变
  const evolution = data.evolution || ''
  const meaning = data.meaning || ''

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 大字展示 */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 10 }}
        style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 100, fontFamily: "'Noto Serif SC', serif",
          color: T.text, lineHeight: 1,
          textShadow: '0 4px 20px rgba(26,18,8,0.1)' }}>{char}</div>
        <div style={{ fontSize: 14, color: T.textDim, fontFamily: 'sans-serif',
          marginTop: 8 }}>{data.pinyin}</div>
      </motion.div>

      {/* 演变过程 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ background: 'rgba(192,57,43,0.04)', borderRadius: 16,
          padding: '16px', marginBottom: 16,
          border: '1px solid rgba(192,57,43,0.12)' }}>
        <div style={{ fontSize: 11, color: T.red, letterSpacing: 3,
          marginBottom: 10, fontFamily: 'sans-serif' }}>🏺 字的来历</div>

        {/* 演变视觉化 */}
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.5,
              fontFamily: "'Noto Serif SC', serif", color: T.red }}>
              {data.parts?.[0]?.char || '古'}
            </div>
            <div style={{ fontSize: 9, color: T.textDim,
              fontFamily: 'sans-serif', marginTop: 2 }}>古字</div>
          </div>
          <div style={{ fontSize: 16, color: T.textDim }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, opacity: 0.7,
              fontFamily: "'Noto Serif SC', serif", color: T.textMid }}>
              {char}
            </div>
            <div style={{ fontSize: 9, color: T.textDim,
              fontFamily: 'sans-serif', marginTop: 2 }}>小篆</div>
          </div>
          <div style={{ fontSize: 16, color: T.textDim }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32,
              fontFamily: "'Noto Serif SC', serif", color: T.text,
              fontWeight: 700 }}>{char}</div>
            <div style={{ fontSize: 9, color: T.textDim,
              fontFamily: 'sans-serif', marginTop: 2 }}>现代</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9,
          fontFamily: 'sans-serif' }}>{evolution}</div>
      </motion.div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none', background: T.red, color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        我知道了 →
      </motion.button>
    </div>
  )
}

// ── 第二步：字的身体 ──
function StepStructure({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const { speak } = useApp()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const parts = data.parts || []

  useEffect(() => {
    if (parts.length > 0) {
      const desc = parts.map((p: any) =>
        `${p.char}，${p.name}，${p.image || ''}`
      ).join('。')
      speak(`${char}这个字由这些部件组成：${desc}`)
    }
  }, [])

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: "'Noto Serif SC', serif",
          color: T.text, lineHeight: 1 }}>{char}</div>
        <div style={{ fontSize: 12, color: T.textDim,
          fontFamily: 'sans-serif', marginTop: 4 }}>
          点击部件了解它的含义
        </div>
      </div>

      {parts.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap',
          justifyContent: 'center', marginBottom: 16 }}>
          {parts.map((p: any, i: number) => (
            <motion.button key={i} whileTap={{ scale: 0.9 }}
              onClick={() => {
                setActiveIdx(activeIdx === i ? null : i)
                speak(`${p.char}，${p.name}，${p.image || ''}`)
              }}
              style={{ padding: '12px 16px', borderRadius: 14,
                background: activeIdx === i
                  ? 'rgba(192,57,43,0.1)' : T.paper,
                border: `1.5px solid ${activeIdx === i
                  ? 'rgba(192,57,43,0.4)' : 'rgba(200,160,96,0.25)'}`,
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s', minWidth: 70 }}>
              <div style={{ fontSize: 32,
                fontFamily: "'Noto Serif SC', serif",
                color: T.red, lineHeight: 1 }}>{p.char}</div>
              <div style={{ fontSize: 10, color: T.textDim,
                marginTop: 4, fontFamily: 'sans-serif' }}>{p.name}</div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '16px', borderRadius: 14,
          background: T.paper, marginBottom: 16, textAlign: 'center',
          fontSize: 13, color: T.textDim, fontFamily: 'sans-serif' }}>
          {data.meaning}
        </div>
      )}

      <AnimatePresence>
        {activeIdx !== null && parts[activeIdx] && (
          <motion.div initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 12 }}>
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

// ── 第三步：妈妈来说 ──
function StepUnderstand({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const { speak, stop } = useApp()
  const [spoken, setSpoken] = useState(false)

  useEffect(() => {
    if (data.mom_script) {
      speak(data.mom_script)
      setSpoken(true)
    }
  }, [])

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ fontSize: 13, color: T.textDim, textAlign: 'center',
        marginBottom: 12, fontFamily: 'sans-serif' }}>
        妈妈照着念给孩子听 👇
      </div>

      {/* 妈妈台词 */}
      <div style={{ padding: '20px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(200,160,96,0.1), rgba(192,57,43,0.04))',
        border: '1px solid rgba(200,160,96,0.25)', marginBottom: 12 }}>
        <div style={{ fontSize: 15, color: T.text, lineHeight: 2,
          fontStyle: 'italic', fontFamily: 'sans-serif' }}>
          「{data.mom_script || `宝贝，这个「${char}」字，${data.meaning}。`}」
        </div>
      </div>

      {/* 英文联结（海外孩子有英文思维）*/}
      {data.english_link && (
        <div style={{ padding: '12px 16px', borderRadius: 12,
          background: 'rgba(26,60,94,0.05)',
          border: '1px solid rgba(26,60,94,0.12)',
          fontSize: 13, color: T.navy, lineHeight: 1.8,
          fontFamily: 'sans-serif', marginBottom: 12 }}>
          🔗 {data.english_link}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => { stop(); speak(data.mom_script) }}
          style={{ flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid ${T.gold}`,
            background: spoken ? 'rgba(200,160,96,0.08)' : 'transparent',
            fontSize: 13, color: T.gold, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'sans-serif' }}>
          🔊 {spoken ? '再听一次' : '朗读台词'}
        </motion.button>
      </div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none', background: T.red, color: '#fff',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        孩子听懂了 →
      </motion.button>
    </div>
  )
}

// ── 第四步：孩子来写 ──
function StepWrite({ data, char, onNext }: {
  data: any; char: string; onNext: () => void
}) {
  const { speak } = useApp()
  const [written, setWritten] = useState(false)
  const strokeOrder = data.stroke_order || []
  const strokeCount = data.stroke_count || strokeOrder.length

  useEffect(() => {
    const guide = data.writing_guide
      ? data.writing_guide
      : `${char}这个字共${strokeCount}画，跟着妈妈一起写。`
    speak(guide)
  }, [])

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 田字格 */}
      <div style={{ display: 'flex', justifyContent: 'center',
        marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          {/* 田字格背景 */}
          <svg width="140" height="140" style={{ position: 'absolute' }}>
            <rect x="1" y="1" width="138" height="138"
              fill="rgba(253,251,247,0.9)"
              stroke="rgba(200,160,96,0.4)" strokeWidth="1.5" />
            <line x1="70" y1="1" x2="70" y2="139"
              stroke="rgba(200,160,96,0.25)" strokeWidth="1"
              strokeDasharray="4,3" />
            <line x1="1" y1="70" x2="139" y2="70"
              stroke="rgba(200,160,96,0.25)" strokeWidth="1"
              strokeDasharray="4,3" />
          </svg>
          {/* 示范字（淡色） */}
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 90, fontFamily: "'Noto Serif SC', serif",
            color: 'rgba(26,18,8,0.08)', userSelect: 'none',
            lineHeight: 1 }}>{char}</div>
          {/* 练习提示 */}
          {!written && (
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => {
                setWritten(true)
                speak('写得好！')
              }}>
              <div style={{ fontSize: 11, color: T.textDim,
                fontFamily: 'sans-serif', textAlign: 'center',
                lineHeight: 1.6 }}>
                用手指描字<br/>写完后点这里
              </div>
            </motion.div>
          )}
          {written && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{ position: 'absolute', top: -8, right: -8,
                width: 28, height: 28, borderRadius: '50%',
                background: T.green, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 14 }}>✓</motion.div>
          )}
        </div>
      </div>

      {/* 书写引导 */}
      {data.writing_guide && (
        <div style={{ padding: '12px 16px', borderRadius: 12,
          background: 'rgba(200,160,96,0.06)',
          border: '1px solid rgba(200,160,96,0.15)',
          fontSize: 13, color: T.textMid, lineHeight: 1.8,
          fontFamily: 'sans-serif', marginBottom: 10 }}>
          ✍️ {data.writing_guide}
          {strokeCount > 0 && (
            <span style={{ color: T.gold, fontWeight: 600,
              marginLeft: 6 }}>共{strokeCount}画</span>
          )}
        </div>
      )}

      {/* 笔顺 */}
      {strokeOrder.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap',
          gap: 6, marginBottom: 16 }}>
          {strokeOrder.map((s: string, i: number) => (
            <span key={i} style={{ padding: '3px 10px', borderRadius: 20,
              background: 'rgba(200,160,96,0.08)',
              border: '1px solid rgba(200,160,96,0.2)',
              fontSize: 12, color: T.textMid, fontFamily: 'sans-serif' }}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      )}

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none',
          background: written ? T.green : T.red,
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: `0 4px 16px ${written
            ? 'rgba(45,106,79,0.3)' : 'rgba(192,57,43,0.3)'}`,
          transition: 'background 0.3s' }}>
        {written ? '写好了 ✓ →' : '跳过，继续 →'}
      </motion.button>
    </div>
  )
}

// ── 第五步：生活中用 ──
function StepUse({ data, char, childName, onComplete }: {
  data: any; char: string; childName?: string
  onComplete: (s: string) => void
}) {
  const { speak } = useApp()
  const [sentence, setSentence] = useState('')

  useEffect(() => {
    const prompt = childName
      ? `${childName}，你能用「${char}」说一件今天发生的事吗？`
      : `用「${char}」说一件今天发生的事吧！`
    speak(prompt)
  }, [])

  // 在地场景提示
  const scene = data.scene || ''

  return (
    <div style={{ padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>

      <div style={{ fontSize: 17, color: T.text, lineHeight: 1.8,
        fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 8 }}>
        {childName ? `${childName}，` : ''}
        用「<span style={{ color: T.red, fontFamily: "'Noto Serif SC', serif",
          fontSize: 20 }}>{char}</span>」说一件事
      </div>

      {/* 在地场景提示 */}
      {scene && (
        <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 16,
          padding: '8px 12px', borderRadius: 10,
          background: 'rgba(200,160,96,0.06)' }}>
          🌍 {scene}
        </div>
      )}

      <textarea value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder={`孩子说，妈妈帮忙打出来\n比如：妈妈说这件衣服很费钱...`}
        rows={3}
        style={{ width: '100%', padding: '14px', borderRadius: 14,
          border: '1px solid rgba(200,160,96,0.3)',
          background: T.paper, fontSize: 15,
          color: T.text, fontFamily: "'Noto Serif SC', serif",
          lineHeight: 1.7, outline: 'none', resize: 'none',
          boxSizing: 'border-box' as const, marginBottom: 16,
          textAlign: 'left' }} />

      <motion.button whileTap={{ scale: 0.96 }}
        onClick={() => {
          if (sentence.trim()) speak(`太棒了！${sentence}`)
          onComplete(sentence || `${char}`)
        }}
        style={{ width: '100%', padding: '16px', borderRadius: 16,
          border: 'none',
          background: sentence.trim() ? T.green : T.red,
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: `0 4px 16px ${sentence.trim()
            ? 'rgba(45,106,79,0.3)' : 'rgba(192,57,43,0.3)'}`,
          transition: 'background 0.3s' }}>
        {sentence.trim() ? '🌟 完成今日学习！' : '跳过完成'}
      </motion.button>
    </div>
  )
}

// ── 主组件 ──
export default function LearnSession({
  data, char, childName, onComplete, onClose
}: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = STEPS[currentStep]

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', inset: 0, background: T.bg,
        zIndex: 400, display: 'flex', flexDirection: 'column',
        fontFamily: 'sans-serif',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>

      {/* 顶部 */}
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

      {/* 内容区 */}
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
              <StepUnderstand data={data} char={char} onNext={next} />
            )}
            {currentStep === 3 && (
              <StepWrite data={data} char={char} onNext={next} />
            )}
            {currentStep === 4 && (
              <StepUse data={data} char={char}
                childName={childName} onComplete={onComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
