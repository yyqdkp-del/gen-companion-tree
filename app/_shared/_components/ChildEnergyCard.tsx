'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { THEME } from '../_constants/theme'
import type { EnergyResult } from '../_engine/energy'
import { useApp } from '@/app/context/AppContext'

const LEVEL_COLOR = {
  green:  { border: 'rgba(74,222,128,0.35)',  bg: 'rgba(74,222,128,0.06)',  text: '#16a34a' },
  yellow: { border: 'rgba(250,204,21,0.45)',  bg: 'rgba(250,204,21,0.07)',  text: '#ca8a04' },
  orange: { border: 'rgba(251,146,60,0.5)',   bg: 'rgba(251,146,60,0.08)',  text: '#ea580c' },
  red:    { border: 'rgba(251,113,133,0.55)', bg: 'rgba(251,113,133,0.09)', text: '#dc2626' },
  unknown: { border: 'rgba(156,163,175,0.4)', bg: 'rgba(156,163,175,0.08)', text: '#6b7280' },
}

const LEVEL_DOT = {
  green:  '🟢',
  yellow: '🟡',
  orange: '🟠',
  red:    '🔴',
  unknown: '⚪',
}

type Props = {
  name: string
  energy: EnergyResult
  onClick: () => void
}

export default function ChildEnergyCard({ name, energy, onClick }: Props) {
  const { speak } = useApp()
  const c = LEVEL_COLOR[energy.level]
  const isAlert = energy.level === 'orange' || energy.level === 'red'

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        marginBottom: 12, padding: '10px 12px', borderRadius: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}>

      <motion.div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{LEVEL_DOT[energy.level]}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{name}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8,
            background: c.border, color: c.text, fontWeight: 600 }}>
            {energy.label}
          </span>
        </motion.div>

        {isAlert && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6,
            background: `${c.text}15`, color: c.text, fontWeight: 600 }}>
            ⚠ 需注意
          </span>
        )}
      </motion.div>

      <motion.div style={{ fontSize: 11, color: c.text, fontWeight: 600, lineHeight: 1.4 }}>
        {energy.focus}
      </motion.div>

      <motion.div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <motion.div style={{ flex: 1, fontSize: 12, color: THEME.gold, lineHeight: 1.5, fontWeight: 500 }}>
          {energy.advice}
        </motion.div>
        <button onClick={e => { e.stopPropagation(); speak(energy.advice) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, opacity: 0.5, padding: '2px', flexShrink: 0 }}
          title="朗读">🔊</button>
      </motion.div>

      <motion.div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: THEME.muted }}>
          本周疲劳 {energy.weeklyFatigue}/10
        </span>
        <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 500 }}>
          点击更新状态 ›
        </span>
      </motion.div>
    </motion.div>
  )
}
