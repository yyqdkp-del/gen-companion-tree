'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('密码至少需要 6 位')
      return
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    const token_hash = searchParams.get('token_hash')
    if (!token_hash) {
      setError('重置链接无效或已过期，请重新申请')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      if (otpError) {
        setError(otpError.message || '重置链接无效或已过期')
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

  const disabled = loading || !password || !confirm

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
    margin: '0 0 10px',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'var(--pri-red-dot)',
  },
  loading: {
    margin: 'auto',
    fontSize: 14,
    color: 'var(--fg3)',
  },
}
