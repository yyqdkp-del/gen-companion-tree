/** 登录成功后回跳路径（sessionStorage，兼容 OAuth 往返） */
export const AUTH_NEXT_STORAGE_KEY = 'auth_post_login_path'

/** 从订阅流程登录后，在升级页展示一句提示 */
export const UPGRADE_WELCOME_FLAG = 'upgrade_post_login_welcome'

const DEFAULT_PATH = '/'

/** 仅允许站内相对路径，避免开放重定向 */
export function sanitizeAuthNext(raw: string | null | undefined): string {
  if (!raw?.trim()) return DEFAULT_PATH
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return DEFAULT_PATH
  try {
    const u = new URL(path, 'http://localhost')
    if (!u.pathname.startsWith('/') || u.pathname.startsWith('/auth')) {
      return DEFAULT_PATH
    }
    return `${u.pathname}${u.search}`
  } catch {
    return DEFAULT_PATH
  }
}

export function peekAuthNext(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  return sanitizeAuthNext(sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY))
}

export function stashAuthNext(path: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, sanitizeAuthNext(path))
}

/** URL 带 next= 时写入；否则保留此前已存的路径（如 OAuth 前从设置进订阅） */
export function stashAuthNextFromUrl(searchParams: URLSearchParams): string {
  const raw = searchParams.get('next')
  if (raw != null && raw !== '') {
    const safe = sanitizeAuthNext(raw)
    stashAuthNext(safe)
    return safe
  }
  return peekAuthNext()
}

export function consumeAuthNext(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  const dest = peekAuthNext()
  sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY)
  return dest
}

export function markUpgradeWelcome(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(UPGRADE_WELCOME_FLAG, '1')
}

export function consumeUpgradeWelcome(): boolean {
  if (typeof window === 'undefined') return false
  const v = sessionStorage.getItem(UPGRADE_WELCOME_FLAG)
  sessionStorage.removeItem(UPGRADE_WELCOME_FLAG)
  return v === '1'
}

/** 登录完成后整页跳转，确保 App 上下文与 Supabase session 同步 */
export function redirectAfterAuth(destination?: string): void {
  const dest = sanitizeAuthNext(destination ?? consumeAuthNext())
  if (dest === '/upgrade' || dest.startsWith('/upgrade?')) {
    markUpgradeWelcome()
  }
  window.location.href = dest
}
