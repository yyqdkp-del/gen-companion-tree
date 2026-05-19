import type { Session } from '@supabase/supabase-js'

/**
 * 将 Supabase 会话写入 Cache，供 PWA 冷启动恢复（与 AppContext 读取的 `auth-v1` + `/auth/session-bundle` 一致）。
 */
export async function saveSessionBundle(session: Session) {
  if (typeof window === 'undefined' || !('caches' in window)) return
  const cache = await caches.open('auth-v1')
  await cache.put(
    '/auth/session-bundle',
    new Response(
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at ?? null,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    ),
  )
  if (session.user?.id) {
    await cache.put('/auth/user-id', new Response(session.user.id))
  }
}
