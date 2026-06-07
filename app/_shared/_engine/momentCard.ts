import type { RootBriefing } from '@/app/_shared/_components/design'
import type { HotspotItem, TodoItem } from '@/app/_shared/_types'
import type { WeeklyScheduleIntelligence } from '@/lib/ai/scheduleIntelligence'
import { getPickupMomentSubtitle } from '@/lib/ai/scheduleIntelligence'
import { formatEveningPrepFromSmartItems, type SmartPackingItem } from '@/lib/packing/packingMemory'
import { getTodayStr } from '@/lib/date/localDate'
import { isRainyWeather, type SimpleWeather } from '@/lib/realtime/weather'

export type MomentKind =
  | 'sick'
  | 'visa'
  | 'correlation'
  | 'weekend'
  | 'packing'
  | 'pickup'
  | 'at_school'
  | 'after_school'
  | 'todo'
  | 'night'
  | 'overview'

export type MomentTier = 'urgent' | 'important' | 'normal'

export type MomentTheme = 'warm-orange' | 'clay-red' | 'neutral'

export type MomentAction =
  | { type: 'child' }
  | { type: 'visa' }
  | { type: 'pack_ready' }
  | { type: 'one_tap'; todoId: string }
  | { type: 'treehouse' }
  | { type: 'todo_sheet' }
  | { type: 'briefing_todo'; todoId: string }
  | { type: 'briefing_urgent' }
  | { type: 'briefing_link'; href: string }
  | { type: 'correlation'; hotspotId: string }

export type PackLine = { item: string; context?: string; isHighRisk?: boolean }

export type ScheduleClass = {
  name_zh?: string
  subject?: string
  name?: string
  title?: string
  time?: string
  category?: string
  requires_items?: string[]
}

export type NextClassInfo = { name: string; time?: string }

export type CalendarEvent = {
  date_start?: string
  event_type?: string
  title?: string
}

export type ChildLocation = 'home' | 'commuting' | 'school' | 'pickup'

export type MomentCardData = {
  kind: MomentKind
  tier: MomentTier
  theme: MomentTheme
  title: string
  subtitle?: string
  eyebrow?: string
  kidName?: string
  nextClass?: NextClassInfo
  showRainTip?: boolean
  pickupLocation?: string
  bullets?: PackLine[]
  pulse?: boolean
  primaryAction?: { label: string; action: MomentAction }
  secondaryAction?: { label: string; action: MomentAction }
  todoId?: string
  schoolEndTime?: string
  briefing?: RootBriefing
}

const PICKUP_RE = /pick\s*up|pickup|drop\s*off|dropoff|接送/i

const CORRELATION_SHORT_TITLE: Record<string, string> = {
  visa_school_correlation: '签证+学期结束',
  flight_weather_risk: '航班出行',
  sick_school_correlation: '生病请假',
  payment_timing: '付款时机',
  event_packing_reminder: '活动准备',
}

export function findHighCorrelationHotspot(hotspots: HotspotItem[]): HotspotItem | null {
  for (const h of hotspots) {
    if (h.category !== 'correlation') continue
    const data = h.action_data as { source?: string; urgency?: string } | undefined
    if (data?.source === 'brain' && data?.urgency === 'high') {
      if (h.status === 'unread' || !h.status) return h
    }
  }
  return null
}

/** 统一时间展示：只取 HH:MM，去掉秒数 */
export function formatTime(t: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function subjectCandidates(cls: ScheduleClass): string[] {
  return [cls?.subject, cls?.name, cls?.name_zh]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
}

function isPickupSubject(cls: ScheduleClass): boolean {
  return subjectCandidates(cls).some((raw) => PICKUP_RE.test(raw))
}

export function isRealScheduleClass(cls: ScheduleClass | null | undefined): boolean {
  if (!cls) return false

  const cat = String(cls?.category ?? '').trim().toLowerCase()
  if (cat) {
    return cat === 'class' || cat === 'activity'
  }

  const candidates = subjectCandidates(cls)
  if (!candidates.length) return false
  return !isPickupSubject(cls)
}

export function getClassName(cls: ScheduleClass | null | undefined): string {
  if (!isRealScheduleClass(cls)) return '课程'
  const name = cls?.name_zh || cls?.subject || cls?.name
  return name ? String(name).trim() : '课程'
}

export function timeToMinutes(time?: string): number {
  if (!time) return -1
  const parts = formatTime(time).split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0])) return -1
  return parts[0] * 60 + (parts[1] || 0)
}

