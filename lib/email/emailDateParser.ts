import { getTodayStr } from '@/lib/date/localDate'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseReferenceDate(reference?: string | Date): Date {
  if (reference instanceof Date && !Number.isNaN(reference.getTime())) return reference
  if (typeof reference === 'string') {
    const iso = reference.slice(0, 10)
    if (ISO_DATE.test(iso)) {
      const [y, m, d] = iso.split('-').map(Number)
      const parsed = new Date(y, m - 1, d)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    const parsed = new Date(reference)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

/** 相对「19号」「6月19日」等 → YYYY-MM-DD，以邮件收到日为锚点 */
export function normalizeEmailDate(
  raw: string | null | undefined,
  reference?: string | Date,
): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  if (ISO_DATE.test(s)) return s

  const slash = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/)
  if (slash) return toYmd(Number(slash[1]), Number(slash[2]), Number(slash[3]))

  const ref = parseReferenceDate(reference)
  const refYear = ref.getFullYear()
  const refMonth = ref.getMonth() + 1
  const refDay = ref.getDate()

  const monthDayCn = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[号日]?/)
  if (monthDayCn) {
    let month = Number(monthDayCn[1])
    let day = Number(monthDayCn[2])
    let year = refYear
    if (month < refMonth || (month === refMonth && day < refDay)) year += 1
    return toYmd(year, month, day)
  }

  const monthDayEn = s.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s*(\d{4}))?/i)
  if (monthDayEn) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const monthIdx = monthNames.findIndex((m) => monthDayEn[1].toLowerCase().startsWith(m))
    if (monthIdx >= 0) {
      const day = Number(monthDayEn[2])
      const year = monthDayEn[3] ? Number(monthDayEn[3]) : refYear
      return toYmd(year, monthIdx + 1, day)
    }
  }

  const dayOnly = s.match(/(?:^|[^\d])(\d{1,2})\s*[号日](?:[^\d]|$)/)
  if (dayOnly) {
    const day = Number(dayOnly[1])
    let month = refMonth
    let year = refYear
    if (day < refDay) {
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
    return toYmd(year, month, day)
  }

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) return getTodayStr(parsed)

  return null
}

export function normalizeEmailDatesInText(
  text: string,
  reference?: string | Date,
): string | null {
  const patterns = [
    /\d{1,2}\s*月\s*\d{1,2}\s*[号日]?/g,
    /\d{1,2}\s*[号日]/g,
    /\d{4}-\d{2}-\d{2}/g,
  ]
  for (const re of patterns) {
    const match = text.match(re)
    if (match?.[0]) {
      const normalized = normalizeEmailDate(match[0], reference)
      if (normalized) return normalized
    }
  }
  return null
}
