/** 内置 Pro 白名单（免订阅、无限次解码等） */
const BUILTIN_PRO_WHITELIST = new Set(['yyqdkp@gmail.com'])

function parseEnvWhitelist(): Set<string> {
  const raw = process.env.PRO_WHITELIST_EMAILS
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** 是否 Pro 白名单邮箱（不区分大小写） */
export function isProWhitelistedEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  const normalized = email.trim().toLowerCase()
  if (BUILTIN_PRO_WHITELIST.has(normalized)) return true
  return parseEnvWhitelist().has(normalized)
}
