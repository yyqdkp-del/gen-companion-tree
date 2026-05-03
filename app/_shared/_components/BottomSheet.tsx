'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { THEME } from '../_constants/theme'
import { SHEET_BOTTOM_PADDING } from '../_constants/layout'

type Props = {
  children: React.ReactNode
  onClose: () => void
  title: string
  zIndex?: number
}

export default function BottomSheet({ children, onClose, title, zIndex = 300 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{
          width: '100%', maxWidth: 480,
          background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(40px)',
          borderRadius: '28px 28px 0 0', maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 -10px 60px rgba(0,0,0,0.14)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: THEME.text }}>{title}</h2>
          <motion.div whileTap={{ scale: 0.85 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.3 }}>
            <X size={20} />
          </motion.div>
        </div>
        <div style={{ padding: `16px 20px ${SHEET_BOTTOM_PADDING}` }}>{children}</div>
      </motion.div>
    </motion.div>
  )
}
