// ─────────────────────────────────────────
// 儿童精力引擎（年龄分层 + 当日强度 + 周累积疲劳）
// ─────────────────────────────────────────

import type { WeeklyScheduleIntelligence } from '@/lib/ai/scheduleIntelligence'

export interface EnergyInput {
  age?: number
  grade?: number
  healthStatus?: string
  moodStatus?: string
  sleepStart?: string
  sleepEnd?: string
  usualBedtime?: string
  weekendBedtime?: string
  schoolStartTime?: string
  isWeekend?: boolean
  todayEvents?: {
    event_type?: string
    subject?: string
    requires_action?: boolean
    requires_payment?: number
    title?: string
  }[]
  weeklyLogs?: {
    sleep_start?: string
    sleep_end?: string
    mood_status?: string
    health_status?: string
    date?: string
  }[]
  intelligence?: WeeklyScheduleIntelligence
}

export type EnergyLevel = 'green' | 'yellow' | 'orange' | 'red' | 'unknown'

export interface EnergyResult {
  score: number | null
  level: EnergyLevel
  label: string
  focus: string
  advice: string
  weeklyFatigue: number
}

const AGE_PARAMS = {
  '4-6': { studyTarget: 0.5, sleepTarget: 11.5, freePlayMin: 120, chineseFactor: 1.5, burnoutThreshold: 1.2 },
  '7-9': { studyTarget: 5.5, sleepTarget: 10.0, freePlayMin: 90, chineseFactor: 1.3, burnoutThreshold: 1.4 },
  '10-12': { studyTarget: 7.0, sleepTarget: 9.5, freePlayMin: 60, chineseFactor: 1.2, burnoutThreshold: 1.5 },
  '13-14': { studyTarget: 8.5, sleepTarget: 8.5, freePlayMin: 45, chineseFactor: 1.1, burnoutThreshold: 1.6 },
}

type AgeParams = (typeof AGE_PARAMS)['7-9']

function getAgeParams(age?: number): AgeParams {
  if (!age || age < 7) return AGE_PARAMS['4-6']
  if (age < 10) return AGE_PARAMS['7-9']
  if (age < 13) return AGE_PARAMS['10-12']
  return AGE_PARAMS['13-14']
}

function calcSleepHours(input: EnergyInput): number | null {
  if (input.sleepStart && input.sleepEnd) {
    const start = new Date(`2000-01-01 ${input.sleepStart}`)
    const end = new Date(`2000-01-01 ${input.sleepEnd}`)
    if (end < start) end.setDate(end.getDate() + 1)
    return (end.getTime() - start.getTime()) / 3600000
  }
  if (input.usualBedtime && input.schoolStartTime) {
    const bedtime = new Date(`2000-01-01 ${input.usualBedtime}`)
    const schoolTime = new Date(`2000-01-01 ${input.schoolStartTime}`)
    const wakeTime = new Date(schoolTime.getTime() - 45 * 60000)
    let hours = (wakeTime.getTime() - bedtime.getTime()) / 3600000
    if (hours < 0) hours += 24
    return hours
  }
  return null
}

function simpleIntensityCalc(
  events: NonNullable<EnergyInput['todayEvents']>,
  params: AgeParams,
): number {
  let load = 0
  let classCount = 0

  events.forEach((e) => {
    switch (e.event_type) {
      case 'exam':
        load += 50
        break
      case 'medical':
        load += 20
        break
      case 'trip':
      case 'activity':
        load += 30
        break
      case 'class':
        classCount++
        break
      case 'extracurricular':
        load += 15
        break
      case 'chinese':
        load += 20 * params.chineseFactor
        break
      default:
        break
    }
    if (e.requires_action) load += 10
    if (e.requires_payment) load += 10
  })

  if (classCount > 6) load += 25
  else if (classCount > 4) load += 10

  const loadScore = Math.max(0, 100 - load)
  return 1 - loadScore / 100
}

function calculateEventIntensity(
  events: NonNullable<EnergyInput['todayEvents']>,
  intelligence?: WeeklyScheduleIntelligence,
): number | null {
  if (!intelligence?.courses?.length) return null

  let totalLoad = 1.0

  for (const event of events) {
    const subject = String(event.subject || event.title || '').trim()
    if (!subject) continue

    const courseLoad = intelligence.courses.find(
      (c) => c.subject === subject || subject.includes(c.subject) || c.subject.includes(subject),
    )
    if (courseLoad) {
      totalLoad += (courseLoad.loadScore - 1) * 0.1
      totalLoad -= courseLoad.recoveryValue * 0.05
    }
  }

  return Math.max(0.5, Math.min(2.5, totalLoad))
}

function calcTodayIntensity(input: EnergyInput, params: AgeParams): number {
  const events = input.todayEvents || []

  const aiIntensity = calculateEventIntensity(events, input.intelligence)
  let intensity = aiIntensity ?? simpleIntensityCalc(events, params)

  let healthMultiplier = 1.0
  if (input.healthStatus === 'sick') healthMultiplier = 1.6
  else if (input.healthStatus === 'recovering') healthMultiplier = 1.3
  if (input.moodStatus === 'upset') healthMultiplier *= 1.2
  else if (input.moodStatus === 'anxious') healthMultiplier *= 1.15

  return Math.min(2.0, intensity * healthMultiplier)
}

