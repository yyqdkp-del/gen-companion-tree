import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshScheduleIntelligence } from '@/lib/ai/scheduleIntelligence'
import { initPackingMemoryFromSchedule } from '@/lib/packing/packingMemory'
import { enrichSchedule } from '@/lib/schedule/enrichSchedule'
import {
  countScheduleEntries,
  inferSchoolTimes,
  normalizeWeekSchedule,
  parseRawSchedule,
  preserveCategories,
  type ClassEntry,
  type WeekSchedule,
} from '@/lib/schedule/normalizeSchedule'

export type { ClassEntry, WeekSchedule }

export async function persistClassSchedule(
  supabase: SupabaseClient,
  childId: string,
  userId: string,
  rawSchedule: unknown,
  options: {
    enrich?: boolean
    source?: string
  } = {},
): Promise<{
  schedule: WeekSchedule
  school_start_time: string | null
  school_end_time: string | null
}> {
  const parsed = parseRawSchedule(rawSchedule)
  const normalized = normalizeWeekSchedule(parsed)
  const withCategory = preserveCategories(normalized, parsed)

  let final = withCategory
  if (options.enrich !== false) {
    try {
      const enriched = await enrichSchedule(withCategory)
      if (enriched) final = enriched
    } catch (e) {
      console.error('[persistSchedule] enrich failed, using normalized:', e)
    }
  }

  const { school_start_time, school_end_time } = inferSchoolTimes(final)

  const { error: profileError } = await supabase
    .from('child_profiles')
    .upsert(
      {
        user_id: userId,
        child_id: childId,
        class_schedule: final,
        schedule_source: options.source || 'unknown',
        schedule_updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id' },
    )

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (school_start_time || school_end_time) {
    const childUpdate: { school_start_time?: string; school_end_time?: string } = {}
    if (school_start_time) childUpdate.school_start_time = school_start_time
    if (school_end_time) childUpdate.school_end_time = school_end_time

    const { error: childError } = await supabase
      .from('children')
      .update(childUpdate)
      .eq('id', childId)
      .eq('user_id', userId)

    if (childError) {
      console.error('[persistSchedule] children update failed:', childError.message)
    }
  }

  void initPackingMemoryFromSchedule(childId, userId, final, supabase).catch((err) => {
    console.error('[persistSchedule] packing memory init failed:', err)
  })

  void refreshScheduleIntelligence({
    userId,
    childId,
    classSchedule: final,
    supabase,
  }).catch((err) => {
    console.error('[persistSchedule] schedule intelligence failed:', err)
  })

  console.log(`[persistSchedule] saved for ${childId} from ${options.source || 'unknown'}`, countScheduleEntries(final), 'entries')
  return { schedule: final, school_start_time, school_end_time }
}
