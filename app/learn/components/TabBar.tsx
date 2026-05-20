'use client'
import React from 'react'
import { motion } from 'framer-motion'

export type TabType = 'hanzi' | 'chengyu' | 'writing'

type Props = {
  active: TabType
  onChange: (t: TabType) => void
}

export default function TabBar({ active, onChange }: Props) {
  const tabs: { key: TabType; label: string; emoji: string }[] = [
    { key: 'hanzi',   label: '汉字拆解', emoji: '🧩' },
    { key: 'chengyu', label: '成语解读', emoji: '🌟' },
    { key: 'writing', label: '文化句',   emoji: '📜' },
  ]

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: 'rgba(45,50,47,0.05)',
      borderRadius: 24,
      padding: '4px',
      marginBottom: 14,
    }}>
      {tabs.map(t => {
        const isActive = active === t.key
        return (
          <motion.button key={t.key} whileTap={{ scale: 0.95 }}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1,
              ...(isActive ? {
                background: '#a46355',
                color: '#ffffff',
                borderRadius: 20,
                border: 'none',
                fontFamily: "'Noto Serif SC', serif",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.05em',
                padding: '7px 18px',
                boxShadow: '0 4px 12px rgba(164,99,85,0.25)',
              } : {
                background: 'transparent',
                color: 'rgba(45,50,47,0.5)',
                borderRadius: 20,
                border: 'none',
                fontFamily: 'sans-serif',
                fontSize: 13,
                padding: '7px 18px',
                cursor: 'pointer',
              }),
            }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{t.emoji}</div>
            <div>{t.label}</div>
          </motion.button>
        )
      })}
    </div>
  )
}