function calcWeeklyFatigue(input: EnergyInput, params: AgeParams): number {
  const logs = input.weeklyLogs || []

  let sleepDebt = 0
  logs.forEach(log => {
    if (log.sleep_start && log.sleep_end) {
      const start = new Date(`2000-01-01 ${log.sleep_start}`)
      const end = new Date(`2000-01-01 ${log.sleep_end}`)
      if (end < start) end.setDate(end.getDate() + 1)
      const hours = (end.getTime() - start.getTime()) / 3600000
      const deficit = Math.max(0, params.sleepTarget - hours)
      sleepDebt += deficit
    }
  })
  const sleepDebtScore = Math.min(10, (sleepDebt / params.sleepTarget) * 10)

  const moodScores = logs.map(log => {
    if (log.mood_status === 'happy') return 5
    if (log.mood_status === 'calm') return 4
    if (log.mood_status === 'neutral') return 3
    if (log.mood_status === 'anxious') return 2
    if (log.mood_status === 'upset') return 1
    return 3
  })
  const avgMood = logs.length > 0
    ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
    : 3
  const moodTrendScore = Math.max(0, (3 - avgMood) * 2.5)

  const avgBurdenScore = logs.length > 0
    ? logs.reduce((sum, log) => {
      const score = log.mood_status === 'upset' ? 8
        : log.mood_status === 'anxious' ? 7
        : log.mood_status === 'neutral' ? 4
        : log.mood_status === 'calm' ? 3
        : 2
      return sum + score
    }, 0) / logs.length
    : 0

  const fatigue = sleepDebt > 0 || moodTrendScore > 0
    ? 0.45 * sleepDebtScore + 0.35 * avgBurdenScore + 0.20 * moodTrendScore
    : 0
  return Math.min(10, Math.round(fatigue * 10) / 10)
}

export function calculateEnergy(input: EnergyInput): EnergyResult {
  const hasAnyData =
    input.healthStatus ||
    input.moodStatus ||
    input.sleepStart ||
    input.usualBedtime ||
    (input.todayEvents && input.todayEvents.length > 0)

  if (!hasAnyData) {
    return {
      score: null,
      level: 'unknown',
      label: '暂无数据',
      focus: '完善孩子档案，让根更了解孩子',
      advice: '填写孩子的作息时间和课表，可以获得更准确的状态评估',
      weeklyFatigue: 0,
    }
  }

  const params = getAgeParams(input.age)
  const intensity = calcTodayIntensity(input, params)
  const weeklyFatigue = calcWeeklyFatigue(input, params)
  const sleepHours = calcSleepHours(input)

  let level: EnergyLevel
  let label: string
  let focus: string
  let advice: string

  const isSick = input.healthStatus === 'sick'

  if (isSick) {
    level = 'red'
    label = '生病休息'
    focus = '孩子生病中，身体需要充分休息'
    advice = '今天建议取消所有课外活动，保证充足睡眠，多补充水分'
  } else if (weeklyFatigue > 7 || (intensity > 1.4 && weeklyFatigue > 5)) {
    level = 'red'
    label = '电量告急'
    focus = '本周累积疲劳较重，需要充分休息'
    advice = '今晚建议提前30分钟睡觉，取消不必要的补习，让大脑充分恢复'
  } else if (intensity > 1.2 || weeklyFatigue > 5.5) {
    level = 'orange'
    label = '任务繁重'
    focus = '今天课业安排较多，注意不要叠加太多活动'
    advice = '今晚作业后安排15分钟放松时间，不要马上开始下一项学习'
  } else if (intensity > 0.8 || weeklyFatigue > 3.5) {
    level = 'yellow'
    label = '节奏适中'
    focus = '今日安排合理，保持节奏即可'
    advice = '保持规律作息，今天状态不错'
  } else {
    level = 'green'
    label = '轻松舒缓'
    focus = '今天安排轻松，适合户外活动'
    advice = '今天可以安排一些自由玩耍时间，让孩子放松充电'
  }

  if (sleepHours !== null && params.sleepTarget) {
    const deficit = params.sleepTarget - sleepHours
    if (deficit > 1.5 && level !== 'red') {
      advice += `（昨晚睡眠不足，今晚建议提前${Math.round(deficit * 60)}分钟睡觉）`
    }
  }

  const score = Math.round(Math.max(0, Math.min(100, (1 - intensity * 0.5) * 100)))

  return { score, level, label, focus, advice, weeklyFatigue }
}

export function getEnergyColor(score: number | null | undefined): string {
  if (score == null) return '#9ca3af'
  if (score >= 75) return '#8ca88d'
  if (score >= 55) return '#b88e5e'
  if (score >= 35) return '#e6a89e'
  return '#d58074'
}

export function getEnergyLevel(score: number | null | undefined): EnergyLevel {
  if (score == null) return 'unknown'
  if (score >= 75) return 'green'
  if (score >= 55) return 'yellow'
  if (score >= 35) return 'orange'
  return 'red'
}