/** @deprecated use timeToMinutes */
export function parseTimeMin(time?: string): number {
  return timeToMinutes(time)
}

export function isSchoolDay(date: Date, calendar: CalendarEvent[]): boolean {
  const dow = date.getDay()
  if (dow === 0 || dow === 6) return false

  const today = getTodayStr(date)
  const holiday = calendar.find((e) =>
    e.date_start === today &&
    (e.event_type === 'holiday' ||
      e.event_type === 'no_school' ||
      e.title?.includes('假') ||
      e.title?.includes('Holiday') ||
      e.title?.includes('No School')),
  )
  return !holiday
}

export function getChildLocation(
  hour: number,
  minute: number,
  isSchoolDayToday: boolean,
  schoolStart: string,
  schoolEnd: string,
): ChildLocation {
  if (!isSchoolDayToday) return 'home'

  const startMin = timeToMinutes(schoolStart)
  const endMin = timeToMinutes(schoolEnd)
  const nowMin = hour * 60 + minute

  if (startMin < 0 || endMin < 0) return 'home'
  if (nowMin < startMin - 30) return 'home'
  if (nowMin < startMin) return 'commuting'
  if (nowMin < endMin) return 'school'
  if (nowMin < endMin + 60) return 'pickup'
  return 'home'
}

export function isInPickupWindow(hour: number, minute: number, schoolEndTime?: string): boolean {
  const endMin = timeToMinutes(schoolEndTime)
  if (endMin < 0) return false
  const nowMin = hour * 60 + minute
  return nowMin >= endMin - 30 && nowMin < endMin
}

export function isAfterSchool(hour: number, minute: number, schoolEndTime?: string): boolean {
  const endMin = timeToMinutes(schoolEndTime)
  if (endMin < 0) return false
  const nowMin = hour * 60 + minute
  return nowMin >= endMin && nowMin < endMin + 90
}

export function findNextClassToday(classes: ScheduleClass[], nowMin: number): NextClassInfo | null {
  const sorted = [...classes].sort(
    (a, b) => timeToMinutes(a?.time) - timeToMinutes(b?.time),
  )
  for (const cls of sorted) {
    if (!isRealScheduleClass(cls)) continue
    const t = timeToMinutes(cls?.time)
    if (t >= 0 && t > nowMin) {
      const name = getClassName(cls)
      if (name === '课程') continue
      return { name, time: formatTime(cls?.time || '') }
    }
  }
  return null
}

export function hasRainOrFloodAlert(hotspots: HotspotItem[]): boolean {
  return hotspots.some((h) =>
    /雨|洪水|暴雨|台风|洪涝|flood|rain|storm/i.test(
      `${h?.title || ''} ${h?.summary || ''}`,
    ),
  )
}

export function buildPackLines(classes: ScheduleClass[]): PackLine[] {
  const seen = new Set<string>()
  const out: PackLine[] = []
  for (const c of classes) {
    if (!isRealScheduleClass(c)) continue
    const ctx = getClassName(c)
    const ctxLabel = ctx !== '课程' ? ctx : undefined
    for (const raw of c?.requires_items || []) {
      const item = String(raw).trim()
      if (!item || seen.has(item)) continue
      seen.add(item)
      out.push({ item, context: ctxLabel })
    }
  }
  return out
}

export type BuildMomentParams = {
  now: Date
  activeKid: {
    name?: string
    display_health?: string
    health_status?: string
    display_mood?: string
    mood_status?: string
    energy_label?: string
    school_start_time?: string
    school_end_time?: string
    school_name?: string
    urgent_items?: { title: string; level: 'red' | 'orange' | 'yellow' }[]
  } | null
  todayClasses: ScheduleClass[]
  tomorrowClasses?: ScheduleClass[]
  calendar?: CalendarEvent[]
  visaDaysLeft: number | null
  todayTodos: TodoItem[]
  topTodo: TodoItem | undefined
  doneTodayCount?: number
  packReadyDismissed: boolean
  overviewBriefing: RootBriefing
  hotspots?: HotspotItem[]
  scheduleIntelligence?: WeeklyScheduleIntelligence | null
  smartPacking?: SmartPackingItem[]
  tomorrowSmartPacking?: SmartPackingItem[]
  weather?: SimpleWeather | null
}

function cleanTodoTitle(todo?: TodoItem): string {
  return todo?.title?.replace(/^📅\s*/, '').trim() || ''
}

