'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DROP_STATES, type DropStateKey } from './dropStates'

export type DesignWaterDropProps = {
  state?: DropStateKey | string
  size?: number
  value?: string
  label?: string
  icon?: React.ReactNode
  delay?: number
  badge?: number
  pulse?: boolean
  hideLabel?: boolean
  hideValue?: boolean
  onClick?: () => void
  className?: string
}

export default function DesignWaterDrop({
  state = 'calm',
  size = 120,
  value,
  label,
  icon,
  delay = 0,
  badge = 0,
  pulse = false,
  hideLabel = false,
  hideValue = false,
  onClick,
  className,
}: DesignWaterDropProps) {
  const s = DROP_STATES[(state as DropStateKey)] || DROP_STATES.calm
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const animClass = className ?? `animate-droplet-${(delay % 3) + 1}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        className={animClass}
        style={{
          position: 'relative',
          width: size,
          height: size,
          border: 'none',
          padding: 0,
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: 'var(--r-drop)',
          background: s.fill,
          color: s.text,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `inset 0 4px 12px rgba(255,255,255,0.6), inset 0 -4px 12px rgba(0,0,0,0.05), 0 16px 36px -12px ${s.glow}, 0 4px 12px rgba(0,0,0,0.04)`,
        }}
      >
        {pulse && (
          <motion.span
            animate={reducedMotion ? {} : { scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: -10,
              borderRadius: 'inherit',
              background: s.glow,
              pointerEvents: 'none',
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: 'inherit',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)',
            pointerEvents: 'none',
          }}
        />
        {icon && <span style={{ position: 'relative', opacity: 0.72 }}>{icon}</span>}
        {!hideValue && value && (
          <span
            style={{
              position: 'relative',
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              fontSize: size * 0.13,
              marginTop: 3,
            }}
          >
            {value}
          </span>
        )}
        {!hideLabel && label && (
          <span
            style={{
              position: 'relative',
              fontSize: Math.max(7, size * 0.066),
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginTop: 1,
            }}
          >
            {label}
          </span>
        )}
        {badge > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 9,
              right: 11,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: state === 'red' ? '#d58074' : state === 'orange' ? 'var(--droplet-peach)' : 'var(--droplet-willow)',
              border: '2px solid white',
            }}
          />
        )}
      </motion.button>
    </div>
  )
}
