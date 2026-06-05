'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { EnergyResult } from '../_engine/energy'
import { useApp } from '@/app/context/AppContext'

type Props = {
  name: string
  energy: EnergyResult
  onClick: () => void
}

const JADE = '#1d9e75'
const FG2 = 'var(--fg2, rgba(45,50,47,0.72))'
const FG3 = 'var(--fg3, rgba(45,50,47,0.45))'

export default function ChildEnergyCard({ energy, onClick }: Props) {
  const { speak } = useApp()
  const score = energy.score
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0
  const scoreLabel = score != null ? `${score}/100` : '—'

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginBottom: 6,
        padding: '13px 15px',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 4px 18px rgba(45,50,47,0.03)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13.5, color: FG2 }}>
          今日状态 · {energy.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: 11,
            color: JADE,
            fontWeight: 600,
          }}
        >
          能量 {scoreLabel}
        </span>
      </div>

      <div style={{ height: 7, borderRadius: 4, background: '#f4f2ed', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            background: 'linear-gradient(90deg, #8ca88d, #5c7a5e)',
            transition: 'width 0.35s ease',
          }}
        />
      </div>

      {energy.focus ? (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: FG2,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {energy.focus}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: FG3,
            lineHeight: 1.5,
          }}
        >
          {energy.advice}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            speak(energy.advice)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            opacity: 0.5,
            padding: 2,
            flexShrink: 0,
          }}
          title="朗读"
        >
          🔊
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: FG3 }}>
          本周疲劳 {energy.weeklyFatigue}/10
        </span>
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--clay, #a46355)',
            fontWeight: 500,
          }}
        >
          点击更新状态 ›
        </span>
      </div>
    </motion.div>
  )
}