function dayOffLabel(date: Date): string {
  const dow = date.getDay()
  if (dow === 6) return '周六'
  if (dow === 0) return '周日'
  return '放假'
}

function findNextWeekHighlight(p: BuildMomentParams): string | null {
  const calendar = p.calendar || []
  const today = getTodayStr(p.now)
  const upcoming = calendar
    .filter((e) => e.date_start && e.date_start > today)
    .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)))
  if (upcoming[0]?.title) return String(upcoming[0].title).trim()

  const urgent = (p.activeKid?.urgent_items || []).find((u) => u.level === 'yellow')
  return urgent?.title || null
}

function collectTomorrowPrep(tomorrowClasses: ScheduleClass[]): string | null {
  const packItems = buildPackLines(tomorrowClasses).map((b) => b.item)
  if (packItems.length) {
    const preview = packItems.slice(0, 3).join('、')
    return `明天记得带 ${preview}${packItems.length > 3 ? ' 等' : ''}`
  }
  const pe = tomorrowClasses.find(
    (c) => isRealScheduleClass(c) && /体育|游泳|PE|Sport|physical/i.test(getClassName(c)),
  )
  if (pe) return `明天有${getClassName(pe)}`
  return null
}

function getEveningMoodPhrase(activeKid: BuildMomentParams['activeKid']): string {
  const mood = activeKid?.display_mood || activeKid?.mood_status
  const label = activeKid?.energy_label
  if (mood === 'happy' || mood === 'calm') return '在学校很开心'
  if (label && /好|充足|不错|稳定/.test(label)) return '在学校很开心'
  if (mood === 'upset' || mood === 'anxious' || mood === 'tired') return '状态一般'
  if (label && /低|累|差|一般/.test(label)) return '状态一般'
  return '今天结束了'
}

function buildWeekendCard(p: BuildMomentParams): MomentCardData {
  const kidName = p.activeKid?.name || '孩子'
  const label = dayOffLabel(p.now)
  const topTodo = cleanTodoTitle(p.topTodo)
  const lines: string[] = []

  if (p.doneTodayCount && p.doneTodayCount > 0) {
    lines.push(`这周你已处理 ${p.doneTodayCount} 件事`)
  }

  const energyLabel = p.activeKid?.energy_label
  if (energyLabel && energyLabel !== '暂无数据') {
    lines.push(`${kidName}这周：${energyLabel}`)
  }

  const nextWeek = findNextWeekHighlight(p)
  if (nextWeek) lines.push(`下周要准备：${nextWeek}`)

  if (topTodo) {
    lines.push(`要紧的事：${topTodo.length > 22 ? `${topTodo.slice(0, 22)}…` : topTodo}`)
  }

  if (p.visaDaysLeft != null && p.visaDaysLeft <= 30 && p.visaDaysLeft >= 0) {
    lines.push(
      p.visaDaysLeft <= 7
        ? `签证还有 ${p.visaDaysLeft} 天，趁周末赶紧处理`
        : `签证还有 ${p.visaDaysLeft} 天，趁周末处理一下？`,
    )
  }

  const card: MomentCardData = {
    kind: 'weekend',
    tier: 'normal',
    theme: 'neutral',
    eyebrow: '根对此刻的感知',
    title: `今天${label}，好好休息`,
    subtitle: lines.length ? lines.join('\n') : '难得歇一歇，根替你盯着下周的事',
    kidName,
  }

  if (p.topTodo) {
    card.todoId = p.topTodo.id
    card.primaryAction = {
      label: '处理最要紧的事',
      action: { type: 'one_tap', todoId: p.topTodo.id },
    }
  } else if (p.visaDaysLeft != null && p.visaDaysLeft <= 30) {
    card.primaryAction = { label: '查看证件事项', action: { type: 'visa' } }
  }

  return card
}

function buildAtSchoolCard(p: BuildMomentParams, schoolEnd: string): MomentCardData {
  const kidName = p.activeKid?.name || '孩子'
  const endDisplay = formatTime(schoolEnd)
  const remaining = p.todayTodos.length

  if (remaining > 0) {
    return {
      kind: 'at_school',
      tier: 'normal',
      theme: 'neutral',
      eyebrow: '根对此刻的感知',
      title: `今天还剩 ${remaining} 件待办`,
      subtitle: '趁现在处理一下，接孩子前能轻松点',
      todoId: p.topTodo?.id,
      primaryAction: p.topTodo
        ? { label: '先办这一件', action: { type: 'one_tap', todoId: p.topTodo.id } }
        : { label: '查看待办', action: { type: 'todo_sheet' } },
      secondaryAction: { label: '查看全部待办', action: { type: 'todo_sheet' } },
    }
  }

  return {
    kind: 'at_school',
    tier: 'normal',
    theme: 'neutral',
    eyebrow: '根对此刻的感知',
    title: `${kidName}在学校，下午 ${endDisplay} 放学`,
    subtitle: '今天比较清闲，好好陪陪孩子',
    kidName,
    schoolEndTime: endDisplay,
    primaryAction: { label: '查看孩子状态', action: { type: 'child' } },
  }
}

