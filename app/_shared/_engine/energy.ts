// ─────────────────────────────────────────
// 儿童精力引擎
// 基于儿童医学和行为科学
// 睡眠 50% + 当日负荷 30% + 身心状态 20%
// ─────────────────────────────────────────

export type EnergyInput = {
  sleepStart?: string        // "22:30" 昨晚入睡时间（手动录入）
  sleepEnd?: string          // "07:00" 今早起床时间（手动录入）
  usualBedtime?: string      // "21:30" 孩子资料里的平时入睡时间
  schoolStartTime?: string   // "08:00" 上课时间（用于推算起床时间）
  isWeekend?: boolean        // 是否周末
  weekendBedtime?: string    // "22:30" 周末入睡时间
  healthStatus?: string      // 'normal' | 'recovering' | 'sick'
  moodStatus?: string        // 'happy' | 'calm' | 'anxious' | 'upset'
  todayEvents?: {
    event_type?: string
    requires_action?: boolean
    requires_payment?: number
    title?: string
  }[]
}

export type EnergyLevel = 'green' | 'yellow' | 'orange' | 'red'

export type EnergyResult = {
  score: number              // 0-100
  level: EnergyLevel
  label: string              // 状态好 | 有点累 | 需要休息 | 今天放轻松
  advice: string             // 给妈妈的具体建议
  bedtime: string            // 建议上床时间
  skipActivities: boolean    // 是否建议取消课外活动
  skipReason?: string        // 取消原因
}

// ── 睡眠时长计算 ──────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function calcSleepHours(start?: string, end?: string): number {
  if (!start || !end) return 9  // 无数据默认正常
  let startMin = timeToMinutes(start)
  let endMin   = timeToMinutes(end)
  if (endMin < startMin) endMin += 24 * 60
  return (endMin - startMin) / 60
}

// 从孩子资料推算睡眠时长
function inferSleepHours(input: EnergyInput): number {
  // 优先用手动录入的数据
  if (input.sleepStart && input.sleepEnd) {
    return calcSleepHours(input.sleepStart, input.sleepEnd)
  }

  // 用孩子资料推算
  const isWeekend = input.isWeekend ?? [0, 6].includes(new Date().getDay())
  const bedtime = isWeekend
    ? (input.weekendBedtime || input.usualBedtime || '22:00')
    : (input.usualBedtime || '21:30')

  if (!input.schoolStartTime) {
    // 没有上课时间，用入睡时间+9小时估算
    return 9
  }

  // 推算起床时间：上课时间 - 45分钟（准备时间）
  const schoolStartMin  = timeToMinutes(input.schoolStartTime)
  const wakeUpMin       = schoolStartMin - 45
  const bedtimeMin      = timeToMinutes(bedtime)

  let sleepMin = wakeUpMin - bedtimeMin
  if (sleepMin < 0) sleepMin += 24 * 60

  return sleepMin / 60
}

// ── 睡眠得分（权重50）─────────────────────
// 6-13岁推荐睡眠：9-11小时（美国儿科学会标准）
function sleepScore(hours: number): number {
  if (hours >= 10)  return 100
  if (hours >= 9)   return 90
  if (hours >= 8)   return 70   // 轻度不足
  if (hours >= 7)   return 45   // 明显不足
  if (hours >= 6)   return 20   // 严重不足
  return 0                       // 极度不足
}

// ── 当日负荷得分（权重30）────────────────
// 负荷越高，得分越低
function loadScore(events: EnergyInput['todayEvents'] = []): number {
  let load = 0

  // 高压事件
  if (events.some(e => e.event_type === 'exam'))           load += 50  // 考试消耗认知资源最大
  if (events.some(e => e.event_type === 'medical'))        load += 20  // 体检/就医本身有压力
  if (events.some(e => ['trip','activity'].includes(e.event_type || ''))) load += 30  // 外出活动体力消耗

  // 课程密度
  const classCount = events.filter(e => e.event_type === 'class').length
  if (classCount > 6) load += 25
  else if (classCount > 4) load += 10

  // 需要行动/付款的事项（妈妈焦虑会传染给孩子）
  const actionCount = events.filter(e => e.requires_action || e.requires_payment).length
  load += actionCount * 10

  // 课外活动叠加
  const extraCount = events.filter(e => e.event_type === 'extracurricular').length
  load += extraCount * 15

  return Math.max(0, 100 - load)
}

