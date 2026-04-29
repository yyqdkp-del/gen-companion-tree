'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

const supabase = createClient(
)

const LINE_CLIENT_ID = process.env.NEXT_PUBLIC_LINE_CLIENT_ID || '2009745649'

export default function AuthPage() {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentAI, setConsentAI] = useState(false)
  

  useEffect(() => {
    // 检测是否是 PWA standalone 模式
  
    supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) window.location.href = '/'
})
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) setError('登录失败，请重试')
    if (params.get('mode') === 'login') setMode('login')
  }, [])

  const saveChildData = async (userId: string) => {
    try {
      const raw = localStorage.getItem('child_assessment')
      if (!raw) return
      const { name, grade, school } = JSON.parse(raw)
      if (!name) return
      await supabase.from('children').insert({ user_id: userId, name, grade, school_short: school })
      localStorage.removeItem('child_assessment')
    } catch {}
  }

  const handleSubmit = async () => {
    if (mode === 'register' && !consentPrivacy) {
      setError('请先同意隐私政策')
      return
    }
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        if (data.user) {
          await saveChildData(data.user.id)
          await supabase.from('user_consents').upsert({
            user_id: data.user.id,
            privacy_agreed: consentPrivacy,
            ai_training_agreed: consentAI,
            version: '1.0',
          })
        }
        setDone(true)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('邮箱或密码错误'); setLoading(false); return }
       if (data.user) await saveChildData(data.user.id)
window.location.href = '/'
      }
    } catch {
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  const handleLine = () => {
    setLineLoading(true)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback/line`,
      state: Math.random().toString(36).slice(2),
      scope: 'profile openid',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }
  
  // ── 邮件发送完成 ──
  if (done) return (
    <main style={styles.main}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.card}
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A3C5E', marginBottom: 8, fontFamily: 'Noto Serif SC, serif' }}>
            验证邮件已发送
          </div>
          <div style={{ fontSize: 14, color: '#6B8BAA', lineHeight: 1.8, marginBottom: 28 }}>
            请检查 <strong style={{ color: '#1A3C5E' }}>{email}</strong><br />
            点击邮件中的链接完成注册
          </div>
          <button onClick={() => { window.location.href = '/' }} style={styles.btnPrimary}>
            先去看看 →
          </button>
        </div>
      </motion.div>
    </main>
  )

  return (
    <main style={styles.main}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={styles.card}
      >
        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: 6, color: '#B08D57', marginBottom: 6, fontFamily: 'Noto Serif SC, serif' }}>
            根·陪伴
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A3C5E', fontFamily: 'Noto Serif SC, serif' }}>
            {mode === 'register' ? '创建你的家庭账号' : '欢迎回来'}
          </div>
          <div style={{ fontSize: 13, color: '#6B8BAA', marginTop: 6 }}>
            {mode === 'register' ? '海外华人家庭的智能陪伴助手' : '继续你的家庭陪伴之旅'}
          </div>
        </div>

        {/* ── LINE按钮 ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLine}
          disabled={lineLoading}
          style={{ ...styles.btnLine, opacity: lineLoading ? 0.8 : 1 }}
        >
          {lineLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }}
              />
              正在跳转 LINE…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.141h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                用 LINE {mode === 'register' ? '注册' : '登录'}
              </span>
            </span>
          )}
        </motion.button>

        {/* ── Google按钮 ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGoogle}
          style={styles.btnGoogle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A2B3C' }}>
            用 Google {mode === 'register' ? '注册' : '登录'}
          </span>
        </motion.button>

        {/* ── 分割线 ── */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>或用邮箱</span>
          <div style={styles.dividerLine} />
        </div>

        {/* ── 邮箱输入 ── */}
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="邮箱地址"
          type="email"
          autoComplete="email"
          style={styles.input}
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="密码（6位以上）"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ ...styles.input, marginBottom: mode === 'register' ? 16 : 20 }}
        />

        {/* ── 注册协议 ── */}
        <AnimatePresence>
          {mode === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 20 }}
            >
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={e => setConsentPrivacy(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{ fontSize: 13, color: '#6B8BAA', lineHeight: 1.6 }}>
                  我已阅读并同意
                  <a href="/privacy" target="_blank" style={styles.link}>隐私政策</a>
                  和
                  <a href="/terms" target="_blank" style={styles.link}>服务条款</a>
                  <span style={{ color: '#E8892A' }}> *</span>
                </span>
              </label>
              <label style={{ ...styles.checkLabel, marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={consentAI}
                  onChange={e => setConsentAI(e.target.checked)}
                  style={styles.checkbox}
                />
                <span style={{ fontSize: 13, color: '#6B8BAA', lineHeight: 1.6 }}>
                  同意将使用数据用于改进AI（可选，帮助根更懂你）
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 错误提示 ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 13, color: '#E8892A', marginBottom: 12, textAlign: 'center', padding: '8px 12px', background: 'rgba(232,137,42,0.08)', borderRadius: 8 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 提交按钮 ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading || !email || !password || (mode === 'register' && !consentPrivacy)}
          style={{
            ...styles.btnPrimary,
            opacity: (!email || !password || (mode === 'register' && !consentPrivacy)) ? 0.5 : 1,
            cursor: (!email || !password || (mode === 'register' && !consentPrivacy)) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '处理中…' : mode === 'register' ? '创建账号 →' : '登录 →'}
        </motion.button>

        {/* ── 切换登录/注册 ── */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B8BAA' }}>
          {mode === 'register' ? '已有账号？' : '还没有账号？'}
          <button
            onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#E8892A', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 4 }}
          >
            {mode === 'register' ? '直接登录' : '立即注册'}
          </button>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input { font-family: 'Noto Sans SC', sans-serif; }
        button { font-family: 'Noto Sans SC', sans-serif; }
      `}</style>
    </main>
  )
}

