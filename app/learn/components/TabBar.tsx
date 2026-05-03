'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'

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
    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
      {tabs.map(t => (
        <motion.button key={t.key} whileTap={{ scale: 0.95 }}
          onClick={() => onChange(t.key)}
          style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: 'none',
            background: active === t.key ? T.red : 'rgba(192,57,43,0.06)',
            color: active === t.key ? '#fff' : T.textMid,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans SC', sans-serif", transition: 'all 0.2s',
            boxShadow: active === t.key ? '0 4px 12px rgba(192,57,43,0.25)' : 'none' }}>
          <div style={{ fontSize: 18, marginBottom: 3 }}>{t.emoji}</div>
          <div>{t.label}</div>
        </motion.button>
      ))}
    </div>
  )
}
