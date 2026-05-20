'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchSmartChars } from '@/app/_shared/_services/chineseService'

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
        color: 'rgba(45,50,47,0.4)',
        marginBottom: 8,
        fontFamily: "'Montserrat', sans-serif",
        textTransform: 'uppercase',
      }}>
        {level} 推荐
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {chars.map(c => (
          <motion.button key={c} whileTap={{ scale: 0.88 }} onClick={() => onSelect(c)}
            style={{
              padding: '8px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(164,99,85,0.12)',
              fontSize: 18,
              fontFamily: "'Noto Serif SC', serif",
              color: '#2d322f',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(45,50,47,0.06)',
              backdropFilter: 'blur(8px)',
            }}>
            {c}
          </motion.button>
        ))}
      </div>
    </>
  )
}
