/** 课表条目去重 key：规范化后的 time + subject（小写） */
export function scheduleEntryDedupeKey(time: string, subject: string): string {
  return `${time.trim()}|${subject.trim().toLowerCase()}`
}

export function normalizeScheduleTime(v: unknown): string | null {
  const t = String(v || '').trim()
  const timeStr = t.includes('-') ? t.split('-')[0].trim() : t
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function dedupeScheduleEntries<T extends { time: string; subject: string }>(entries: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const entry of entries) {
    const key = scheduleEntryDedupeKey(entry.time, entry.subject)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry)
  }
  return out
}

/** 原始课表项（time/subject 可能未规范化）去重 */
export function dedupeRawScheduleItems<T extends { time?: unknown; subject?: unknown; title?: unknown }>(
  items: T[],
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const isObject = typeof item === 'object' && item !== null
    const subject = String(
      isObject ? (item.subject ?? item.title ?? '') : item,
    ).trim()
    const time = normalizeScheduleTime(isObject ? item.time : undefined) ?? ''
    if (!time || !subject) continue
    const key = scheduleEntryDedupeKey(time, subject)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
