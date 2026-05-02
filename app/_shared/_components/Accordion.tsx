'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { THEME } from '../_constants/theme'

type Props = {
  title: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
}

export default function Accordion({ title, count, children, defaultOpen = false, badge }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ marginBottom: 8 }}>
      <motion.div whileTap={{ scale: 0.98 }} onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', cursor: 'pointer',
          borderRadius: open ? '12px 12px 0 0' : 12,
          background: open ? 'rgba(176,141,87,0.06)' : 'rgba(0,0,0,0.02)',
          border: `0.5px solid ${open ? 'rgba(176,141,87,0.2)' : 'rgba(0,0,0,0.06)'}`,
          transition: 'all 0.18s',
        }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: open ? THEME.gold : THEME.text, flex: 1 }}>
          {title}
        </span>
        {badge && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: 'rgba(255,100,100,0.1)', color: '#DC2626', fontWeight: 600 }}>
            {badge}
          </span>
        )}
        {count !== undefined && (
          <span style={{ fontSize: 10, color: THEME.muted }}>{count}项</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} color={open ? THEME.gold : THEME.muted} />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden', background: 'rgba(255,255,255,0.8)',
              border: '0.5px solid rgba(176,141,87,0.15)',
              borderTop: 'none', borderRadius: '0 0 12px 12px',
            }}>
            <div style={{ padding: '10px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
