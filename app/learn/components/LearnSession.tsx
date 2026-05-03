'use client'
import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { useApp } from '@/app/context/AppContext'

type Step = 'see' | 'listen' | 'interact' | 'write' | 'sentence'

type Props = {
  data: any
  char: string
  childName?: string
  onComplete: (sentence: string) => void
  onClose: () => void
}

const STEPS: { key: Step; label: string; emoji: string; seconds: number }[] = [
  { key: 'see',       label: '看见',  emoji: '👁',  seconds: 30 },
  { key: 'listen',    label: '听懂',  emoji: '👂',  seconds: 60 },
  { key: 'interact',  label: '互动',  emoji: '🙋',  seconds: 30 },
  { key: 'write',     label: '学写',  emoji: '✍️',  seconds: 60 },
  { key: 'sentence',  label: '造句',  emoji: '💬',  seconds: 30 },
]

// ── 进度条 ──
function ProgressBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 20px', marginBottom: 20 }}>
      {STEPS.map((s, i) => (
        <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: 4, borderRadius: 2,
            background: i <= current ? T.red : 'rgba(192,57,43,0.12)',
            transition: 'background 0.3s' }} />
          <span style={{ fontSize: 9, color: i === current ? T.red : T.textDim,
            fontFamily: 'sans-serif', fontWeight: i === current ? 700 : 400 }}>
            {s.emoji}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── 第一步：看见 ──
function StepSee({ data, char, onNext }: { data: any; char: string; onNext: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        style={{ fontSize: 120, fontFamily: "'Noto Serif SC', serif",
          color: T.text, lineHeight: 1, marginBottom: 24,
          textShadow: '0 8px 32px rgba(26,18,8,0.08)' }}>
        {char}
      </motion.div>

      {data.visual_hook ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ fontSize: 18, color: T.text, lineHeight: 1.7,
            fontFamily: "'Noto Serif SC', serif", marginBottom: 16 }}>
          {data.visual_hook}
        </motion.div>
      ) : (
        <div style={{ fontSize: 16, color: T.textMid, lineHeight: 1.7,
          fontFamily: 'sans-serif', marginBottom: 16 }}>
          {data.meaning}
        </div>
      )}

      {data.memory_trick && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ padding: '12px 16px', borderRadius: 14,
            background: 'rgba(200,160,96,0.08)',
            border: '1px solid rgba(200,160,96,0.2)',
            fontSize: 15, color: T.gold, fontStyle: 'italic',
            fontFamily: 'sans-serif', marginBottom: 24 }}>
          🎵 {data.memory_trick}
        </motion.div>
      )}

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: T.red, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        我看到了 →
      </motion.button>
    </div>
  )
}

// ── 第二步：听懂 ──
function StepListen({ data, char, onNext }: { data: any; char: string; onNext: () => void }) {
  const { speak } = useApp()
  const [spoken, setSpoken] = useState(false)

  const handleSpeak = () => {
    if (data.mom_script) {
      speak(data.mom_script)
      setSpoken(true)
    }
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ fontSize: 13, color: T.textDim, textAlign: 'center',
        marginBottom: 16, fontFamily: 'sans-serif' }}>
        妈妈照着念给孩子听 👇
      </div>

      <div style={{ padding: '20px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(200,160,96,0.08), rgba(192,57,43,0.04))',
        border: '1px solid rgba(200,160,96,0.2)', marginBottom: 16 }}>
        <div style={{ fontSize: 15, color: T.text, lineHeight: 2,
          fontStyle: 'italic', fontFamily: 'sans-serif' }}>
          「{data.mom_script || `宝贝，看这个「${char}」字，${data.meaning}。来，妈妈问你...`}」
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.95 }} onClick={handleSpeak}
        style={{ width: '100%', padding: '13px', borderRadius: 14,
          border: `1px solid ${T.gold}`, background: spoken ? 'rgba(200,160,96,0.1)' : 'transparent',
          fontSize: 14, color: T.gold, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: 16 }}>
        🔊 {spoken ? '再听一次' : '朗读台词'}
      </motion.button>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: T.red, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        孩子听懂了 →
      </motion.button>
    </div>
  )
}

// ── 第三步：互动 ──
function StepInteract({ data, char, onNext }: { data: any; char: string; onNext: () => void }) {
  const [done, setDone] = useState(false)

  return (
    <div style={{ padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🙋</div>

      <div style={{ fontSize: 17, color: T.text, lineHeight: 1.8,
        fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 24 }}>
        {data.child_prompt || `你能用「${char}」这个字说一件事吗？`}
      </div>

      <motion.button whileTap={{ scale: 0.9 }}
        onClick={() => setDone(true)}
        style={{ width: 80, height: 80, borderRadius: '50%',
          background: done ? 'rgba(45,106,79,0.15)' : 'rgba(200,160,96,0.1)',
          fontSize: 36, cursor: 'pointer', marginBottom: 16,
          border: `2px solid ${done ? T.green : 'rgba(200,160,96,0.3)'}`,
          transition: 'all 0.2s' }}>
        {done ? '✅' : '👆'}
      </motion.button>

      <div style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif',
        marginBottom: 24 }}>
        {done ? '太棒了！' : '孩子做到后点这里'}
      </div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: done ? T.red : 'rgba(192,57,43,0.3)',
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: done ? 'pointer' : 'default',
          fontFamily: "'Noto Serif SC', serif",
          boxShadow: done ? '0 4px 16px rgba(192,57,43,0.3)' : 'none' }}>
        继续 →
      </motion.button>
    </div>
  )
}

