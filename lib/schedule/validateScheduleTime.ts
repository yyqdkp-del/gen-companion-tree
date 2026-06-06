export type ParseWarning = {
  day: string
  time: string
  subject: string
  reason: string
}

/** 校验并规范化课表时间；无效返回 null */
export function validateTime(time: string): string | null {
  const cleaned = String(time || '').trim().replace(/[.: ]/g, ':')
  const dashSplit = cleaned.includes('-') ? cleaned.split('-')[0].trim() : cleaned
  const parts = dashSplit.split(':')
  if (!parts[0]) return null

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1] || '0', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  if (hours >= 0 && hours < 6) {
    const totalMins = hours * 100 + minutes
    if (totalMins >= 600 && totalMins < 2200) {
      const h = Math.floor(totalMins / 100)
      const m = totalMins % 100
      if (m < 0 || m > 59) return null
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
    return null
  }

  if (hours < 6 || hours > 22) return null
  if (minutes < 0 || minutes > 59) return null

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

type ScheduleEntry = {
  time: string
  subject: string
  [key: string]: unknown
}

type ScheduleByDay = Record<string, ScheduleEntry[]>

/** 过滤无效时间条目，收集 parse_warnings */
export function applyScheduleTimeValidation<T extends ScheduleEntry>(
  schedule: Record<string, T[]>,
  dayKeys: readonly string[],
): { schedule: Record<string, T[]>; parse_warnings: ParseWarning[] } {
  const parse_warnings: ParseWarning[] = []
  const validated = {} as Record<string, T[]>

  for (const day of dayKeys) {
    const entries = schedule[day] || []
    const kept: T[] = []

    for (const entry of entries) {
      const rawTime = String(entry.time || '').trim()
      const validTime = validateTime(rawTime)
      if (!validTime) {
        parse_warnings.push({
          day,
          time: rawTime,
          subject: String(entry.subject || ''),
          reason: '时间格式无效',
        })
        continue
      }
      kept.push({ ...entry, time: validTime })
    }

    validated[day] = kept
  }

  return { schedule: validated, parse_warnings }
}
