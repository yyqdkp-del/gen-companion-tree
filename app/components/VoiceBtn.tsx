'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'

const G = { bg: '#E1F5EE', border: '#9FE1CB', mid: '#5DCAA5', dark: '#0F6E56' }

export function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const enabled = localStorage.getItem('speech_enabled')
  if (enabled === 'false') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

export default function VoiceBtn({ text }: { text: string }) {
  const [active, setActive] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    speak(text)
    setActive(true)
    setTimeout(() => setActive(false), 1400)
  }
  return (
    <motion.button whileTap={{ scale: 0.86 }} onClick={handle}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '4px 8px', borderRadius: 20,
        border: `0.5px solid ${G.border}`,
        background: active ? G.mid : 'rgba(255,255,255,0.55)',
        cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
      }}>
      <Volume2 size={11} color={active ? '#fff' : G.dark} />
      <span style={{ fontSize: 10, color: active ? '#fff' : G.dark, fontWeight: 500 }}>播报</span>
    </motion.button>
  )
}
