'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { THEME } from '../_constants/theme'

const COLORS: Record<string, { fill: string; border: string; glow: string; text: string }> = {
  calm: {
    fill: 'linear-gradient(135deg, #cddce5 0%, #6c828f 100%)',
    border: 'rgba(108, 130, 143, 0.4)',
    glow: 'rgba(108, 130, 143, 0.15)',
    text: '#2b3942',
  },
  yellow: {
    fill: 'linear-gradient(135deg, #d9e6da 0%, #8ca88d 100%)',
    border: 'rgba(140, 168, 141, 0.5)',
    glow: 'rgba(140, 168, 141, 0.18)',
    text: '#2f4030',
  },
  orange: {
    fill: 'linear-gradient(135deg, #f5d6d1 0%, #e6a89e 100%)',
    border: 'rgba(230, 168, 158, 0.5)',
    glow: 'rgba(230, 168, 158, 0.22)',
    text: '#7d3f37',
  },
  red: {
    fill: 'linear-gradient(135deg, #f5d6d1 0%, #d58074 100%)',
    border: 'rgba(213, 128, 116, 0.6)',
    glow: 'rgba(213, 128, 116, 0.25)',
    text: '#6b2f2f',
  },
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
  index?: number
}

export default function WaterDrop({
  state, icon, label, value, badge, pulse, onClick, size = 96, delay = 0, index = 0
}: Props) {
  const c = COLORS[state] || COLORS.calm
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const floatAnimate = { y: [0, -13, 0], x: [0, 3, -2, 0], rotate: [0, 1.2, -0.8, 0] }
  const floatTransition = { duration: 7, repeat: Infinity, delay, ease: 'easeInOut' as const }
  const pulseAnimate = { scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }
  const pulseTransition = { duration: 1.8, repeat: Infinity }
  const badgeAnimate = { scale: [1, 1.35, 1] }
  const badgeTransition = { repeat: Infinity, duration: 1.5 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <motion.div onClick={onClick}
        animate={reducedMotion ? {} : floatAnimate}
        transition={reducedMotion ? { duration: 0 } : floatTransition}
        whileTap={{ scale: 0.92 }}
        style={{ position: 'relative', cursor: 'pointer' }}>
        {pulse && (
          <motion.div animate={reducedMotion ? {} : pulseAnimate}
            transition={reducedMotion ? { duration: 0 } : pulseTransition}
            style={{ position: 'absolute', inset: -12,
              borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
              background: c.glow }} />
        )}
        <div
          className={`${index === 0 ? 'animate-droplet-1' : index === 1 ? 'animate-droplet-2' : 'animate-droplet-3'}`}
          style={{
          width: size, height: size, backdropFilter: 'blur(20px)',
          border: `1.5px solid ${c.border}`,
          borderRadius: '66% 34% 71% 29% / 37% 53% 47% 63%',
          position: 'relative', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: c.fill,
          boxShadow: `inset 5px 5px 10px rgba(255,255,255,0.35), 8px 14px 28px rgba(0,0,0,0.08)`,
        }}>
          <div style={{ color: c.text, opacity: 0.75, marginBottom: 3 }}>{icon}</div>
          {value && (
            <span style={{ fontSize: size > 100 ? 14 : 12, fontWeight: 600, color: c.text }}>
              {value}
            </span>
          )}
          <span style={{ fontSize: 7.5, fontWeight: 700, color: c.text,
            opacity: 0.32, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {label}
          </span>
          {(badge ?? 0) > 0 && (
            <motion.div animate={reducedMotion ? {} : badgeAnimate}
              transition={reducedMotion ? { duration: 0 } : badgeTransition}
              style={{ position: 'absolute', top: 9, right: 11, width: 10, height: 10,
                borderRadius: '50%',
                background: state === 'red' ? '#d58074' : state === 'orange' ? '#e6a89e' : '#8ca88d',
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
