'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveSessionBundle } from '@/lib/auth/saveSessionBundle'
import {
  navigateAfterAuth,
  sanitizeAuthNext,
  stashAuthNextFromUrl,
} from '@/lib/auth/authNextPath'
import { motion } from 'framer-motion'

const supabase = createClient()

const LINE_CLIENT_ID = process.env.NEXT_PUBLIC_LINE_CLIENT_ID || '2009745649'
const EMAIL_VERIFY_PENDING_KEY = 'auth_email_verify_pending'

const VALUE_POINTS = [
  '📅 自动整理学校通知',
  '⚠️ 签证到期提醒',
  '🌙 深夜情感陪伴',
] as const

function formatAuthError(message: string, code?: string): string {
  const m = message.toLowerCase()
  if (code === 'refresh_token_not_found') return '登录已过期，请重新登录'
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return '邮箱或密码不正确，请检查后重试'
  }
  if (m.includes('email not confirmed')) return '请先点击邮件中的验证链接，再登录'
  if (m.includes('user already registered')) return '该邮箱已注册，请切换到「登录」'
  if (m.includes('password') && m.includes('6')) return '密码至少需要 6 位'
  if (m.includes('valid email')) return '请输入有效的邮箱地址'
  if (m.includes('signup is disabled')) return '当前暂不支持新用户注册'
  if (m.includes('rate limit')) return '操作过于频繁，请稍后再试'
  if (m.includes('network') || m.includes('fetch')) return '网络连接失败，请检查网络后重试'
  return message || '操作失败，请重试'
}

const ERROR_MAP: Record<string, string> = {
  no_code: '登录链接已失效，请重新登录',
  exchange_failed: 'Google 登录失败，请重试',
  server_error: '服务器暂时异常，请稍后重试',
  line_failed: 'LINE 登录失败，请重试',
  callback: '登录过程中断，请重新登录',
  callback_failed: 'Google 登录失败，请重试或改用邮箱登录',
  session: '登录状态已过期，请重新登录',
  'Multiple accounts': '该邮箱已注册，请直接登录',
  unexpected_failure: '登录失败，请重试',
}

function mapUrlAuthError(error: string, msg?: string): string {
  if (ERROR_MAP[error]) return ERROR_MAP[error]
  if (msg?.includes('Multiple accounts')) return ERROR_MAP['Multiple accounts']
  if (msg?.includes('email')) return '邮箱相关错误，请用邮箱密码登录'
  return '登录失败，请重试'
}

function isMultipleAccountsConflict(params: URLSearchParams): boolean {
  const desc = params.get('error_description') ?? ''
  const err = params.get('error') ?? ''
  const msg = params.get('msg') ?? ''
  return desc.includes('Multiple accounts')
    || err.includes('Multiple accounts')
    || msg.includes('Multiple accounts')
}

