'use client'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

const THEME = { text: '#2C3E50', muted: '#6B8BAA' }

type Props = {
  onDone: () => void
  onSnooze: () => void
  doneLabel?: string
  snoozeLabel?: string
}

export default function BottomActions({ onDone, onSnooze, doneLabel = '已处理', snoozeLabel = '明天再说' }: Props) {
  return (
    <div style={{
      flexShrink: 0, borderTop: '0.5px solid rgba(0,0,0,0.06)',
      padding: '10px 12px max(env(safe-area-inset-bottom, 16px), 16px)',
      display: 'flex', gap: 8,
    }}>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onDone}
        style={{
          flex: 1, padding: '12px', borderRadius: 12,
          background: 'rgba(141,200,160,0.35)', border: '0.5px solid rgba(141,200,160,0.5)',
          fontSize: 13, fontWeight: 600, color: THEME.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
        <CheckCircle2 size={14} /> {doneLabel}
      </motion.button>
      <motion.button whileTap={{ scale: 0.95 }} onClick={onSnooze}
        style={{
          flex: 1, padding: '12px', borderRadius: 12,
          background: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(0,0,0,0.08)',
          fontSize: 13, color: THEME.muted, cursor: 'pointer',
        }}>
        {snoozeLabel}
      </motion.button>
    </div>
  )
}
