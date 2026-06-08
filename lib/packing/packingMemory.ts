import { createClient } from '@/lib/supabase/client'
import { getTodayStr } from '@/lib/date/localDate'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabase = createClient()

export interface SmartPackingItem {
  id: string
  itemName: string
  course: string | null
  isConfirmed: boolean
  forgetCount: number
  confirmCount: number
  confidence: number
  isHighRisk: boolean
  priority: 'high' | 'medium' | 'normal'
  remindEveningBefore: boolean
}

type PackingAction = 'confirmed' | 'forgotten' | 'dismissed' | 'all_confirmed'

type ScheduleEntry = {
  subject?: string
  category?: string
  requires_items?: unknown
}

function todayStrFromDate(d: Date): string {
  return getTodayStr(d)
}

function isPackableCategory(category?: string): boolean {
  const cat = String(category || '').toLowerCase()
  return cat !== 'break' && cat !== 'transition'
}

function normalizeRequiresItems(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map((x) => String(x).trim()).filter(Boolean))]
}

async function findMemoryRow(
  client: SupabaseClient,
  childId: string,
  itemName: string,
  course: string | null,
) {
  let q = client
    .from('family_packing_memory')
    .select('*')
    .eq('child_id', childId)
    .eq('item_name', itemName)

  if (course) {
    q = q.eq('course', course)
  } else {
    q = q.is('course', null)
  }

  return q.maybeSingle()
}

export async function initPackingMemoryFromSchedule(
  childId: string,
  userId: string,
  classSchedule: Record<string, unknown[]>,
  client?: SupabaseClient,
): Promise<void> {
  const db = client ?? supabase
  const items: Record<string, unknown>[] = []
  const seen = new Set<string>()

  for (const classes of Object.values(classSchedule)) {
    if (!Array.isArray(classes)) continue
    for (const raw of classes) {
      if (!raw || typeof raw !== 'object') continue
      const cls = raw as ScheduleEntry
      if (!isPackableCategory(cls.category)) continue
      const course = String(cls.subject || '').trim() || null
      for (const item of normalizeRequiresItems(cls.requires_items)) {
        const key = `${course ?? ''}|${item}`
        if (seen.has(key)) continue
        seen.add(key)
        items.push({
          user_id: userId,
          child_id: childId,
          item_name: item,
          course,
          source: 'schedule',
          remind_morning: true,
          remind_evening: false,
          confidence: 0.7,
          is_active: true,
        })
      }
    }
  }

  if (items.length === 0) return

  const { error } = await db.from('family_packing_memory').upsert(items, {
    onConflict: 'child_id,item_name,course',
    ignoreDuplicates: true,
  })

  if (error) {
    console.error('[packingMemory] init from schedule failed:', error.message)
  }
}

export async function addManualPackingMemory(
  childId: string,
  userId: string,
  itemName: string,
  course: string | null,
): Promise<void> {
  const name = itemName.trim()
  if (!name) return

  const { error } = await supabase.from('family_packing_memory').upsert(
    {
      user_id: userId,
      child_id: childId,
      item_name: name,
      course: course || null,
      source: 'manual',
      remind_morning: true,
      remind_evening: false,
      confidence: 0.7,
      is_active: true,
    },
    { onConflict: 'child_id,item_name,course' },
  )

  if (error) {
    console.error('[packingMemory] add manual failed:', error.message)
    throw error
  }
}

export async function recordPackingAction(
  childId: string,
  userId: string,
  itemName: string,
  course: string | null,
  action: PackingAction,
  client?: SupabaseClient,
): Promise<void> {
  const db = client ?? supabase
  const today = getTodayStr()

  const { error: logError } = await db.from('packing_confirm_logs').insert({
    user_id: userId,
    child_id: childId,
    item_name: itemName,
    course,
    date: today,
    action,
  })

  if (logError) {
    console.error('[packingMemory] log insert failed:', logError.message)
    return
  }

  const memory = await findMemoryRow(db, childId, itemName, course)
  if (memory.error || !memory.data) return

  const row = memory.data
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  switch (action) {
    case 'confirmed':
      updates.confirm_count = (row.confirm_count || 0) + 1
      updates.last_confirmed = today
      updates.confidence = Math.min(0.95, (row.confidence || 0.7) + 0.05)
      if ((row.forget_count || 0) === 0 && (row.remind_days_before || 0) > 0) {
        updates.remind_days_before = 0
      }
      break
    case 'forgotten':
      updates.forget_count = (row.forget_count || 0) + 1
      updates.last_forgotten = today
      updates.remind_days_before = Math.min(2, (row.remind_days_before || 0) + 1)
      updates.remind_evening = true
      updates.confidence = Math.max(0.3, (row.confidence || 0.7) - 0.1)
      break
    case 'dismissed':
      updates.is_active = false
      updates.confidence = 0
      break
    case 'all_confirmed':
      updates.confirm_count = (row.confirm_count || 0) + 1
      updates.last_confirmed = today
      updates.confidence = Math.min(0.95, (row.confidence || 0.7) + 0.02)
      break
    default:
      break
  }

  const { error: updateError } = await db
    .from('family_packing_memory')
    .update(updates)
    .eq('id', row.id)

  if (updateError) {
    console.error('[packingMemory] memory update failed:', updateError.message)
  }
}

