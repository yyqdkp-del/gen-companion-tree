'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Volume2, VolumeX, X, User, Baby } from 'lucide-react'

const STORAGE_KEY = 'speech_enabled'
const THEME = { text: '#2C3E50', gold: '#B08D57', navy: '#1A3C5E', muted: '#6B8BAA' }

export default function SettingsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setEnabled(stored === 'true')
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem(STORAGE_KEY, String(next))
    if (!next) window.speechSynthesis?.cancel()
  }

  const goTo = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  if (!mounted) return null

  return (
    <>
      {/* 齿轮按钮：内嵌在 InputBar 里使用 */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(!open)}
        style={{
          width: 52, height: 46, borderRadius: 23,
          background: open ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
        <Settings size={21} color={open ? THEME.gold : THEME.text} strokeWidth={1.8} />
      </motion.button>

      {/* 设置面板：从底部弹出 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.1)' }} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 'max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
                right: 16,
                zIndex: 199,
                width: 220,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(40px)',
                borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                overflow: 'hidden',
              }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text, letterSpacing: '0.05em' }}>设置</span>
                <motion.div whileTap={{ scale: 0.85 }} onClick={() => setOpen(false)} style={{ cursor: 'pointer', opacity: 0.3 }}>
                  <X size={16} />
                </motion.div>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                <motion.div whileTap={{ scale: 0.98 }} onClick={toggle}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: enabled ? 'rgba(176,141,87,0.08)' : 'rgba(0,0,0,0.03)', border: `1px solid ${enabled ? 'rgba(176,141,87,0.2)' : 'rgba(0,0,0,0.06)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {enabled ? <Volume2 size={16} color={THEME.gold} /> : <VolumeX size={16} color={THEME.muted} />}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>语音播报</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>{enabled ? '已开启' : '已关闭'}</div>
                    </div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: enabled ? THEME.gold : 'rgba(0,0,0,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <motion.div animate={{ x: enabled ? 22 : 2 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => goTo('/profile?mode=edit')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <User size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>家长资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>证件 · 地址 · 紧急联系</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => goTo('/children')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Baby size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>孩子资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>学校 · 健康 · 日程</div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
