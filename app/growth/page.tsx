'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useApp } from '@/app/context/AppContext'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const ChildAvatar = nextDynamic(() => import('@/app/components/ChildAvatar'), { ssr: false })
function FallingLeaves() {
  const leaves = [
    { id: 0, sx: 28, dur: 12, d: 0,   size: 13, r: 20  },
    { id: 1, sx: 58, dur: 15, d: 3.5, size: 10, r: -38 },
    { id: 2, sx: 42, dur: 10, d: 7,   size: 12, r: 42  },
    { id: 3, sx: 72, dur: 14, d: 1.8, size: 9,  r: -22 },
    { id: 4, sx: 18, dur: 13, d: 9,   size: 11, r: 55  },
    { id: 5, sx: 82, dur: 11, d: 5,   size: 8,  r: -30 },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 35 }}>
      {leaves.map(l => (
        <motion.div key={l.id}
          initial={{ y: '-4vh', x: `${l.sx}vw`, opacity: 0.55, rotate: l.r }}
          animate={{
            y: '108vh',
            x: [`${l.sx}vw`, `${l.sx + 7}vw`, `${l.sx + 2}vw`, `${l.sx + 10}vw`],
            opacity: [0.55, 0.42, 0.28, 0],
            rotate: [l.r, l.r + 80, l.r + 160, l.r + 240],
          }}
          transition={{ duration: l.dur, delay: l.d, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', fontSize: `${l.size}px` }}
        >🍃</motion.div>
      ))}
    </div>
  )
}

export default function GrowthPage() {
  const router = useRouter()
  const { activeKid } = useApp()

  return (
    <main style={{
      position: 'fixed', inset: 0,
      width: '100dvw', height: '100dvh',
      overflow: 'hidden',
      backgroundColor: '#fbf9f6',
      fontFamily: "'Noto Serif SC', Georgia, serif",
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('/forest-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,40,10,0.08)' }} />

      <ChildAvatar />

      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push('/growth/academic')}
        style={{
          position: 'absolute',
          left: '50%', top: '30vh',
          transform: 'translateX(-50%)',
          zIndex: 50,
          background: 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 18,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
          cursor: 'pointer',
          width: 'min(280px, 75vw)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(164,99,85,0.12)',
          border: '1px solid rgba(164,99,85,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>🏆</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#2d322f',
            letterSpacing: '0.08em',
            lineHeight: 1.3,
          }}>
            {activeKid ? `${activeKid.name}的学业` : '学业成长'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(45,50,47,0.5)', marginTop: 3, letterSpacing: '0.06em' }}>
            升学规划 · 成长档案
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(45,50,47,0.35)', flexShrink: 0 }}>›</div>
      </motion.button>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push('/learn')}
        style={{
          position: 'absolute',
          left: '50%', top: '62vh',
          transform: 'translateX(-50%)',
          zIndex: 50,
          background: 'rgba(255,255,255,0.8)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 18,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
          cursor: 'pointer',
          width: 'min(280px, 75vw)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(164,99,85,0.12)',
          border: '1px solid rgba(164,99,85,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>📖</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#2d322f',
            letterSpacing: '0.08em',
            lineHeight: 1.3,
          }}>
            根·中文
          </div>
          <div style={{ fontSize: 11, color: 'rgba(45,50,47,0.5)', marginTop: 3, letterSpacing: '0.06em' }}>
            字理解码 · 成语 · 文化句
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(45,50,47,0.35)', flexShrink: 0 }}>›</div>
      </motion.button>

      <FallingLeaves />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      `}</style>
    </main>
  )
}
