/**
 * 本地日历日期工具（不用 Date#toISOString 的 UTC 日界）
 * 在浏览器中 = 用户系统时区；在 Node 中 = 进程时区（由 TZ 或主机决定）
 */

/**
 * 获取本地日期字符串 YYYY-MM-DD（不用 UTC）
 */
export function getTodayStr(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 本地日历加 N 天，返回 YYYY-MM-DD
 */
export function addDaysStr(date: Date, n: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return getTodayStr(d)
}

/**
 * 本地月末日期字符串
 */
export function getMonthEndStr(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return getTodayStr(d)
}

/**
 * 在「日历日 YYYY-MM-DD」上加减天数（格里历，与时区显示无关）
 */
export function addDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd
  const x = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

/**
 * IANA 时区下的日历日 YYYY-MM-DD（服务端按用户时区算「今天」）
 */
export function getTodayStrInTimeZone(timeZone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return getTodayStr(date)
  }
}

/** 用户时区下「今天」加 n 个日历日 */
export function addDaysStrInTimeZone(timeZone: string, fromDate: Date, n: number): string {
  return addDaysToYmd(getTodayStrInTimeZone(timeZone, fromDate), n)
}

/**
 * 在用户 IANA 时区下，将日历日 YYYY-MM-DD 的 HH:MM（24h）转为对应的绝对时刻（用于与 Date.now() 比较）
 */
export function zonedYmdHmToDate(
  timeZone: string,
  ymd: string,
  hour: number,
  minute: number,
): Date {
  const [y, mo, d] = ymd.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return new Date(NaN)
  let t = Date.UTC(y, mo - 1, d, 12, 0, 0)
  for (let i = 0; i < 96; i++) {
    const dayStr = getTodayStrInTimeZone(timeZone, new Date(t))
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(t))
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
    const min = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
    if (dayStr === ymd && h === hour && min === minute) return new Date(t)
    if (dayStr !== ymd) {
      t += dayStr < ymd ? 3600000 : -3600000
      continue
    }
    t += ((hour - h) * 60 + (minute - min)) * 60 * 1000
  }
  return new Date(t)
}

const SHORT_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** 某 IANA 时区下「星期几」（0=周日 … 6=周六） */
export function getDayOfWeekInTimeZone(timeZone: string, date = new Date()): number {
  try {
    const s = date.toLocaleDateString('en-US', { timeZone, weekday: 'short' })
    const key = (s || 'Sun').slice(0, 3) as keyof typeof SHORT_DOW
    return SHORT_DOW[key] ?? date.getDay()
  } catch {
    return date.getDay()
  }
}
