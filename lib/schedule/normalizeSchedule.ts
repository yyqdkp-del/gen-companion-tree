import { dedupeScheduleEntries } from '@/lib/schedule/dedupeScheduleEntries'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import { applyScheduleTimeValidation } from '@/lib/schedule/validateScheduleTime'

export interface ClassEntry {
  time: string
  subject: string
  name_zh?: string
  category?: 'class' | 'activity' | 'break' | 'transition' | 'life'
  requires_items?: string[]
  title?: string
  name?: string
  [key: string]: unknown
}

export type WeekSchedule = Record<string, ClassEntry[]>

export const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number]

const DAY_KEY_ALIASES: Record<string, ScheduleDay> = {
  mon: 'mon', monday: 'mon',
  tue: 'tue', tuesday: 'tue',
  wed: 'wed', wednesday: 'wed',
  thu: 'thu', thursday: 'thu',
  fri: 'fri', friday: 'fri',
}

const CATEGORY_SET = new Set(['class', 'life', 'break', 'transition', 'activity'])

export function emptyWeekSchedule(): WeekSchedule {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] }
}

export function normalizeTime(time: string): string {
  const t = String(time || '').trim()
  const timeStr = t.includes('-') ? t.split('-')[0].trim() : t
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!match) return t
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return t
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeSubject(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (raw && typeof raw === 'object') {
    const o = raw as { subject?: unknown; title?: unknown; name?: unknown }
    return String(o.subject ?? o.title ?? o.name ?? '').trim()
  }
  return ''
}

function normalizeCategory(v: unknown): ClassEntry['category'] | undefined {
  const s = String(v || '').trim().toLowerCase()
  return CATEGORY_SET.has(s) ? (s as ClassEntry['category']) : undefined
}

function entrySubject(entry: ClassEntry): string {
  return String(entry.subject ?? entry.title ?? entry.name ?? '').trim()
}

export function inferCategory(subject: string): ClassEntry['category'] {
  const breakKeywords = ['breakfast', 'lunch', 'snack', 'rest', 'outdoor play', 'recess']
  const transitionKeywords = ['morning routine', 'pick up', 'pickup', 'drop off', 'dropoff']
  const s = subject.toLowerCase()
  if (breakKeywords.some((k) => s.includes(k))) return 'break'
  if (transitionKeywords.some((k) => s.includes(k))) return 'transition'
  if (s.includes('swim') || s.includes('pe') || s.includes('art') || s.includes('music')) return 'activity'
  return 'class'
}

/** 解析 vision / Rian / 手动编辑等任意 shape → WeekSchedule */
export function parseRawSchedule(raw: unknown): WeekSchedule {
  const out = emptyWeekSchedule()
  if (!raw) return out

  if (Array.isArray(raw)) {
    out.mon = raw.map(toClassEntry).filter(Boolean) as ClassEntry[]
    return out
  }

  if (typeof raw !== 'object') return out

  const root = raw as Record<string, unknown>
  const daysObj =
    root.days && typeof root.days === 'object' && !Array.isArray(root.days)
      ? (root.days as Record<string, unknown>)
      : root

  for (const [key, dayRaw] of Object.entries(daysObj)) {
    const day = DAY_KEY_ALIASES[key.trim().toLowerCase()]
    if (!day) continue

    let entries: unknown[] = []
    if (Array.isArray(dayRaw)) entries = dayRaw
    else if (dayRaw && typeof dayRaw === 'object' && Array.isArray((dayRaw as { schedule?: unknown }).schedule)) {
      entries = (dayRaw as { schedule: unknown[] }).schedule
    }

    out[day] = entries.map(toClassEntry).filter(Boolean) as ClassEntry[]
  }

  return out
}

function toClassEntry(raw: unknown): ClassEntry | null {
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s || isPlaceholderSubject(s)) return null
    return { time: '', subject: s, category: inferCategory(s) }
  }
  if (!raw || typeof raw !== 'object') return null

  const obj = raw as ClassEntry
  const subject = normalizeSubject(obj)
  if (!subject || isPlaceholderSubject(subject)) return null

  const time = obj.time ? normalizeTime(String(obj.time)) : ''
  const entry: ClassEntry = {
    time,
    subject,
    category: normalizeCategory(obj.category) || inferCategory(subject),
  }
  if (obj.name_zh) entry.name_zh = String(obj.name_zh).trim()
  if (Array.isArray(obj.requires_items) && obj.requires_items.length) {
    entry.requires_items = obj.requires_items.map(String)
  }
  return entry
}

/** 时间格式 / 去重 / 排序 / 校验 */
export function normalizeWeekSchedule(schedule: WeekSchedule): WeekSchedule {
  const result: WeekSchedule = emptyWeekSchedule()

  for (const day of SCHEDULE_DAYS) {
    const classes = schedule[day]
    if (!Array.isArray(classes)) continue

    const normalized = classes
      .map((cls) => ({
        ...cls,
        time: cls.time ? normalizeTime(cls.time) : '',
        subject: entrySubject(cls),
        category: cls.category || inferCategory(entrySubject(cls)),
      }))
      .filter((cls) => cls.subject && !isPlaceholderSubject(cls.subject))

    const seen = new Set<string>()
    const deduped = normalized.filter((cls) => {
      const key = `${cls.time}|${cls.subject}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    result[day] = deduped.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  }

  const { schedule: validated } = applyScheduleTimeValidation(result, [...SCHEDULE_DAYS])
  const final: WeekSchedule = emptyWeekSchedule()
  for (const day of SCHEDULE_DAYS) {
    final[day] = dedupeScheduleEntries(validated[day] || [])
  }
  return final
}

export function preserveCategories(normalized: WeekSchedule, original: WeekSchedule): WeekSchedule {
  const result: WeekSchedule = emptyWeekSchedule()

  for (const day of SCHEDULE_DAYS) {
    const classes = normalized[day] || []
    const origDay = original[day] || []
    result[day] = classes.map((cls) => {
      const orig = origDay.find((o) => {
        const oTime = o.time ? normalizeTime(o.time) : ''
        const oSubject = entrySubject(o)
        return oTime === cls.time && oSubject === cls.subject
      })
      return {
        ...cls,
        category: orig?.category || cls.category || inferCategory(cls.subject),
        name_zh: orig?.name_zh || cls.name_zh,
        requires_items: orig?.requires_items || cls.requires_items,
      }
    })
  }

  return result
}

export function inferSchoolTimes(schedule: WeekSchedule): {
  school_start_time: string | null
  school_end_time: string | null
} {
  let schoolStart: string | null = null
  let schoolEnd: string | null = null

  for (const day of SCHEDULE_DAYS) {
    const entries = schedule[day] || []
    const withTime = entries.filter((e) => e.time)
    if (!withTime.length) continue
    if (!schoolStart) schoolStart = withTime[0].time
    schoolEnd = withTime[withTime.length - 1].time
  }

  return { school_start_time: schoolStart, school_end_time: schoolEnd }
}

export function countScheduleEntries(schedule: WeekSchedule): number {
  return SCHEDULE_DAYS.reduce((n, d) => n + (schedule[d]?.length || 0), 0)
}
