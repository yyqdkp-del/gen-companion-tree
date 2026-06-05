import type { RootBriefing } from '@/app/_shared/_components/design'
import type { TodoItem } from '@/app/_shared/_types'

export type MomentKind =
  | 'sick'
  | 'visa'
  | 'packing'
  | 'pickup'
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

type ScheduleItem = { title?: string; requires_items?: string[] }

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

export function buildPackLines(classes: ScheduleItem[]): PackLine[] {
  const seen = new Set<string>()
  const out: PackLine[] = []
  for (const c of classes) {
    const ctx = String(c.title || '').trim() || undefined
    for (const raw of c.requires_items || []) {
      const item = String(raw).trim()
      if (!item || seen.has(item)) continue
      seen.add(item)
      out.push({ item, context: ctx })
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
  todayClasses: ScheduleItem[]
  visaDaysLeft: number | null
  todayTodos: TodoItem[]
  topTodo: TodoItem | undefined
  packReadyDismissed: boolean
  overviewBriefing: RootBriefing
}

export function buildMomentCard(p: BuildMomentParams): MomentCardData {
  const hour = p.now.getHours()
  const minute = p.now.getMinutes()
  const kidName = p.activeKid?.name || '孩子'
  const health = p.activeKid?.display_health || p.activeKid?.health_status

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
      title: `今天${kidName}要带：`,
      subtitle: '准备好了吗？',
      bullets: packLines,
      primaryAction: { label: '✓ 都准备好了', action: { type: 'pack_ready' } },
    }
  }

  const schoolEnd = p.activeKid?.school_end_time
  if (isInPickupWindow(hour, minute, schoolEnd)) {
    return {
      kind: 'pickup',
      tier: 'important',
      theme: 'neutral',
      title: '距离接孩子',
      subtitle: '还有',
      schoolEndTime: schoolEnd,
    }
  }

  if (p.todayTodos.length > 0) {
    const top = p.topTodo || p.todayTodos[0]
    const title = top.title?.replace(/^📅\s*/, '') || '待办'
    return {
      kind: 'todo',
      tier: 'normal',
      theme: 'neutral',
      title: '今日必须处理',
      subtitle: title,
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
      subtitle: '孩子睡了吗？\n根在这里陪你',
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
