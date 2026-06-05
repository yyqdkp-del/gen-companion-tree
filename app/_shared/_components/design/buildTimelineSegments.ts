import type { TimelineItem } from '@/app/_shared/_types'
import type { DropStateKey } from './dropStates'
import type { TimelineSegmentData, TimelineSegmentItem } from './TimelineSegment'
import type { PriKind } from './priorityTokens'

function timelineToMin(time: string | undefined): number {
  if (!time) return -1
  const parts = time.split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return -1
  return parts[0] * 60 + (parts[1] || 0)
}

function parseSchoolStartMin(schoolStart?: string | null): number {
  const min = timelineToMin(schoolStart || undefined)
  return min >= 0 ? min : 8 * 60
}

function segmentStateForItems(items: TimelineSegmentItem[], defaultState: DropStateKey): DropStateKey {
  if (items.some((i) => i.priority === 'red' || i.priority === 'orange')) return 'orange'
  if (items.length > 2) return 'yellow'
  return defaultState
}

export function buildTimelineSegments(
  timeline: TimelineItem[],
  todayEvents: { title?: string; date_start?: string; requires_action?: string }[],
  schoolStartTime?: string | null,
): TimelineSegmentData[] {
  const schoolStart = parseSchoolStartMin(schoolStartTime)
  const schoolEnd = 15 * 60
  const eveningStart = 15 * 60 + 30

  const morning: TimelineSegmentItem[] = []
  const school: TimelineSegmentItem[] = []
  const evening: TimelineSegmentItem[] = []

  const seen = new Set<string>()
  for (const item of timeline) {
    const min = timelineToMin(item.time)
    const title = String(item.title || '').trim()
    if (!title || min < 0) continue
    const key = `${min}|${title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    const row: TimelineSegmentItem = {
      title,
      subtitle: item.time ? `${item.time}${item.end_time ? ` – ${item.end_time}` : ''}` : '今日',
    }

    if (min < schoolStart) morning.push(row)
    else if (min < schoolEnd) school.push(row)
    else evening.push(row)
  }

  for (const ev of todayEvents) {
    const title = String(ev.title || '').trim()
    if (!title) continue
    const row: TimelineSegmentItem = {
      title,
      subtitle: ev.requires_action || '今日安排',
      priority: 'yellow' as PriKind,
    }
    if (!evening.some((e) => e.title === title) && !school.some((e) => e.title === title)) {
      evening.push(row)
    }
  }

  const fmt = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const morningStart = Math.max(6 * 60 + 40, schoolStart - 80)

  return [
    {
      tag: '晨',
      en: 'MORNING',
      time: `${fmt(morningStart)} – ${fmt(schoolStart)}`,
      state: segmentStateForItems(morning, 'calm'),
      items: morning,
    },
    {
      tag: '校',
      en: 'SCHOOL',
      time: `${fmt(schoolStart)} – ${fmt(schoolEnd)}`,
      state: segmentStateForItems(school, 'yellow'),
      items: school,
    },
    {
      tag: '暮',
      en: 'EVENING',
      time: `${fmt(eveningStart)} – 21:00`,
      state: segmentStateForItems(evening, 'orange'),
      items: evening,
    },
  ]
}