// ── 第四步：学写 ──
function StepWrite({ data, char, onNext }: { data: any; char: string; onNext: () => void }) {
  const [written, setWritten] = useState(false)

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 72, fontFamily: "'Noto Serif SC', serif",
          color: T.text, lineHeight: 1, marginBottom: 8 }}>{char}</div>
        {data.stroke_count && (
          <div style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif' }}>
            共 {data.stroke_count} 画
          </div>
        )}
      </div>

      {data.writing_guide && (
        <div style={{ padding: '14px 16px', borderRadius: 14,
          background: 'rgba(200,160,96,0.06)',
          border: '1px solid rgba(200,160,96,0.15)',
          fontSize: 14, color: T.textMid, lineHeight: 1.8,
          fontFamily: 'sans-serif', marginBottom: 12 }}>
          ✍️ {data.writing_guide}
        </div>
      )}

      {data.stroke_order?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {data.stroke_order.map((s: string, i: number) => (
            <span key={i} style={{ padding: '4px 12px', borderRadius: 20,
              background: 'rgba(200,160,96,0.08)',
              border: '1px solid rgba(200,160,96,0.2)',
              fontSize: 12, color: T.textMid, fontFamily: 'sans-serif' }}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      )}

      {/* 练习区域 */}
      <div style={{ border: `2px dashed rgba(200,160,96,0.3)`, borderRadius: 16,
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, background: 'rgba(253,251,247,0.8)',
        cursor: 'pointer' }}
        onClick={() => setWritten(true)}>
        {written ? (
          <div style={{ fontSize: 60, fontFamily: "'Noto Serif SC', serif",
            color: 'rgba(192,57,43,0.3)' }}>{char}</div>
        ) : (
          <div style={{ fontSize: 13, color: T.textDim, fontFamily: 'sans-serif',
            textAlign: 'center', lineHeight: 1.7 }}>
            用手指在这里练习写<br/>
            <span style={{ fontSize: 11, opacity: 0.6 }}>点击表示已练习</span>
          </div>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={onNext}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: T.red, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
        我写了 →
      </motion.button>
    </div>
  )
}

// ── 第五步：造句 ──
function StepSentence({ char, childName, onComplete }: {
  char: string; childName?: string; onComplete: (s: string) => void
}) {
  const [sentence, setSentence] = useState('')

  return (
    <div style={{ padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
      <div style={{ fontSize: 17, color: T.text, lineHeight: 1.8,
        fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 8 }}>
        {childName ? `${childName}，` : ''}用「{char}」说一句话
      </div>
      <div style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif',
        marginBottom: 20 }}>
        孩子说，妈妈帮忙打出来
      </div>

      <textarea value={sentence} onChange={e => setSentence(e.target.value)}
        placeholder={`例如：今天买东西很「费」钱...`}
        rows={3}
        style={{ width: '100%', padding: '14px', borderRadius: 14,
          border: '1px solid rgba(200,160,96,0.3)',
          background: T.paper, fontSize: 15,
          color: T.text, fontFamily: "'Noto Serif SC', serif",
          lineHeight: 1.7, outline: 'none', resize: 'none',
          boxSizing: 'border-box', marginBottom: 16 }} />

      <motion.button whileTap={{ scale: 0.96 }}
        onClick={() => onComplete(sentence || `${char}。`)}
        style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none',
          background: sentence.trim() ? T.green : T.red,
          color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'Noto Serif SC', serif",
          boxShadow: `0 4px 16px ${sentence.trim() ? 'rgba(45,106,79,0.3)' : 'rgba(192,57,43,0.3)'}` }}>
        {sentence.trim() ? '🌟 完成今日学习！' : '跳过，完成学习'}
      </motion.button>
    </div>
  )
}

// ── 主组件 ──
export default function LearnSession({ data, char, childName, onComplete, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0)

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }, [currentStep])

  const handleComplete = (sentence: string) => {
    onComplete(sentence)
  }

  const step = STEPS[currentStep]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 400,
        display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>

      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '16px 20px 8px' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none',
          fontSize: 13, color: T.textDim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ← 退出
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
          fontFamily: "'Noto Serif SC', serif" }}>
          {step.emoji} {step.label}
        </div>
        <div style={{ fontSize: 12, color: T.textDim, fontFamily: 'sans-serif' }}>
          {currentStep + 1} / {STEPS.length}
        </div>
      </div>

      <ProgressBar current={currentStep} />

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
        <AnimatePresence mode="wait">
          <motion.div key={currentStep}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            {currentStep === 0 && <StepSee data={data} char={char} onNext={next} />}
            {currentStep === 1 && <StepListen data={data} char={char} onNext={next} />}
            {currentStep === 2 && <StepInteract data={data} char={char} onNext={next} />}
            {currentStep === 3 && <StepWrite data={data} char={char} onNext={next} />}
            {currentStep === 4 && (
              <StepSentence char={char} childName={childName} onComplete={handleComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