export async function recordAllPackingConfirmed(
  childId: string,
  userId: string,
  items: SmartPackingItem[],
): Promise<void> {
  for (const item of items) {
    if (item.isConfirmed) continue
    await recordPackingAction(childId, userId, item.itemName, item.course, 'all_confirmed')
  }
}

export async function getSmartPackingList(
  childId: string,
  userId: string,
  todayClasses: ScheduleEntry[],
  targetDate: Date = new Date(),
  opts?: {
    classSchedule?: Record<string, unknown[]>
    autoInit?: boolean
  },
): Promise<SmartPackingItem[]> {
  const targetDateStr = todayStrFromDate(targetDate)
  const today = getTodayStr()

  if (opts?.autoInit && opts.classSchedule) {
    const { count } = await supabase
      .from('family_packing_memory')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('is_active', true)

    if (!count) {
      await initPackingMemoryFromSchedule(childId, userId, opts.classSchedule)
    }
  }

  const { data: memories, error } = await supabase
    .from('family_packing_memory')
    .select('*')
    .eq('child_id', childId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('forget_count', { ascending: false })

  if (error || !memories?.length) return []

  const todayCourses = new Set(
    todayClasses
      .filter((c) => {
        const cat = String(c.category || '').toLowerCase()
        return !cat || cat === 'class' || cat === 'activity'
      })
      .map((c) => String(c.subject || '').trim())
      .filter(Boolean),
  )

  const { data: logs } = await supabase
    .from('packing_confirm_logs')
    .select('item_name, course, action')
    .eq('child_id', childId)
    .eq('date', targetDateStr)
    .in('action', ['confirmed', 'dismissed', 'all_confirmed'])

  const logMap = new Map<string, string>()
  for (const log of logs || []) {
    const key = `${log.course ?? ''}|${log.item_name}`
    logMap.set(key, log.action)
  }

  const result: SmartPackingItem[] = []

  for (const memory of memories) {
    const course = memory.course ? String(memory.course) : null
    if (course && todayCourses.size > 0 && !todayCourses.has(course)) continue

    const logKey = `${course ?? ''}|${memory.item_name}`
    const logAction = logMap.get(logKey)
    const isConfirmed = logAction === 'confirmed' || logAction === 'all_confirmed'
    if (logAction === 'dismissed') continue

    const forgetCount = memory.forget_count || 0
    const confirmCount = memory.confirm_count || 0

    result.push({
      id: memory.id,
      itemName: memory.item_name,
      course,
      isConfirmed,
      forgetCount,
      confirmCount,
      confidence: memory.confidence ?? 0.7,
      isHighRisk: forgetCount > 0,
      priority: forgetCount > 0 ? 'high' : confirmCount === 0 ? 'medium' : 'normal',
      remindEveningBefore: Boolean(memory.remind_evening),
    })
  }

  return result.sort((a, b) => {
    if (a.isHighRisk && !b.isHighRisk) return -1
    if (!a.isHighRisk && b.isHighRisk) return 1
    if (!a.isConfirmed && b.isConfirmed) return -1
    if (a.isConfirmed && !b.isConfirmed) return 1
    return 0
  })
}

export function formatEveningPrepFromSmartItems(items: SmartPackingItem[]): string | null {
  const evening = items.filter((i) => i.remindEveningBefore && !i.isConfirmed)
  if (!evening.length) return null
  const preview = evening.slice(0, 3).map((i) => i.itemName).join('、')
  return `今晚装好：${preview}${evening.length > 3 ? ' 等' : ''}`
}

export function countPendingSmartItems(items: SmartPackingItem[]): number {
  return items.filter((i) => !i.isConfirmed).length
}

export function smartItemsToPackLines(items: SmartPackingItem[]): { item: string; context?: string; isHighRisk: boolean }[] {
  return items
    .filter((i) => !i.isConfirmed)
    .map((i) => ({
      item: i.itemName,
      context: i.isHighRisk ? '上次忘了' : (i.course || undefined),
      isHighRisk: i.isHighRisk,
    }))
}
