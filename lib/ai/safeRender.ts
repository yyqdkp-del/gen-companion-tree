export function safeString(val: unknown, fallback = ''): string {
  if (!val) return fallback
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map((v) => safeString(v)).join('、')
  if (typeof val === 'object') {
    return Object.values(val as Record<string, unknown>)
      .filter(Boolean)
      .map((v) => safeString(v))
      .join('，')
  }
  return String(val)
}
