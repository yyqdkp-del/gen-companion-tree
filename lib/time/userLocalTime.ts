/** 用户 IANA 时区的本地时分（用于按用户本地时间调度，不写死 UTC） */

export function getUserHour(timezone: string, now: Date = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(now)
    const n = parseInt(hour, 10)
    return n === 24 ? 0 : n
  } catch {
    return now.getUTCHours()
  }
}

export function getUserMinute(timezone: string, now: Date = new Date()): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        minute: 'numeric',
      }).format(now),
      10,
    )
  } catch {
    return now.getUTCMinutes()
  }
}

/**
 * 整点 cron（每小时 :00 触发）时，判断用户本地是否处于目标小时。
 * 允许 0–9 分钟窗口，兼容 cron 轻微延迟。
 */
export function isUserLocalHour(
  timezone: string,
  targetHour: number,
  now: Date = new Date(),
): boolean {
  return getUserHour(timezone, now) === targetHour && getUserMinute(timezone, now) < 10
}

export function getUserTimeString(timezone: string, now: Date = new Date()): string {
  try {
    return now.toLocaleString('zh-CN', { timeZone: timezone })
  } catch {
    return now.toLocaleString('zh-CN')
  }
}
