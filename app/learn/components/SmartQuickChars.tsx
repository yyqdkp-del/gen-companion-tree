'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { fetchSmartChars } from '@/app/_shared/_services/chineseService'

type Props = {
  level: string
  learnedChars: string[]
  onSelect: (c: string) => void
}

export default function SmartQuickChars({ level, learnedChars, onSelect }: Props) {
  const [chars, setChars] = useState<string[]>([])

  useEffect(() => {
    fetchSmartChars(level, learnedChars).then(setChars)
  }, [level, learnedChars.length])

  if (!chars.length) return null

  return (
    <>
      <div style={{ fontSize: 10, color: T.textDim, letterSpacing: 3,
        marginBottom: 8, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
        {level} 推荐
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {chars.map(c => (
          <motion.button key={c} whileTap={{ scale: 0.88 }} onClick={() => onSelect(c)}
            style={{ width: 38, height: 38, background: T.paper,
              border: '1.5px solid rgba(200,160,96,0.28)', borderRadius: 10,
              fontSize: 20, fontFamily: "'Noto Serif SC', serif",
              color: T.textMid, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {c}
          </motion.button>
        ))}
      </div>
    </>
  )
}
