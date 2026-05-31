'use client'
import { useEffect, useState } from 'react'

type ToastType = 'error' | 'success' | 'info'

type SimpleToast = { id: number; kind: 'simple'; msg: string; type: ToastType }
type LimitToast = { id: number; kind: 'limit'; msg: string; onUpgrade?: () => void }
type AuthPromptToast = { id: number; kind: 'auth'; msg: string; onRegister?: () => void }

let toastFn: ((msg: string, type?: ToastType) => void) | null = null
let limitToastFn: ((opts: { message?: string; onUpgrade?: () => void }) => void) | null = null
let registerPromptFn: ((opts: { message?: string; onRegister?: () => void }) => void) | null = null

export function toast(msg: string, type: ToastType = 'info') {
  toastFn?.(msg, type)
}

export function toastLimitReached(onUpgrade?: () => void, message = '今日次数已用完') {
  limitToastFn?.({ message, onUpgrade })
}

export function toastRegisterPrompt(
  onRegister?: () => void,
  message = '登录后可使用完整功能',
) {
  registerPromptFn?.({ message, onRegister })
}

export default function Toast() {
  const [toasts, setToasts] = useState<Array<SimpleToast | LimitToast | AuthPromptToast>>([])

  useEffect(() => {
    toastFn = (msg, ty = 'info') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, kind: 'simple', msg, type: ty }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }
    limitToastFn = ({ message, onUpgrade }) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, kind: 'limit', msg: message || '今日次数已用完', onUpgrade }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
    }
    registerPromptFn = ({ message, onRegister }) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, kind: 'auth', msg: message || '登录后可使用完整功能', onRegister }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
    }
    return () => {
      toastFn = null
      limitToastFn = null
      registerPromptFn = null
    }
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed',
      top: 'max(env(safe-area-inset-top), 20px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      alignItems: 'center',
    }}>
      {toasts.map(t => (
        t.kind === 'limit' || t.kind === 'auth' ? (
          <div key={t.id} style={{
            padding: '12px 16px',
            borderRadius: 16,
            fontSize: 14,
            fontFamily: 'sans-serif',
            color: '#fff',
            background: '#2d322f',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            textAlign: 'center',
            maxWidth: 'min(92vw, 320px)',
          }}>
            <div style={{ marginBottom: 10 }}>{t.msg}</div>
            <button
              type="button"
              onClick={() => {
                if (t.kind === 'limit') t.onUpgrade?.()
                else t.onRegister?.()
                setToasts(prev => prev.filter(x => x.id !== t.id))
              }}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                border: 'none',
                background: '#a46355',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {t.kind === 'limit' ? '升级 Pro' : '去注册'}
            </button>
          </div>
        ) : (
          <div key={t.id} style={{
            padding: '10px 20px',
            borderRadius: 24,
            fontSize: 14,
            fontFamily: 'sans-serif',
            color: '#fff',
            background: t.type === 'error' ? '#a46355' : t.type === 'success' ? '#5c7a5e' : '#2d322f',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          }}>
            {t.msg}
          </div>
        )
      ))}
    </div>
  )
}
