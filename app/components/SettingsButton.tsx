'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Volume2, VolumeX, X, User, Baby } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'
import { THEME } from '@/app/_shared/_constants/theme'

export default function SettingsButton() {
  const router = useRouter()
  const { speechEnabled, toggleSpeech } = useApp()
  const [open, setOpen] = useState(false)

  const goTo = (path: string) => { setOpen(false); router.push(path) }

  return (
    <>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(!open)}
        style={{ width: 52, height: 46, borderRadius: 23,
          background: open ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer' }}>
        <Settings size={21} color={open ? THEME.gold : THEME.text} strokeWidth={1.8} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(0,0,0,0.1)' }} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ position: 'fixed',
                bottom: 'max(calc(env(safe-area-inset-bottom) + 80px), 90px)',
                right: 16, zIndex: 199, width: 220,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px)',
                borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                overflow: 'hidden' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>设置</span>
                <motion.div whileTap={{ scale: 0.85 }} onClick={() => setOpen(false)}
                  style={{ cursor: 'pointer', opacity: 0.3 }}>
                  <X size={16} />
                </motion.div>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* 语音开关 */}
                <motion.div whileTap={{ scale: 0.98 }} onClick={toggleSpeech}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    background: speechEnabled ? 'rgba(176,141,87,0.08)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${speechEnabled ? 'rgba(176,141,87,0.2)' : 'rgba(0,0,0,0.06)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {speechEnabled
                      ? <Volume2 size={16} color={THEME.gold} />
                      : <VolumeX size={16} color={THEME.muted} />}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>语音播报</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                        {speechEnabled ? '已开启' : '已关闭'}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 12,
                    background: speechEnabled ? THEME.gold : 'rgba(0,0,0,0.15)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <motion.div animate={{ x: speechEnabled ? 22 : 2 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      style={{ position: 'absolute', top: 2, width: 20, height: 20,
                        borderRadius: '50%', background: 'white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => goTo('/profile?mode=edit')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <User size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>家长资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>证件 · 地址 · 紧急联系</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => goTo('/children')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Baby size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>孩子资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>学校 · 健康 · 日程</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => {
                  const activeChildId = localStorage.getItem('active_child_id')
                  goTo(activeChildId ? `/children/${activeChildId}/activities` : '/children')
                }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>课外活动</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>兴趣班 · 补习课管理</div>
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
