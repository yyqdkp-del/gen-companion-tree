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
  title, emoji, children, defaultOpen = false, borderColor, titleStyle
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderRadius: 14,
      border: `1px solid ${borderColor || 'rgba(200,160,96,0.2)'}`,
      overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '13px 16px',
          background: open ? 'rgba(200,160,96,0.06)' : T.white,
          border: 'none', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textMid,
            fontFamily: 'sans-serif', ...titleStyle }}>{title}</span>
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
            <div style={{ padding: '0 16px 14px',
              borderTop: `1px solid ${borderColor || 'rgba(200,160,96,0.15)'}`,
              background: T.white }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