function buildEveningHomeCard(p: BuildMomentParams): MomentCardData {
  const kidName = p.activeKid?.name || '孩子'
  const moodPhrase = getEveningMoodPhrase(p.activeKid)
  const smartEvening = p.tomorrowSmartPacking?.length
    ? formatEveningPrepFromSmartItems(p.tomorrowSmartPacking)
    : null
  const tomorrow = smartEvening || collectTomorrowPrep(p.tomorrowClasses || [])
  const rainAlert = hasRainOrFloodAlert(p.hotspots || [])
  const liveRain = p.weather?.hasRain === true

  const subtitleParts: string[] = []
  if (tomorrow) subtitleParts.push(tomorrow)
  if (rainAlert) subtitleParts.push('明天可能有雨，记得带伞')
  if (liveRain && !rainAlert) subtitleParts.push('今天有雨，记得带伞')

  return {
    kind: 'after_school',
    tier: 'important',
    theme: 'neutral',
    eyebrow: '傍晚',
    kidName,
    title: `${kidName}今天${moodPhrase}`,
    subtitle: subtitleParts.join('\n') || undefined,
    showRainTip: rainAlert || liveRain,
    primaryAction: { label: '查看孩子状态', action: { type: 'child' } },
  }
}

export function buildMomentCard(p: BuildMomentParams): MomentCardData {
  const hour = p.now.getHours()
  const minute = p.now.getMinutes()
  const nowMin = hour * 60 + minute
  const kidName = p.activeKid?.name || '孩子'
  const health = p.activeKid?.display_health || p.activeKid?.health_status
  const hotspots = p.hotspots || []
  const rainAlert = hasRainOrFloodAlert(hotspots)
  const pickupLocation = p.activeKid?.school_name?.trim() || ''
  const calendar = p.calendar || []
  const schoolDay = isSchoolDay(p.now, calendar)
  const schoolStart = p.activeKid?.school_start_time || '08:00'
  const schoolEnd = p.activeKid?.school_end_time || '15:00'
  const location = getChildLocation(hour, minute, schoolDay, schoolStart, schoolEnd)

  // 优先级1：孩子生病
  if (health === 'sick') {
    return {
      kind: 'sick',
      tier: 'urgent',
      theme: 'warm-orange',
      eyebrow: '根对此刻的感知',
      title: `${kidName}今天生病了`,
      subtitle: '记得带药，注意休息\n需要请假吗？',
      primaryAction: { label: '查看孩子状态', action: { type: 'child' } },
    }
  }

  // 优先级2：签证 ≤7天
  if (p.visaDaysLeft != null && p.visaDaysLeft <= 7 && p.visaDaysLeft >= 0) {
    return {
      kind: 'visa',
      tier: 'urgent',
      theme: 'clay-red',
      pulse: true,
      eyebrow: '根对此刻的感知',
      title: `签证还有 ${p.visaDaysLeft} 天`,
      subtitle: '现在必须处理',
      primaryAction: { label: '查看续签清单', action: { type: 'visa' } },
    }
  }

  // 优先级2.5：根的大脑关联洞察（high urgency）
  const correlationHotspot = findHighCorrelationHotspot(hotspots)
  if (correlationHotspot) {
    const brain = correlationHotspot.action_data as {
      insight_type?: string
      reason?: string
    } | undefined
    const shortTitle =
      CORRELATION_SHORT_TITLE[brain?.insight_type || ''] ||
      correlationHotspot.title.replace(/ · .+$/, '')
    return {
      kind: 'correlation',
      tier: 'urgent',
      theme: 'clay-red',
      pulse: true,
      eyebrow: '根发现',
      title: shortTitle,
      subtitle: correlationHotspot.summary || brain?.reason || '根发现了事件之间的关联',
      primaryAction: {
        label: '查看完整分析',
        action: { type: 'correlation', hotspotId: correlationHotspot.id },
      },
    }
  }

  // 优先级3：周末 / 假期
  if (!schoolDay) {
    return buildWeekendCard(p)
  }

  // 优先级4：早上携带物
  const pendingSmartPack = (p.smartPacking || []).filter((i) => !i.isConfirmed)
  if (hour >= 6 && hour < 9 && pendingSmartPack.length > 0 && !p.packReadyDismissed) {
    const bullets: PackLine[] = pendingSmartPack.map((i) => ({
      item: i.itemName,
      context: i.isHighRisk ? '上次忘带过' : (i.course || undefined),
      isHighRisk: i.isHighRisk,
    }))
    return {
      kind: 'packing',
      tier: 'important',
      theme: 'neutral',
      eyebrow: '今天要带',
      kidName,
      title: `${kidName} 的装备清单`,
      bullets,
      primaryAction: { label: '✓ 都准备好了', action: { type: 'pack_ready' } },
    }
  }

  const packLines = buildPackLines(p.todayClasses)
  if (hour >= 6 && hour < 9 && packLines.length > 0 && !p.packReadyDismissed) {
    return {
      kind: 'packing',
      tier: 'important',
      theme: 'neutral',
      eyebrow: '今天要带',
      kidName,
      title: `${kidName} 的装备清单`,
      bullets: packLines,
      primaryAction: { label: '✓ 都准备好了', action: { type: 'pack_ready' } },
    }
  }

  // 优先级5：接送时间
  if (location === 'pickup' || isInPickupWindow(hour, minute, schoolEnd)) {
    const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][p.now.getDay()]
    const scheduleSubtitle = getPickupMomentSubtitle(p.scheduleIntelligence, todayKey)
    const minutesLeft = minutesUntilSchoolEnd(p.now, schoolEnd) ?? 0
    const rainy = isRainyWeather(p.weather)
    const pickupSubtitle = rainy
      ? `${minutesLeft} 分钟后接孩子 · 有雨提前出发`
      : scheduleSubtitle || `${minutesLeft} 分钟后接孩子`
    const pickupBullets: PackLine[] | undefined = rainy
      ? [
          { item: '今天有雨，建议提前出发' },
          { item: '记得带伞' },
        ]
      : undefined

    return {
      kind: 'pickup',
      tier: 'important',
      theme: 'neutral',
      eyebrow: '接孩子',
      kidName,
      title: `距接 ${kidName} 还有`,
      subtitle: pickupSubtitle,
      bullets: pickupBullets,
      showRainTip: rainy,
      schoolEndTime: formatTime(schoolEnd),
      pickupLocation,
    }
  }

  // 优先级6：孩子在学校
  if (location === 'school') {
    return buildAtSchoolCard(p, schoolEnd)
  }

  // 优先级7：傍晚回家后
  if (location === 'home' && hour >= 17 && hour < 21) {
    return buildEveningHomeCard(p)
  }

  // 优先级8：深夜
  if (hour >= 21 || hour < 6) {
    return {
      kind: 'night',
      tier: 'normal',
      theme: 'neutral',
      eyebrow: '根对此刻的感知',
      title: '今天辛苦了',
      subtitle: `${kidName} 睡了吗？根在这里陪你`,
      primaryAction: { label: '和根说说话', action: { type: 'treehouse' } },
    }
  }

  // 优先级9：默认 — 最重要待办
  if (p.todayTodos.length > 0) {
    const top = p.topTodo || p.todayTodos[0]
    const todoTitle = cleanTodoTitle(top) || '待办'
    return {
      kind: 'todo',
      tier: 'normal',
      theme: 'neutral',
      eyebrow: '根对此刻的感知',
      title: '下一件要紧的事',
      subtitle: todoTitle,
      todoId: top.id,
      primaryAction: { label: '一键办理', action: { type: 'one_tap', todoId: top.id } },
      secondaryAction: { label: '查看全部待办', action: { type: 'todo_sheet' } },
    }
  }

  return {
    kind: 'overview',
    tier: 'normal',
    theme: 'neutral',
    eyebrow: '根对此刻的感知',
    title: p.overviewBriefing.greeting,
    briefing: p.overviewBriefing,
  }
}

export function minutesUntilSchoolEnd(now: Date, schoolEndTime?: string): number | null {
  const endMin = timeToMinutes(schoolEndTime)
  if (endMin < 0) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const diff = endMin - nowMin
  return diff > 0 ? diff : 0
}