function clearOAuthErrorParams() {
  const url = new URL(window.location.href)
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  url.searchParams.delete('msg')
  const qs = url.searchParams.toString()
  window.history.replaceState({}, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

async function ensureAuthSession(email: string, password: string): Promise<boolean> {
  let session = (await supabase.auth.getSession()).data.session
  if (!session) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return false
    session = data.session
  }
  if (!session) return false
  await saveSessionBundle(session)
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_user_id', session.user.id)
  }
  return true
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LineLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#06C755" aria-hidden>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.141h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function Spinner({ color = 'var(--clay)' }: { color?: string }) {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'authSpin 0.8s linear infinite',
      }}
    />
  )
}

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [exploreLoading, setExploreLoading] = useState(false)
  const [consentPrivacy, setConsentPrivacy] = useState(false)
  const [consentAI, setConsentAI] = useState(false)
  const [returnPath, setReturnPath] = useState('/')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReturnPath(stashAuthNextFromUrl(params))

    const urlError = params.get('error')
    if (!isMultipleAccountsConflict(params) && urlError) {
      setError(mapUrlAuthError(urlError, params.get('msg') ?? params.get('error_description') ?? undefined))
    }
    if (params.get('mode') === 'register') setMode('register')
    if (params.get('mode') === 'login') setMode('login')
    if (params.get('mode') === 'forgot') setMode('forgot')

    const pendingEmail = sessionStorage.getItem(EMAIL_VERIFY_PENDING_KEY)
    if (pendingEmail) {
      setEmail(pendingEmail)
      setDone(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      fetch('/api/auth/check', { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (!data.authenticated) return
          const explicitNext = params.get('next')
          if (explicitNext) {
            navigateAfterAuth(router, sanitizeAuthNext(explicitNext))
          } else {
            router.replace('/')
          }
        })
        .catch(() => {})
    })
  }, [router])

  const saveChildData = async (userId: string) => {
    try {
      const raw =
        localStorage.getItem('onboarding_child') ||
        localStorage.getItem('child_assessment')
      if (!raw) return
      let child: {
        name?: string
        grade?: string
        school?: string
        school_name?: string
        emoji?: string
      } | null = null
      try {
        child = JSON.parse(raw)
      } catch {
        child = null
      }
      if (!child?.name) return

      const schoolName = child.school_name || child.school || ''
      const { data, error: insertError } = await supabase
        .from('children')
        .insert({
          user_id: userId,
          name: child.name,
          emoji: child.emoji || '👶🏻',
          grade: child.grade || null,
          school_name: schoolName || null,
          school_short: schoolName || null,
        })
        .select('id')
        .single()

      if (insertError) {
        console.warn('saveChildData children insert:', insertError.message)
        return
      }

      if (data?.id) {
        const { error: profileError } = await supabase.from('child_profiles').upsert(
          {
            child_id: data.id,
            user_id: userId,
            class_schedule: {},
            activities: [],
          },
          { onConflict: 'child_id' },
        )
        if (profileError) {
          console.warn('saveChildData child_profiles upsert:', profileError.message)
        }
      }

      localStorage.removeItem('onboarding_child')
      localStorage.removeItem('child_assessment')
    } catch (e) {
      console.warn('saveChildData error:', e)
    }
  }

  const handleSubmit = async () => {
    if (mode === 'register' && !consentPrivacy) {
      setError('注册前请先勾选并同意隐私政策')
      return
    }
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    if (!password || password.length < 6) {
      setError('密码至少需要 6 位')
      return
    }

    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) {
          setError(formatAuthError(signUpError.message, signUpError.code))
          return
        }
        if (data.user) {
          await saveChildData(data.user.id)
          await supabase.from('user_consents').upsert({
            user_id: data.user.id,
            privacy_agreed: consentPrivacy,
            ai_training_agreed: consentAI,
            version: '1.0',
          })
        }
        if (data.session) {
          await saveSessionBundle(data.session)
        } else {
          await ensureAuthSession(email, password)
        }
        sessionStorage.setItem(EMAIL_VERIFY_PENDING_KEY, email)
        setDone(true)
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError(formatAuthError(signInError.message, signInError.code))
          return
        }
        if (data.user) await saveChildData(data.user.id)
        if (data.session) await saveSessionBundle(data.session)

        const checkRes = await fetch('/api/auth/check', { credentials: 'include' })
        const checkData = await checkRes.json()

        if (checkData.authenticated) {
          navigateAfterAuth(router)
        } else {
          await new Promise((r) => setTimeout(r, 500))
          const retryRes = await fetch('/api/auth/check', { credentials: 'include' })
          const retryData = await retryRes.json()
          if (retryData.authenticated) {
            navigateAfterAuth(router)
          } else {
            setError('登录成功但会话未同步，请刷新页面或重新登录')
          }
        }
      }
    } catch (e) {
      console.error('[auth] submit failed:', e)
      setError(formatAuthError(e instanceof Error ? e.message : '网络连接失败，请检查网络后重试'))
    } finally {
      setLoading(false)
    }
  }

  const handleLine = () => {
    setLineLoading(true)
    setError('')
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback/line`,
      state: Math.random().toString(36).slice(2),
      scope: 'profile openid',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`
  }

  const handleGoAhead = async () => {
    setExploreLoading(true)
    setError('')
    try {
      const hasSession = await ensureAuthSession(email, password)
      if (hasSession) {
        const checkRes = await fetch('/api/auth/check', { credentials: 'include' })
        const checkData = await checkRes.json()
        if (checkData.authenticated) {
          sessionStorage.removeItem(EMAIL_VERIFY_PENDING_KEY)
          navigateAfterAuth(router, returnPath)
          return
        }
      }
      setError('请先点击邮件中的验证链接，完成验证后再进入')
    } catch (e) {
      console.error('[auth] go ahead failed:', e)
      setError(formatAuthError(e instanceof Error ? e.message : '网络连接失败，请稍后重试'))
    } finally {
      setExploreLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}`,
        },
      })
      if (oauthError) {
        setError(formatAuthError(oauthError.message, oauthError.code))
        setGoogleLoading(false)
      }
    } catch (e) {
      console.error('[auth] google oauth failed:', e)
      setError(formatAuthError(e instanceof Error ? e.message : 'Google 登录启动失败'))
      setGoogleLoading(false)
    }
  }

  const switchMode = (next: 'login' | 'register' | 'forgot') => {
    setMode(next)
    setError('')
  }

  const handleForgotSend = async () => {
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (resetError) {
        setError(formatAuthError(resetError.message, resetError.code))
        return
      }
      setDone(true)
    } catch (e) {
      console.error('[auth] reset password email failed:', e)
      setError(formatAuthError(e instanceof Error ? e.message : '网络连接失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const accountConflict = isMultipleAccountsConflict(searchParams)

  if (done) {
    const isForgotDone = mode === 'forgot'
    return (
      <main className="canvas-texture" style={S.page}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={S.verifyCard}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <h2 style={S.verifyTitle}>{isForgotDone ? '重置链接已发送' : '验证邮件已发送'}</h2>
          <p style={S.verifyDesc}>
            {isForgotDone ? (
              <>重置链接已发送到 <strong style={{ color: 'var(--text-primary)' }}>{email}</strong></>
            ) : (
              <>
                请检查 <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                <br />
                点击邮件中的链接完成注册
              </>
            )}
          </p>
          {!isForgotDone && (
            <button
              type="button"
              className="gc-btn"
              onClick={() => { void handleGoAhead() }}
              disabled={exploreLoading}
              style={{ width: '100%', height: 56, marginTop: 8 }}
            >
              {exploreLoading ? '进入中…' : '先去看看 →'}
            </button>
          )}
          {isForgotDone && (
            <button
              type="button"
              className="gc-btn"
              onClick={() => { setDone(false); switchMode('login') }}
              style={{ width: '100%', height: 56, marginTop: 8 }}
            >
              返回登录
            </button>
          )}
          {error && <p style={S.errorText}>{error}</p>}
        </motion.div>
        <style>{SPIN_KEYFRAMES}</style>
      </main>
    )
  }

  const submitDisabled =
    loading ||
    !email.trim() ||
    !password ||
    (mode === 'register' && !consentPrivacy)

  const forgotDisabled = loading || !email.trim()

  return (
    <main className="canvas-texture" style={S.page}>
      {/* ── 品牌区 40vh ── */}
      <section style={S.brand}>
        <div style={S.logoMark}>🌿</div>
        <p style={S.logoWordmark}>根·陪伴</p>
        <h1 style={S.heroTitle}>根</h1>
        <p style={S.heroSubtitle}>陪你在异乡，照顾好孩子</p>
        <div style={S.valueList}>
          {VALUE_POINTS.map((point) => (
            <span key={point} style={S.valueItem}>{point}</span>
          ))}
        </div>
      </section>

      {/* ── 主操作区 ── */}
      <section style={S.actions}>
        {(returnPath === '/upgrade' || returnPath.startsWith('/upgrade?')) && mode !== 'forgot' && (
          <div style={S.upgradeHint}>
            登录后将带你继续开通根陪伴 Pro
          </div>
        )}

        {accountConflict && (
          <div style={S.conflictCard}>
            <p style={S.conflictText}>
              检测到该 Google 邮箱已用邮箱密码注册
              <br />
              请直接用邮箱登录，或重置密码
            </p>
            <div style={S.conflictActions}>
              <button
                type="button"
                className="gc-btn"
                onClick={() => { clearOAuthErrorParams(); switchMode('login') }}
                style={S.conflictPrimaryBtn}
              >
                切换到邮箱登录
              </button>
              <button
                type="button"
                onClick={() => { clearOAuthErrorParams(); switchMode('forgot') }}
                style={S.conflictSecondaryBtn}
              >
                重置密码
              </button>
            </div>
          </div>
        )}

        {mode === 'forgot' ? (
          <>
            <h2 style={S.forgotTitle}>重置密码</h2>
            <p style={S.forgotSubtitle}>输入邮箱，根发送重置链接</p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱地址"
              type="email"
              autoComplete="email"
              style={S.input}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !forgotDisabled) void handleForgotSend()
              }}
            />
            {error && <p style={S.errorText}>{error}</p>}
            <button
              type="button"
              className="gc-btn"
              onClick={() => { void handleForgotSend() }}
              disabled={forgotDisabled}
              style={{
                width: '100%',
                height: 56,
                opacity: forgotDisabled ? 0.55 : 1,
                cursor: forgotDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '发送中…' : '发送重置链接'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={S.backLink}
            >
              ← 返回登录
            </button>
          </>
        ) : (
          <>
        <motion.button
          type="button"
          whileTap={{ scale: googleLoading ? 1 : 0.98 }}
          onClick={() => { void handleGoogle() }}
          disabled={googleLoading || lineLoading}
          style={S.googleBtn}
        >
          {googleLoading ? (
            <Spinner color="var(--text-primary)" />
          ) : (
            <GoogleLogo />
          )}
          <span>{googleLoading ? '正在跳转 Google…' : '用 Google 账号登录'}</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: lineLoading ? 1 : 0.98 }}
          onClick={handleLine}
          disabled={lineLoading || googleLoading}
          style={S.lineBtn}
        >
          {lineLoading ? <Spinner color="#06C755" /> : <LineLogo />}
          <span>{lineLoading ? '正在跳转 LINE…' : '用 LINE 账号登录'}</span>
        </motion.button>

        <div style={S.divider}>
          <span style={S.dividerLine} />
          <span style={S.dividerText}>或用邮箱</span>
          <span style={S.dividerLine} />
        </div>

        <div style={S.tabRow} role="tablist" aria-label="登录或注册">
          {(['login', 'register'] as const).map((tab) => {
            const active = mode === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(tab)}
                style={{
                  ...S.tabBtn,
                  ...(active ? S.tabBtnActive : {}),
                }}
              >
                {tab === 'login' ? '登录' : '注册'}
              </button>
            )
          })}
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱地址"
          type="email"
          autoComplete="email"
          style={S.input}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'register' ? '密码（6 位以上）' : '密码'}
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !submitDisabled) void handleSubmit()
          }}
          style={{ ...S.input, marginBottom: mode === 'register' ? 12 : 8 }}
        />

        {mode === 'login' && (
          <div style={S.forgotRow}>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              style={S.forgotLink}
            >
              忘记密码？
            </button>
          </div>
        )}

        {error && !accountConflict && <p style={S.errorText}>{error}</p>}

        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label style={S.checkLabel}>
              <input
                type="checkbox"
                checked={consentPrivacy}
                onChange={(e) => setConsentPrivacy(e.target.checked)}
                style={S.checkbox}
              />
              <span style={S.checkText}>
                我已阅读并同意
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={S.link}>隐私政策</a>
                和
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={S.link}>服务条款</a>
                <span style={{ color: 'var(--pri-red-dot)' }}> *</span>
              </span>
            </label>
            <label style={{ ...S.checkLabel, marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={consentAI}
                onChange={(e) => setConsentAI(e.target.checked)}
                style={S.checkbox}
              />
              <span style={S.checkText}>可选：用于改进产品体验（匿名化使用数据）</span>
            </label>
            <p style={S.trialHint}>✓ 30 天免费体验全部功能 · 之后 $9.99/月，随时取消</p>
          </div>
        )}

        <button
          type="button"
          className="gc-btn"
          onClick={() => { void handleSubmit() }}
          disabled={submitDisabled}
          style={{
            width: '100%',
            height: 56,
            opacity: submitDisabled ? 0.55 : 1,
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
        </button>

        <div style={S.footer}>
          <p style={S.footerSwitch}>
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              style={S.footerLinkBtn}
            >
              {mode === 'login' ? '注册' : '登录'}
            </button>
          </p>
          <p style={S.footerLegal}>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={S.link}>隐私政策</a>
            <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={S.link}>服务条款</a>
          </p>
        </div>
          </>
        )}
      </section>

      <style>{SPIN_KEYFRAMES}</style>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="canvas-texture" style={S.page}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </main>
    }>
      <AuthPageInner />
    </Suspense>
  )
}

const SPIN_KEYFRAMES = `
  @keyframes authSpin {
    to { transform: rotate(360deg); }
  }
`

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--canvas-light)',
    fontFamily: 'var(--font-body)',
  },
  brand: {
    minHeight: '40vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px 20px',
    textAlign: 'center',
  },
  logoMark: {
    fontSize: 28,
    lineHeight: 1,
    marginBottom: 6,
  },
  logoWordmark: {
    margin: '0 0 16px',
    fontFamily: 'var(--font-serif)',
    fontSize: 11,
    letterSpacing: '0.45em',
    color: 'var(--clay)',
    fontWeight: 500,
  },
  heroTitle: {
    margin: 0,
    fontFamily: 'var(--font-serif)',
    fontSize: 48,
    fontWeight: 300,
    color: 'var(--clay)',
    lineHeight: 1.1,
  },
  heroSubtitle: {
    margin: '10px 0 18px',
    fontFamily: 'var(--font-serif)',
    fontSize: 16,
    fontWeight: 300,
    color: 'var(--fg2)',
    lineHeight: 1.6,
  },
  valueList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  valueItem: {
    fontSize: 12,
    color: 'var(--fg3)',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.5,
  },
  actions: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    margin: '0 auto',
    padding: '8px 20px max(calc(env(safe-area-inset-bottom) + 24px), 32px)',
  },
  upgradeHint: {
    marginBottom: 14,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'var(--clay-tint)',
    border: '1px solid var(--line-clay)',
    fontSize: 13,
    color: 'var(--clay)',
    lineHeight: 1.6,
    textAlign: 'center',
  },
  googleBtn: {
    width: '100%',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: '#fff',
    border: '1px solid rgba(45,50,47,0.15)',
    borderRadius: 16,
    boxShadow: 'var(--sh-soft)',
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    marginBottom: 10,
  },
  lineBtn: {
    width: '100%',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#fff',
    border: '1px solid rgba(6,199,85,0.25)',
    borderRadius: 14,
    boxShadow: 'var(--sh-soft)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: '#06C755',
    cursor: 'pointer',
    marginBottom: 18,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--line)',
  },
  dividerText: {
    fontSize: 12,
    color: 'var(--fg3)',
    whiteSpace: 'nowrap',
  },
  tabRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid var(--line)',
  },
  tabBtn: {
    height: 40,
    border: 'none',
    borderRadius: 10,
    background: 'transparent',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--fg3)',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  tabBtnActive: {
    background: '#fff',
    color: 'var(--text-primary)',
    fontWeight: 600,
    boxShadow: 'var(--sh-soft)',
  },
  input: {
    width: '100%',
    height: 52,
    padding: '0 16px',
    border: '1px solid var(--line-clay)',
    borderRadius: 14,
    fontSize: 15,
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    background: 'rgba(255,255,255,0.72)',
    outline: 'none',
    marginBottom: 10,
  },
  errorText: {
    margin: '0 0 10px',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--pri-red-dot)',
    fontFamily: 'var(--font-body)',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: 3,
    accentColor: 'var(--clay)',
    flexShrink: 0,
    width: 16,
    height: 16,
  },
  checkText: {
    fontSize: 13,
    color: 'var(--fg2)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  },
  trialHint: {
    margin: '10px 0 0',
    fontSize: 12,
    color: 'var(--clay)',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
  },
  footerSwitch: {
    margin: '0 0 10px',
    fontSize: 13,
    color: 'var(--fg3)',
    fontFamily: 'var(--font-body)',
  },
  footerLinkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--clay)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: 4,
    fontFamily: 'var(--font-body)',
  },
  footerLegal: {
    margin: 0,
    fontSize: 12,
    color: 'var(--fg3)',
    fontFamily: 'var(--font-body)',
  },
  link: {
    color: 'var(--text-primary)',
    textDecoration: 'underline',
    margin: '0 2px',
  },
  verifyCard: {
    width: '100%',
    maxWidth: 400,
    margin: 'auto',
    padding: '36px 28px',
    background: 'rgba(255,255,255,0.88)',
    borderRadius: 24,
    boxShadow: 'var(--sh-soft)',
    textAlign: 'center',
  },
  verifyTitle: {
    margin: '0 0 8px',
    fontFamily: 'var(--font-serif)',
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  verifyDesc: {
    margin: '0 0 20px',
    fontSize: 14,
    color: 'var(--fg2)',
    lineHeight: 1.8,
    fontFamily: 'var(--font-body)',
  },
  forgotTitle: {
    margin: '0 0 6px',
    fontFamily: 'var(--font-serif)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  forgotSubtitle: {
    margin: '0 0 18px',
    fontSize: 14,
    color: 'var(--fg2)',
    lineHeight: 1.6,
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
  },
  forgotRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    margin: '-4px 0 10px',
  },
  forgotLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: 13,
    color: 'var(--clay)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  backLink: {
    display: 'block',
    width: '100%',
    marginTop: 16,
    background: 'none',
    border: 'none',
    fontSize: 14,
    color: 'var(--fg3)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
  },
  conflictCard: {
    marginBottom: 16,
    padding: '16px 14px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid var(--line-clay)',
    boxShadow: 'var(--sh-soft)',
  },
  conflictText: {
    margin: '0 0 14px',
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--text-primary)',
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
  },
  conflictActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  conflictPrimaryBtn: {
    width: '100%',
    height: 48,
  },
  conflictSecondaryBtn: {
    width: '100%',
    height: 44,
    border: '1px solid var(--line-clay)',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.72)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    color: 'var(--clay)',
    cursor: 'pointer',
  },
}
