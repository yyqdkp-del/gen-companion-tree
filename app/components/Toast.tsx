'use client'
import { useEffect, useState } from 'react'

type ToastType = 'error' | 'success' | 'info'

let toastFn: ((msg: string, type?: ToastType) => void) | null = null

export function toast(msg: string, type: ToastType = 'info') {
  toastFn?.(msg, type)
}

export default function Toast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: ToastType }[]>([])

  useEffect(() => {
    toastFn = (msg, ty = 'info') => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, msg, type: ty }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }
    return () => { toastFn = null }
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
    }}>
      {toasts.map(t => (
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
      ))}
    </div>
  )
}
