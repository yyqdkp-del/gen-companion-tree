'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchSmartChars } from '@/app/_shared/_services/chineseService'
import { SOLID_CARD } from '@/app/_shared/_constants/chineseTheme'

type Props = {
  level: string
  learnedChars: string[]
  onSelect: (c: string) => void
}

export default function SmartQuickChars({ level, learnedChars, onSelect }: Props) {
  const [chars, setChars] = useState<string[]>([])
  const learnedKey = learnedChars.join(',')

  useEffect(() => {
    fetchSmartChars(level, learnedChars).then(setChars)
  }, [level, learnedKey])

  if (!chars.length) return null

  return (
    <>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.2em',
        color: 'var(--fg3)',
        marginBottom: 8,
        fontFamily: 'var(--font-latin)',
        textTransform: 'uppercase',
      }}>
        {level} 推荐
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {chars.map(c => (
          <motion.button key={c} whileTap={{ scale: 0.88 }} onClick={() => onSelect(c)}
            style={{
              ...SOLID_CARD,
              padding: '8px 14px',
              borderRadius: 14,
              border: '1px solid var(--line-clay)',
              fontSize: 18,
              fontFamily: 'var(--font-serif)',
              color: 'var(--fg1)',
              cursor: 'pointer',
            }}>
            {c}
          </motion.button>
        ))}
      </div>
    </>
  )
}
