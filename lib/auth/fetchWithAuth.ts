import { createClient } from '@/lib/supabase/client'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'

/** 合并鉴权头与调用方传入的 headers（同名以鉴权为准） */
async function mergeAuthHeaders(options: RequestInit): Promise<Headers> {
  const auth = await getJsonAuthHeaders()
  const h = options.headers
    ? new Headers(options.headers as HeadersInit)
    : new Headers()
  Object.entries(auth).forEach(([k, v]) => {
    if (v) h.set(k, v)
  })
  return h
}

/**
 * 带 JWT 的 fetch；401 时尝试 refreshSession 后重试一次。
 * 刷新失败则跳转 /auth（与 getJsonAuthHeaders 同源 Supabase 客户端）。
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const supabase = createClient()

  let headers = await mergeAuthHeaders(options)
  let res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      if (typeof window !== 'undefined') {
        alert('登录已过期，请重新登录')
        window.location.href = '/auth'
      }
      return res
    }
    headers = await mergeAuthHeaders(options)
    res = await fetch(url, { ...options, headers })
  }

  return res
}
