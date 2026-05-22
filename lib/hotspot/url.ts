/** 热点外链校验（仅允许 http/https） */
export function isValidHotspotUrl(url: string | null | undefined): boolean {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function resolveHotspotLink(item: {
  source_url?: string | null
  action_data?: { url?: string } | null
}): string | null {
  for (const raw of [item.source_url, item.action_data?.url]) {
    if (raw && isValidHotspotUrl(raw)) return raw.trim()
  }
  return null
}

export function hotspotSearchUrl(title: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(title)}`
}
