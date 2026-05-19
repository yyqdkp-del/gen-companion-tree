import type { Session } from '@supabase/supabase-js'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

/** 仅在 Notification.permission === 'granted' 时注册 Push 并上报服务端（不请求权限） */
export async function subscribePushIfPermitted(session: Session | null) {
  if (!session?.access_token) return
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return
  if (Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetchWithAuth('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: sub }),
    })
  } catch (e) {
    console.error('推送订阅失败:', e)
  }
}
