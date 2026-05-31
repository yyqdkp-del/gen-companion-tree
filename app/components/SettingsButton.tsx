'use client'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Volume2, VolumeX, X, User, Baby, Car, Plane, Sparkles, LogIn } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'
import { THEME } from '@/app/_shared/_constants/theme'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

const menuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 12,
  cursor: 'pointer',
  background: 'rgba(0,0,0,0.03)',
  border: '1px solid rgba(0,0,0,0.06)',
}

export default function SettingsButton() {
  const router = useRouter()
  const { speechEnabled, toggleSpeech, userId, sessionReady } = useApp()
  const [open, setOpen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [managingSubscription, setManagingSubscription] = useState(false)

  const goTo = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const requireAuth = (path: string) => {
    if (!userId) {
      goTo(`/auth?next=${encodeURIComponent(path)}`)
      return
    }
    goTo(path)
  }

  useEffect(() => {
    if (!open || !userId) {
      setIsPro(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetchWithAuth('/api/pro/status')
        const data = await res.json().catch(() => ({}))
        if (!cancelled) setIsPro(!!data?.is_pro)
      } catch {
        if (!cancelled) setIsPro(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId])

  const handleSubscription = useCallback(async () => {
    if (!userId) {
      goTo('/auth?next=/upgrade')
      return
    }
    if (!isPro) {
      goTo('/upgrade')
      return
    }
    setManagingSubscription(true)
    try {
      const res = await fetchWithAuth('/api/paddle/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        setOpen(false)
        if (typeof data.url === 'string' && data.url.startsWith('/')) {
          router.push(data.url)
        } else {
          window.open(data.url, '_blank', 'noopener,noreferrer')
        }
      }
    } catch {
      goTo('/upgrade')
    } finally {
      setManagingSubscription(false)
    }
  }, [userId, isPro, router])

  const loggedIn = !!userId
  const showLoginPrompt = sessionReady && !userId

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
                bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 20px)',
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

                {loggedIn && (
                  <motion.div
                    whileTap={{ scale: isPro && managingSubscription ? 1 : 0.98 }}
                    onClick={() => {
                      if (isPro) void handleSubscription()
                      else goTo('/upgrade')
                    }}
                    style={{
                      padding: '8px 12px',
                      marginBottom: 8,
                      borderRadius: 10,
                      background: isPro ? 'rgba(34,197,94,0.12)' : 'rgba(164,99,85,0.1)',
                      border: isPro ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(164,99,85,0.2)',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      cursor: isPro ? (managingSubscription ? 'wait' : 'pointer') : 'pointer',
                      opacity: managingSubscription ? 0.7 : 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: isPro ? '#166534' : '#a46355',
                      textAlign: 'center',
                    }}
                  >
                    {isPro
                      ? (managingSubscription ? '打开中…' : '✓ 根陪伴 Pro')
                      : '🌱 升级 Pro · 解锁全部功能'}
                  </motion.div>
                )}

                {showLoginPrompt && (
                  <motion.div whileTap={{ scale: 0.98 }} onClick={() => goTo('/auth?next=/')}
                    style={{
                      ...menuItemStyle,
                      background: 'rgba(164,99,85,0.12)',
                      border: '1px solid rgba(164,99,85,0.25)',
                    }}>
                    <LogIn size={16} color={THEME.gold} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>登录 / 注册</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>登录后同步家庭数据</div>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  whileTap={{ scale: managingSubscription ? 1 : 0.98 }}
                  onClick={() => void handleSubscription()}
                  style={{
                    ...menuItemStyle,
                    background: isPro ? 'rgba(164,99,85,0.08)' : 'rgba(92,122,94,0.06)',
                    border: `1px solid ${isPro ? 'rgba(164,99,85,0.2)' : 'rgba(92,122,94,0.15)'}`,
                    opacity: managingSubscription ? 0.7 : 1,
                  }}
                >
                  <Sparkles size={16} color={isPro ? THEME.gold : '#5c7a5e'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>
                      {loggedIn ? (isPro ? '根陪伴 Pro' : '升级 Pro') : '根陪伴 Pro'}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                      {managingSubscription
                        ? '打开中…'
                        : loggedIn
                          ? isPro
                            ? '管理订阅'
                            : '解锁全部功能'
                          : '登录后订阅'}
                    </div>
                  </div>
                </motion.div>

                {/* 语音开关 */}
                <motion.div whileTap={{ scale: 0.98 }} onClick={toggleSpeech}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    background: speechEnabled ? 'rgba(164,99,85,0.08)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${speechEnabled ? 'rgba(164,99,85,0.2)' : 'rgba(0,0,0,0.06)'}` }}>
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

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => requireAuth('/profile?mode=edit')}
                  style={menuItemStyle}>
                  <User size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>家长资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>证件 · 地址 · 紧急联系</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => requireAuth('/children')}
                  style={menuItemStyle}>
                  <Baby size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>孩子资料</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>学校 · 健康 · 日程</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => {
                  const activeChildId = localStorage.getItem('active_child_id')
                  requireAuth(activeChildId ? `/children/${activeChildId}/activities` : '/children')
                }}
                  style={menuItemStyle}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>课外活动</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>兴趣班 · 补习课管理</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => requireAuth('/vehicles')}
                  style={menuItemStyle}>
                  <Car size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>车辆档案</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>保险 · 年检 · 事故备忘</div>
                  </div>
                </motion.div>

                <motion.div whileTap={{ scale: 0.98 }} onClick={() => requireAuth('/travel')}
                  style={menuItemStyle}>
                  <Plane size={16} color={THEME.muted} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>旅行与机票</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>行程规划 · 比价与购票建议</div>
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