const styles = {
  main: {
    minHeight: '100dvh',
    background: 'linear-gradient(180deg, #EEF5FB 0%, #F5F0F8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px',
    fontFamily: "'Noto Sans SC', sans-serif",
  } as React.CSSProperties,

  card: {
    width: '100%',
    maxWidth: 400,
    background: '#FFFFFF',
    borderRadius: 24,
    padding: '36px 28px 32px',
    boxShadow: '0 8px 40px rgba(26,60,94,0.10)',
  } as React.CSSProperties,

  btnLine: {
    width: '100%',
    padding: '16px',
    background: '#06C755',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 12,
    boxShadow: '0 4px 16px rgba(6,199,85,0.3)',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  btnGoogle: {
    width: '100%',
    padding: '14px',
    background: '#fff',
    color: '#1A2B3C',
    border: '1.5px solid #D0DFF0',
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  } as React.CSSProperties,

  btnPrimary: {
    width: '100%',
    padding: '15px',
    background: '#1A3C5E',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  } as React.CSSProperties,

  dividerLine: {
    flex: 1,
    height: 1,
    background: '#E8EFF6',
  } as React.CSSProperties,

  dividerText: {
    fontSize: 12,
    color: '#9BB0C4',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '14px 16px',
    border: '1.5px solid #D0DFF0',
    borderRadius: 12,
    fontSize: 15,
    color: '#1A2B3C',
    outline: 'none',
    marginBottom: 12,
    background: '#F8FAFC',
    transition: 'border 0.2s',
  } as React.CSSProperties,

  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    cursor: 'pointer',
  } as React.CSSProperties,

  checkbox: {
    marginTop: 3,
    accentColor: '#1A3C5E',
    flexShrink: 0,
    width: 16,
    height: 16,
  } as React.CSSProperties,

  link: {
    color: '#1A3C5E',
    textDecoration: 'underline',
    margin: '0 3px',
  } as React.CSSProperties,
}
