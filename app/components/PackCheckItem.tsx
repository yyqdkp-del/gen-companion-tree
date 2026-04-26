'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', deep: '#1D9E75', dark: '#0F6E56', darkest: '#085041' }
const THEME = { text: '#2C3E50', muted: '#6B8BAA' }

type Props = {
  item: string
  storageKey: string   // e.g. `packing_${childId}_${today}`
  itemKey: string      // unique key within the storage object
  size?: 'sm' | 'md'
}

export default function PackCheckItem({ item, storageKey, itemKey, size = 'sm' }: Props) {
  const [done, setDone] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
      return !!stored[itemKey]
    } catch { return false }
  })

  const toggle = () => {
    setDone(prev => {
      const next = !prev
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
        stored[itemKey] = next
        localStorage.setItem(storageKey, JSON.stringify(stored))
      } catch {}
      return next
    })
  }

  return (
    <motion.div whileTap={{ scale: 0.88 }} onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: size === 'md' ? '8px 12px' : '5px 10px',
        borderRadius: 16,
        background: done ? G.bg : 'rgba(255,255,255,0.8)',
        border: `0.5px solid ${done ? G.mid : 'rgba(0,0,0,0.08)'}`,
        cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s',
      }}>
      <div style={{
        width: size === 'md' ? 18 : 14, height: size === 'md' ? 18 : 14,
        borderRadius: '50%',
        border: done ? 'none' : `1.5px solid ${THEME.muted}`,
        background: done ? G.deep : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s',
      }}>
        <AnimatePresence>
          {done && (
            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ duration: 0.15 }} width="9" height="9" viewBox="0 0 9 9" fill="none">
              <polyline points="1,4.5 3.5,7 8,2" stroke="white" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
      <span style={{
        fontSize: size === 'md' ? 13 : 11,
        color: done ? G.darkest : THEME.text,
        textDecoration: done ? 'line-through' : 'none',
        transition: 'all 0.15s',
      }}>{item}</span>
    </motion.div>
  )
}
