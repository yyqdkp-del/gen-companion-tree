'use client'
import React from 'react'
import { useApp } from '@/app/context/AppContext'

export default function VoiceBtn({ text }: { text: string }) {
  const { speak, speechEnabled } = useApp()
  if (!speechEnabled) return null
  return (
    <button
      onClick={() => speak(text)}
      style={{ background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 16, opacity: 0.6, padding: '4px' }}
      title="朗读">
      🔊
    </button>
  )
}