// ── 身心状态得分（权重20）────────────────
function stateScore(health?: string, mood?: string): number {
  let score = 80  // 基准

  // 健康状态
  if (health === 'sick')       score -= 60
  if (health === 'recovering') score -= 30

  // 情绪状态
  if (mood === 'upset')   score -= 25
  if (mood === 'anxious') score -= 15
  if (mood === 'happy')   score += 15
  if (mood === 'calm')    score += 5

  return Math.max(0, Math.min(100, score))
}

// ── 建议上床时间 ──────────────────────────
function calcBedtime(score: number): string {
  if (score < 40)  return '20:00'
  if (score < 60)  return '20:30'
  if (score < 75)  return '21:00'
  return '21:30'
}

// ── 是否建议取消课外活动 ──────────────────
function shouldSkip(
  score: number,
  events: EnergyInput['todayEvents'] = [],
): { skip: boolean; reason?: string } {
  if (score < 40) return { skip: true, reason: '今天孩子需要充分休息，建议取消所有课外活动' }
  if (score < 60) {
    const hasExam = events.some(e => e.event_type === 'exam')
    if (hasExam) return { skip: true, reason: '考试日后需要恢复，建议今天不安排额外活动' }
    const extraCount = events.filter(e => e.event_type === 'extracurricular').length
    if (extraCount > 1) return { skip: true, reason: '今天安排已较满，建议只保留一项课外活动' }
  }
  return { skip: false }
}

// ── 主函数 ────────────────────────────────
export function calculateEnergy(input: EnergyInput): EnergyResult {
  const sleepHours = inferSleepHours(input)
  const events     = input.todayEvents || []

  const sl = sleepScore(sleepHours)
  const lo = loadScore(events)
  const st = stateScore(input.healthStatus, input.moodStatus)

  // 加权合并
  const score = Math.round(sl * 0.5 + lo * 0.3 + st * 0.2)

  // 等级判断
  const level: EnergyLevel =
    score >= 75 ? 'green'
    : score >= 55 ? 'yellow'
    : score >= 35 ? 'orange'
    : 'red'

  const label =
    level === 'green'  ? '状态好'
    : level === 'yellow' ? '有点累'
    : level === 'orange' ? '需要休息'
    : '今天放轻松'

  const bedtime = calcBedtime(score)
  const { skip, reason } = shouldSkip(score, events)

  // 给妈妈的建议
  let advice = ''
  if (level === 'green') {
    advice = '今天状态不错，正常安排就好。'
  } else if (level === 'yellow') {
    advice = `建议今晚${bedtime}前上床，课外活动做一项就够了。`
  } else if (level === 'orange') {
    advice = `建议取消今天的课外活动，回家先休息30分钟再吃饭，${bedtime}前上床。`
  } else {
    advice = `孩子今天很累，需要的是陪伴和休息，不是更多安排。建议${bedtime}前上床，明天会好很多。`
  }

  if (input.healthStatus === 'sick') {
    advice = '孩子生病中，今天所有课外活动都应取消，以恢复为优先。'
  }

  return {
    score,
    level,
    label,
    advice,
    bedtime,
    skipActivities: skip,
    skipReason: reason,
  }
}

// ── 辅助函数（供水珠和UI使用）────────────
export function getEnergyColor(score: number): string {
  if (score >= 75) return '#4ADE80'
  if (score >= 55) return '#FACC15'
  if (score >= 35) return '#FB923C'
  return '#FB7185'
}

export function getEnergyLevel(score: number): EnergyLevel {
  if (score >= 75) return 'green'
  if (score >= 55) return 'yellow'
  if (score >= 35) return 'orange'
  return 'red'
}
