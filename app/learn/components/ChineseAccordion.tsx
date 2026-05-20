'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'

type Props = {
  title: string
  emoji?: string
  children: React.ReactNode
  defaultOpen?: boolean
  borderColor?: string
  titleStyle?: React.CSSProperties
}

export default function ChineseAccordion({
  title, emoji, children, defaultOpen = false, titleStyle
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: open ? 0 : 8,
          backdropFilter: 'blur(8px)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#a46355',
            fontFamily: "'Noto Serif SC', serif",
            letterSpacing: '0.05em',
            ...titleStyle,
          }}>{title}</span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          style={{ fontSize: 16, color: T.gold, display: 'inline-block', lineHeight: 1 }}>
          ⌄
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}>
            <div style={{
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '0 0 14px 14px',
              padding: '12px 16px 16px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.5)',
              borderTop: 'none',
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
