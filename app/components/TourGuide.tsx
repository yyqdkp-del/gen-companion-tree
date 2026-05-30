'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TourStep {
  id: string
  title: string
  desc: string
  emoji: string
  position: 'top' | 'bottom' | 'center'
  /** 指向哪个元素的说明 */
  targetHint?: string
}

interface TourGuideProps {
  /** 唯一标识，用于 localStorage */
  tourId: string
  steps: TourStep[]
  onComplete?: () => void
}

export default function TourGuide({ tourId, steps, onComplete }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const completed = typeof window !== 'undefined' && window.localStorage.getItem(`tour_${tourId}`)
      if (!completed) {
        const t = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(t)
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [tourId])

  const step = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    try {
      localStorage.setItem(`tour_${tourId}`, 'done')
    } catch {
      /* ignore */
    }
    setVisible(false)
    onComplete?.()
  }

  if (!visible || !step) return null

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(45,50,47,0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 900,
            }}
            onClick={handleComplete}
            aria-hidden
          />

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: step.position === 'bottom' ? 40 : -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{
              position: 'fixed',
              ...(step.position === 'bottom'
                ? { bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 88px)', left: 16, right: 16 }
                : step.position === 'top'
                  ? { top: 100, left: 16, right: 16 }
                  : { top: '50%', left: 16, right: 16, transform: 'translateY(-50%)' }),
              zIndex: 901,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 24,
              padding: '24px 20px 20px',
              boxShadow: '0 20px 60px rgba(45,50,47,0.2)',
              border: '1px solid rgba(255,255,255,0.8)',
              maxWidth: 400,
              margin: '0 auto',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`tour-title-${tourId}`}
          >
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 16,
                justifyContent: 'center',
              }}
            >
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === currentStep ? '#a46355' : 'rgba(164,99,85,0.2)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{step.emoji}</div>
              <div
                id={`tour-title-${tourId}`}
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: '#2d322f',
                  fontFamily: "'Noto Serif SC', serif",
                  marginBottom: 8,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'rgba(45,50,47,0.6)',
                  fontFamily: 'sans-serif',
                  lineHeight: 1.7,
                }}
              >
                {step.desc}
              </div>
              {step.targetHint && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 14px',
                    background: 'rgba(164,99,85,0.06)',
                    borderRadius: 12,
                    fontSize: 13,
                    color: '#a46355',
                    fontFamily: 'sans-serif',
                    border: '1px solid rgba(164,99,85,0.15)',
                  }}
                >
                  👆 {step.targetHint}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleComplete}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: 'transparent',
                  border: '1px solid rgba(45,50,47,0.15)',
                  borderRadius: 14,
                  fontSize: 14,
                  color: 'rgba(45,50,47,0.5)',
                  fontFamily: 'sans-serif',
                  cursor: 'pointer',
                }}
              >
                跳过
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: '11px',
                  background: '#a46355',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  color: '#fff',
                  fontFamily: "'Noto Serif SC', serif",
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(164,99,85,0.3)',
                }}
              >
                {currentStep < steps.length - 1 ? '下一步 →' : '开始使用 ✓'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** 重置所有引导（开发 / 调试用） */
export function resetAllTours() {
  if (typeof window === 'undefined') return
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('tour_'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
