'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/** 从邮件链接建立 recovery session（支持 hash / code / token_hash 三种 Supabase 格式） */
async function establishRecoverySession(searchParams: URLSearchParams): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return null

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    return error?.message ?? null
  }

  const code = searchParams.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error?.message ?? null
  }

  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  if (hash) {
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      return error?.message ?? null
    }
  }

  const { data: { session: afterDetect } } = await supabase.auth.getSession()
  if (afterDetect) return null

  return '重置链接无效或已过期，请重新申请'
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.delete('code')
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  const qs = url.searchParams.toString()
  window.history.replaceState({}, '', qs ? `${url.pathname}?${qs}` : url.pathname)
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [linkError, setLinkError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const err = await establishRecoverySession(searchParams)
      if (err) {
        setLinkError(err)
      } else {
        stripAuthParamsFromUrl()
      }
      setChecking(false)
    })()
  }, [searchParams])

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('密码至少需要 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    setError('')
    try {
      let sessionErr = await establishRecoverySession(searchParams)
      if (sessionErr) {
        setError(sessionErr)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || '密码更新失败，请重试')
        return
      }

      router.push('/')
    } catch {
      setError('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || checking || !!linkError || !password || !confirm

  if (checking) {
    return (
      <main className="canvas-texture" style={S.page}>
        <p style={S.loading}>正在验证重置链接…</p>
      </main>
    )
  }

  if (linkError) {
    return (
      <main className="canvas-texture" style={S.page}>
        <div style={S.card}>
          <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>🌿</div>
          <p style={S.error}>{linkError}</p>
          <Link href="/auth?mode=forgot" style={S.linkBtn}>
            重新申请重置链接
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="canvas-texture" style={S.page}>
      <div style={S.card}>
        <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>🌿</div>
        <h1 style={S.title}>设置新密码</h1>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="新密码（6 位以上）"
          type="password"
          autoComplete="new-password"
          style={S.input}
        />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="确认新密码"
          type="password"
          autoComplete="new-password"
          style={S.input}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) void handleSubmit()
          }}
        />
        {error && <p style={S.error}>{error}</p>}
        <button
          type="button"
          className="gc-btn"
          onClick={() => { void handleSubmit() }}
          disabled={disabled}
          style={{
            width: '100%',
            height: 56,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '处理中…' : '确认修改'}
        </button>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="canvas-texture" style={S.page}>
        <p style={S.loading}>加载中…</p>
      </main>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    backgroundColor: 'var(--canvas-light)',
    fontFamily: 'var(--font-body)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: '32px 24px',
    background: 'rgba(255,255,255,0.88)',
    borderRadius: 24,
    boxShadow: 'var(--sh-soft)',
  },
  title: {
    margin: '0 0 20px',
    fontFamily: 'var(--font-serif)',
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text-primary)',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    padding: '0 16px',
    marginBottom: 10,
    border: '1px solid var(--line-clay)',
    borderRadius: 14,
    fontSize: 15,
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    background: 'rgba(255,255,255,0.72)',
    outline: 'none',
  },
  error: {
    margin: '0 0 14px',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--pri-red-dot)',
    textAlign: 'center',
  },
  loading: {
    margin: 'auto',
    fontSize: 14,
    color: 'var(--fg3)',
  },
  linkBtn: {
    display: 'block',
    width: '100%',
    height: 48,
    lineHeight: '48px',
    textAlign: 'center',
    borderRadius: 14,
    background: 'var(--clay)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
  },
}
