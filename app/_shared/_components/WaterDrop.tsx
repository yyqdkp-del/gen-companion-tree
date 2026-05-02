'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { THEME } from '../_constants/theme'

const COLORS: Record<string, any> = {
  calm:   { fill: 'rgba(154,183,232,0.38)', border: 'rgba(154,183,232,0.6)',  glow: 'rgba(154,183,232,0.35)' },
  yellow: { fill: 'rgba(255,210,80,0.48)',  border: 'rgba(255,200,60,0.75)',  glow: 'rgba(255,200,60,0.35)'  },
  orange: { fill: 'rgba(255,160,60,0.52)',  border: 'rgba(255,130,40,0.8)',   glow: 'rgba(255,130,40,0.4)'   },
  red:    { fill: 'rgba(255,100,100,0.55)', border: 'rgba(255,70,70,0.85)',   glow: 'rgba(255,70,70,0.45)'   },
}

type Props = {
  state: string
  icon: React.ReactNode
  label: string
  value?: string
  badge?: number
  pulse?: boolean
  onClick: () => void
  size?: number
  delay?: number
}

export default function WaterDrop({
  state, icon, label, value, badge, pulse, onClick, size = 96, delay = 0
}: Props) {
  const c = COLORS[state] || COLORS.calm
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <motion.div onClick={onClick}
        animate={{ y: [0, -13, 0], x: [0, 3, -2, 0], rotate: [0, 1.2, -0.8, 0] }}
        transition={{ duration: 7, repeat: Infinity, delay, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}
        style={{ position: 'relative', cursor: 'pointer' }}>
        {pulse && (
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ position: 'absolute', inset: -12,
              borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
              background: c.glow }} />
        )}
        <div style={{
          width: size, height: size, backdropFilter: 'blur(20px)',
          border: `1.5px solid ${c.border}`,
          borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 33% 33%, rgba(255,255,255,0.42) 0%, ${c.fill} 100%)`,
          boxShadow: `inset 5px 5px 10px rgba(255,255,255,0.35), 8px 14px 28px rgba(0,0,0,0.08)`,
        }}>
          <div style={{ color: THEME.text, opacity: 0.75, marginBottom: 3 }}>{icon}</div>
          {value && (
            <span style={{ fontSize: size > 100 ? 14 : 12, fontWeight: 600, color: THEME.text }}>
              {value}
            </span>
          )}
          <span style={{ fontSize: 7.5, fontWeight: 700, color: THEME.text,
            opacity: 0.32, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {label}
          </span>
          {(badge ?? 0) > 0 && (
            <motion.div animate={{ scale: [1, 1.35, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ position: 'absolute', top: 9, right: 11, width: 10, height: 10,
                borderRadius: '50%',
                background: state === 'red' ? '#FF3333' : state === 'orange' ? '#FF8000' : '#E6B800',
                border: '2px solid white' }} />
          )}
          <div style={{ position: 'absolute', top: 13, left: 18, width: 15, height: 7,
            background: 'rgba(255,255,255,0.5)', borderRadius: '50%', transform: 'rotate(-35deg)' }} />
        </div>
      </motion.div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
        color: THEME.text, opacity: 0.55 }}>
        {label}
      </span>
    </div>
  )
}
