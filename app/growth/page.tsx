'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { useApp } from '@/app/context/AppContext'
import ChildAvatar from '@/app/components/ChildAvatar'

export const dynamic = 'force-dynamic'

const supabase = createClient()

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
  const { kids } = useApp()
  const [activeKidName, setActiveKidName] = useState('')

  // 读当前选中孩子名字，监听切换事件
  const readActive = useCallback(() => {
    try {
      const raw = localStorage.getItem('active_child')
      if (raw) {
        const c = JSON.parse(raw)
        setActiveKidName(c.name || '')
      }
    } catch {}
  }, [])

  useEffect(() => {
    readActive()
    window.addEventListener('child-changed', readActive)
    return () => window.removeEventListener('child-changed', readActive)
  }, [readActive])

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
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,40,10,0.08)' }} />

      {/* ══ 左上角孩子头像（与主页一致） ══ */}
      <div style={{ position: 'absolute', top: 'max(48px, env(safe-area-inset-top, 48px))', left: '5%', zIndex: 100 }}>
        <ChildAvatar
          size={68}
          showName={true}
          showEnergy={true}
          onSelect={(kid) => {
            localStorage.setItem('active_child_id', kid.id)
            localStorage.setItem('active_child', JSON.stringify({
              id: kid.id, name: kid.name, grade: kid.grade,
              level: kid.level || 'R2', emoji: kid.emoji || '👶🏻', school: kid.school,
            }))
            window.dispatchEvent(new Event('child-changed'))
            setActiveKidName(kid.name || '')
          }}
        />
      </div>

      {/* ══ 学业成长入口 — 上半屏中部 ══ */}
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
          background: 'rgba(20,12,4,0.52)',
          border: '1px solid rgba(240,192,64,0.45)',
          borderRadius: 16,
          backdropFilter: 'blur(14px)',
          cursor: 'pointer',
          width: 'min(280px, 75vw)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(240,192,64,0.15)',
          border: '1px solid rgba(240,192,64,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>🏆</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#FFE080',
            letterSpacing: '0.08em',
            textShadow: '0 0 10px rgba(255,180,0,0.7)',
            lineHeight: 1.3,
          }}>
            {activeKidName ? `${activeKidName}的学业` : '学业成长'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,220,120,0.6)', marginTop: 3, letterSpacing: '0.06em' }}>
            升学规划 · 成长档案
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,220,120,0.5)', flexShrink: 0 }}>›</div>
      </motion.button>

      {/* ══ 根·中文入口 — 下半屏中部 ══ */}
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
          background: 'rgba(20,4,4,0.52)',
          border: '1px solid rgba(192,57,43,0.45)',
          borderRadius: 16,
          backdropFilter: 'blur(14px)',
          cursor: 'pointer',
          width: 'min(280px, 75vw)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'rgba(192,57,43,0.15)',
          border: '1px solid rgba(192,57,43,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>📖</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#FFE080',
            letterSpacing: '0.08em',
            textShadow: '0 0 10px rgba(255,100,80,0.7)',
            lineHeight: 1.3,
          }}>
            根·中文
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,220,120,0.6)', marginTop: 3, letterSpacing: '0.06em' }}>
            字理解码 · 成语 · 文化句
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,220,120,0.5)', flexShrink: 0 }}>›</div>
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
