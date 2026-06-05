import type { RootBriefing } from '@/app/_shared/_components/design'
import type { HotspotItem, TodoItem } from '@/app/_shared/_types'

export type MomentKind =
  | 'sick'
  | 'visa'
  | 'packing'
  | 'pickup'
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

export type PackLine = { item: string; context?: string }

export type ScheduleClass = {
  name_zh?: string
  subject?: string
  name?: string
  title?: string
  time?: string
  requires_items?: string[]
}

export type MomentCardData = {
  kind: MomentKind
  tier: MomentTier
  theme: MomentTheme
  title: string
  subtitle?: string
  bullets?: PackLine[]
  pulse?: boolean
  primaryAction?: { label: string; action: MomentAction }
  secondaryAction?: { label: string; action: MomentAction }
  todoId?: string
  schoolEndTime?: string
  briefing?: RootBriefing
}

export function getClassName(cls: ScheduleClass | null | undefined): string {
  const name = cls?.name_zh || cls?.subject || cls?.name
  return name ? String(name).trim() : '课程'
}

function parseTimeMin(time?: string): number {
  if (!time) return -1
  const parts = time.split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0])) return -1
  return parts[0] * 60 + (parts[1] || 0)
}

export function isInPickupWindow(hour: number, minute: number, schoolEndTime?: string): boolean {
  const endMin = parseTimeMin(schoolEndTime)
  if (endMin < 0) return false
  const nowMin = hour * 60 + minute
  return nowMin >= endMin - 30 && nowMin < endMin
}

export function isAfterSchool(hour: number, minute: number, schoolEndTime?: string): boolean {
  const endMin = parseTimeMin(schoolEndTime)
  if (endMin < 0) return false
  const nowMin = hour * 60 + minute
  return nowMin >= endMin && nowMin < endMin + 90
}

export function findNextClassToday(classes: ScheduleClass[], nowMin: number): string {
  const sorted = [...classes].sort(
    (a, b) => parseTimeMin(a?.time) - parseTimeMin(b?.time),
  )
  for (const cls of sorted) {
    const t = parseTimeMin(cls?.time)
    if (t >= 0 && t > nowMin) return getClassName(cls)
  }
  return '课程'
}

function hasRainOrFloodAlert(hotspots: HotspotItem[]): boolean {
  return hotspots.some((h) =>
    /雨|洪水|暴雨|台风|洪涝|flood|rain|storm/i.test(
      `${h?.title || ''} ${h?.summary || ''}`,
    ),
  )
}

function buildPickupTips(hotspots: HotspotItem[]): PackLine[] {
  if (!hasRainOrFloodAlert(hotspots)) return []
  return [{ item: '记得带雨伞' }, { item: '路上注意安全' }]
}

export function buildPackLines(classes: ScheduleClass[]): PackLine[] {
  const seen = new Set<string>()
  const out: PackLine[] = []
  for (const c of classes) {
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
    school_end_time?: string
  } | null
  todayClasses: ScheduleClass[]
  visaDaysLeft: number | null
  todayTodos: TodoItem[]
  topTodo: TodoItem | undefined
  packReadyDismissed: boolean
  overviewBriefing: RootBriefing
  hotspots?: HotspotItem[]
}

export function buildMomentCard(p: BuildMomentParams): MomentCardData {
  const hour = p.now.getHours()
  const minute = p.now.getMinutes()
  const nowMin = hour * 60 + minute
  const kidName = p.activeKid?.name || '孩子'
  const health = p.activeKid?.display_health || p.activeKid?.health_status
  const hotspots = p.hotspots || []

  if (health === 'sick') {
    return {
      kind: 'sick',
      tier: 'urgent',
      theme: 'warm-orange',
      title: `${kidName}今天生病了`,
      subtitle: '记得带药，注意休息\n需要请假吗？',
      primaryAction: { label: '查看孩子状态', action: { type: 'child' } },
    }
  }

  if (p.visaDaysLeft != null && p.visaDaysLeft <= 7 && p.visaDaysLeft >= 0) {
    return {
      kind: 'visa',
      tier: 'urgent',
      theme: 'clay-red',
      pulse: true,
      title: `签证还有 ${p.visaDaysLeft} 天`,
      subtitle: '现在必须处理',
      primaryAction: { label: '查看续签清单', action: { type: 'visa' } },
    }
  }

  const packLines = buildPackLines(p.todayClasses)
  if (hour >= 6 && hour < 9 && packLines.length > 0 && !p.packReadyDismissed) {
    return {
      kind: 'packing',
      tier: 'important',
      theme: 'neutral',
      title: `今天 ${kidName} 需要带`,
      bullets: packLines,
      primaryAction: { label: '✓ 都准备好了', action: { type: 'pack_ready' } },
    }
  }

  const schoolEnd = p.activeKid?.school_end_time
  if (isInPickupWindow(hour, minute, schoolEnd)) {
    const minutesLeft = minutesUntilSchoolEnd(p.now, schoolEnd) ?? 0
    const tips = buildPickupTips(hotspots)
    return {
      kind: 'pickup',
      tier: 'important',
      theme: 'neutral',
      title: `距接 ${kidName} 还有`,
      subtitle: `${minutesLeft} 分钟`,
      bullets: tips.length > 0 ? tips : undefined,
      schoolEndTime: schoolEnd,
    }
  }

  if (isAfterSchool(hour, minute, schoolEnd)) {
    const nextClass = findNextClassToday(p.todayClasses, nowMin)
    return {
      kind: 'after_school',
      tier: 'important',
      theme: 'neutral',
      title: `${kidName} 放学了`,
      subtitle: nextClass,
    }
  }

  if (p.todayTodos.length > 0) {
    const top = p.topTodo || p.todayTodos[0]
    const todoTitle = top.title?.replace(/^📅\s*/, '') || '待办'
    return {
      kind: 'todo',
      tier: 'normal',
      theme: 'neutral',
      title: '今日必须处理',
      subtitle: todoTitle,
      todoId: top.id,
      primaryAction: { label: '一键办理', action: { type: 'one_tap', todoId: top.id } },
      secondaryAction: { label: '查看全部待办', action: { type: 'todo_sheet' } },
    }
  }

  if (hour >= 21 || hour < 6) {
    return {
      kind: 'night',
      tier: 'normal',
      theme: 'neutral',
      title: '今天辛苦了',
      subtitle: `${kidName} 睡了吗？根在这里陪你`,
      primaryAction: { label: '和根说说话', action: { type: 'treehouse' } },
    }
  }

  return {
    kind: 'overview',
    tier: 'normal',
    theme: 'neutral',
    title: p.overviewBriefing.greeting,
    briefing: p.overviewBriefing,
  }
}

export function minutesUntilSchoolEnd(now: Date, schoolEndTime?: string): number | null {
  const endMin = parseTimeMin(schoolEndTime)
  if (endMin < 0) return null
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const diff = endMin - nowMin
  return diff > 0 ? diff : 0
}
