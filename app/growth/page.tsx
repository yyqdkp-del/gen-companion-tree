'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export const dynamic = 'force-dynamic'

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

  return (
    <main style={{
      position: 'fixed', inset: 0,
      width: '100dvw', height: '100dvh',
      overflow: 'hidden',
      fontFamily: "'Noto Serif SC', Georgia, serif",
    }}>
      {/* 背景图 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('/forest-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* 遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,40,10,0.08)' }} />

      {/* ══ 学业成长入口 — 上半屏中部 ══ */}
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push('/growth/academic')}
        style={{
          position: 'absolute',
          left: '50%',
          top: '28vh',
          transform: 'translateX(-50%)',
          zIndex: 50,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <motion.div
          animate={{ opacity: [0.25, 0.65, 0.25], scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: '-20px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(240,192,64,0.32) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <motion.span
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            fontSize: '15px', fontWeight: 700,
            color: '#FFE080', letterSpacing: '0.12em',
            textShadow: '0 0 12px rgba(255,180,0,0.95), 0 1px 4px rgba(0,0,0,0.6)',
            lineHeight: 1.3, textAlign: 'center',
          }}
        >
          学业成长
        </motion.span>
        <span style={{
          fontSize: '10px', color: 'rgba(255,220,120,0.8)',
          letterSpacing: '0.18em',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}>
          进入
        </span>
      </motion.button>

      {/* ══ 根·中文入口 — 下半屏中部 ══ */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push('/learn')}
        style={{
          position: 'absolute',
          left: '50%',
          top: '62vh',
          transform: 'translateX(-50%)',
          zIndex: 50,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <motion.div
          animate={{ opacity: [0.25, 0.65, 0.25], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: '-20px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,210,80,0.32) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <motion.span
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            fontSize: '15px', fontWeight: 700,
            color: '#FFE080', letterSpacing: '0.12em',
            textShadow: '0 0 12px rgba(255,180,0,0.95), 0 1px 4px rgba(0,0,0,0.6)',
            lineHeight: 1.3, textAlign: 'center',
          }}
        >
          根·中文
        </motion.span>
        <span style={{
          fontSize: '10px', color: 'rgba(255,220,120,0.8)',
          letterSpacing: '0.18em',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}>
          进入
        </span>
      </motion.button>

      {/* 飘落树叶 */}
      <FallingLeaves />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
      `}</style>
    </main>
  )
}
