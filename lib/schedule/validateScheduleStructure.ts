const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const

const DAY_LABELS: Record<string, string> = {
  mon: '周一',
  tue: '周二',
  wed: '周三',
  thu: '周四',
  fri: '周五',
}

export type ScheduleValidationWarning = {
  code: 'sparse_day' | 'early_time_missing'
  message: string
}

function parseTimeToMin(time?: string): number {
  if (!time) return -1
  const t = String(time).trim().slice(0, 5)
  const match = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return -1
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return -1
  return h * 60 + m
}

/** 识别结果结构验证：课程密度与最早时间 */
export function validateScheduleStructure(
  schedule: Record<string, { time?: string }[]>,
): ScheduleValidationWarning[] {
  const warnings: ScheduleValidationWarning[] = []

  for (const day of DAY_KEYS) {
    const entries = schedule[day] || []
    if (entries.length > 0 && entries.length < 5) {
      warnings.push({
        code: 'sparse_day',
        message: `${DAY_LABELS[day]}只有 ${entries.length} 节课，可能遗漏了课程`,
      })
    }
  }

  let earliestMin: number | null = null
  for (const day of DAY_KEYS) {
    for (const entry of schedule[day] || []) {
      const min = parseTimeToMin(entry.time)
      if (min >= 0 && (earliestMin === null || min < earliestMin)) {
        earliestMin = min
      }
    }
  }

  if (earliestMin !== null) {
    const inMorningWindow = earliestMin >= 7 * 60 && earliestMin <= 9 * 60
    if (!inMorningWindow) {
      const h = Math.floor(earliestMin / 60)
      const m = earliestMin % 60
      const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      warnings.push({
        code: 'early_time_missing',
        message: `最早课程是 ${label}，不在 07:00–09:00 之间，可能漏掉了早上的课`,
      })
    }
  }

  return warnings
}
