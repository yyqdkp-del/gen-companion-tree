import { createClient } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

/** 注销：清本地业务数据与 auth 缓存 → 清服务端 Push 订阅 → signOut → 跳转登录页 */
export async function signOutWithPushCleanup() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('app_user_id')
    localStorage.removeItem('active_child_id')
    localStorage.removeItem('active_child')
    localStorage.removeItem('child_assessment')
    localStorage.removeItem('treehouse_unlocked')

    if ('caches' in window) {
      try {
        const cache = await caches.open('auth-v1')
        await cache.delete('/auth/session-bundle')
        await cache.delete('/auth/user-id')
      } catch {
        // ignore
      }
    }
  }

  try {
    await fetchWithAuth('/api/push/subscribe', { method: 'DELETE' })
  } catch {
    // 未登录或无订阅时忽略
  }
  const supabase = createClient()
  await supabase.auth.signOut()
  if (typeof window !== 'undefined') window.location.href = '/auth'
}
