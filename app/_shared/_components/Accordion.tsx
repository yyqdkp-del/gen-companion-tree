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
  variant?: 'default' | 'gc'
}

export default function Accordion({ title, count, children, defaultOpen = false, badge, variant = 'default' }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const isGc = variant === 'gc'

  return (
    <div style={{ marginBottom: isGc ? 10 : 8 }}>
      <motion.div whileTap={{ scale: 0.98 }} onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isGc ? '11px 2px' : '10px 12px', cursor: 'pointer',
          borderRadius: isGc ? 0 : (open ? '12px 12px 0 0' : 12),
          background: isGc ? 'transparent' : (open ? 'rgba(164,99,85,0.06)' : 'rgba(0,0,0,0.02)'),
          border: isGc ? 'none' : `0.5px solid ${open ? 'rgba(164,99,85,0.2)' : 'rgba(0,0,0,0.06)'}`,
          borderBottom: isGc ? '1px solid rgba(45,50,47,0.06)' : undefined,
          transition: 'all 0.18s',
        }}>
        <span style={{
          fontSize: isGc ? 13 : 12,
          fontWeight: 600,
          fontFamily: isGc ? 'var(--font-serif)' : undefined,
          color: isGc ? '#2d322f' : (open ? THEME.gold : THEME.text),
          flex: 1,
        }}>
          {title}
        </span>
        {badge && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: '#fff2f0', color: '#7d3f37', fontWeight: 600 }}>
            {badge}
          </span>
        )}
        {count !== undefined && (
          <span style={{ fontSize: 10, color: isGc ? 'rgba(45,50,47,0.45)' : THEME.muted }}>{count}项</span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} color={isGc ? 'rgba(45,50,47,0.45)' : (open ? THEME.gold : THEME.muted)} />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              background: isGc ? 'transparent' : 'rgba(255,255,255,0.8)',
              border: isGc ? 'none' : '0.5px solid rgba(164,99,85,0.15)',
              borderTop: isGc ? 'none' : 'none',
              borderRadius: isGc ? 0 : '0 0 12px 12px',
            }}>
            <div style={{ padding: isGc ? '10px 2px 4px' : '10px 12px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
