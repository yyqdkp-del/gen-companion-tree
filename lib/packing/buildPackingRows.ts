import type { TimelineItem } from '@/app/_shared/_types'
import {
  isItemDismissed,
  normalizeRequiresItems,
  packingSubjectKey,
  type PackingPreferencesMap,
} from '@/lib/packing/packingPreferences'

export type PackingRow = {
  id: string
  item: string
  courseLabel: string
  /** null = 今天一次性（来自 packing_lists） */
  subjectKey: string | null
}

export function buildPackingRows(
  timeline: TimelineItem[],
  calendarToday: { title?: string; requires_items?: unknown }[],
  manualListItems: string[],
  prefs: PackingPreferencesMap,
): PackingRow[] {
  const rows: PackingRow[] = []
  const seen = new Set<string>()

  const push = (row: Omit<PackingRow, 'id'> & { id?: string }) => {
    const id = row.id ?? `${row.subjectKey ?? '_once'}|${row.item}`
    if (seen.has(id)) return
    seen.add(id)
    rows.push({ id, item: row.item, courseLabel: row.courseLabel, subjectKey: row.subjectKey })
  }

  for (const t of timeline.filter((x) => x.source === 'schedule')) {
    const ev = (t.event || {}) as { subject?: string; requires_items?: unknown }
    const subjectKey = packingSubjectKey(ev.subject)
    if (!subjectKey) continue
    const fromSchedule = normalizeRequiresItems(ev.requires_items)
    const fromPrefs = prefs[subjectKey]?.items ?? []
    const items = [...new Set([...fromSchedule, ...fromPrefs])]
    for (const item of items) {
      if (isItemDismissed(prefs, subjectKey, item)) continue
      push({ item, courseLabel: t.title || subjectKey, subjectKey })
    }
  }

  for (const e of calendarToday) {
    const title = String(e.title || '活动').trim()
    const subjectKey = `cal:${title}`
    const items = normalizeRequiresItems(e.requires_items)
    for (const item of items) {
      if (isItemDismissed(prefs, subjectKey, item)) continue
      push({ item, courseLabel: title, subjectKey })
    }
  }

  for (const item of manualListItems) {
    push({ item, courseLabel: '今天额外', subjectKey: null, id: `_once|${item}` })
  }

  return rows
}

export function countPendingPackingRows(
  rows: PackingRow[],
  brought: Record<string, boolean>,
): number {
  return rows.filter((r) => !brought[r.id]).length
}
