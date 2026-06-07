import type { SupabaseClient } from '@supabase/supabase-js'
import { persistClassSchedule } from '@/lib/schedule/persistSchedule'
import type { WeekSchedule } from '@/lib/schedule/normalizeSchedule'
import { getAuthDb, getDb } from '@/lib/services/_db'

export type ScheduleSource = 'parse-schedule' | 'rian' | 'manual' | 'archive'

export interface SaveScheduleResult {
  ok: boolean
  schedule?: WeekSchedule
  school_start_time?: string | null
  school_end_time?: string | null
  error?: string
}

export const ScheduleService = {
  async save(
    childId: string,
    userId: string,
    rawSchedule: Record<string, unknown[]>,
    source: ScheduleSource,
    options: { enrich?: boolean; client?: SupabaseClient } = {},
  ): Promise<SaveScheduleResult> {
    try {
      const supabase = getDb(options.client)
      const result = await persistClassSchedule(supabase, childId, userId, rawSchedule, {
        source,
        enrich: options.enrich ?? source === 'parse-schedule',
      })
      return {
        ok: true,
        schedule: result.schedule,
        school_start_time: result.school_start_time,
        school_end_time: result.school_end_time,
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'save failed'
      console.error('[ScheduleService.save]', message)
      return { ok: false, error: message }
    }
  },

  async get(childId: string, client?: SupabaseClient): Promise<WeekSchedule | null> {
    try {
      const supabase = client ? getDb(client) : await getAuthDb()
      const { data } = await supabase
        .from('child_profiles')
        .select('class_schedule')
        .eq('child_id', childId)
        .maybeSingle()
      return (data?.class_schedule as WeekSchedule) || null
    } catch (e: unknown) {
      console.error('[ScheduleService.get]', e)
      return null
    }
  },

  async getToday(childId: string, client?: SupabaseClient): Promise<unknown[]> {
    const schedule = await this.get(childId, client)
    if (!schedule) return []
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    const today = days[new Date().getDay()]
    return schedule[today] || []
  },
}
