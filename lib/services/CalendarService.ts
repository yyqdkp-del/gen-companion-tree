import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthDb, getDb } from '@/lib/services/_db'

export type CalendarSource =
  | 'gmail'
  | 'rian'
  | 'manual'
  | 'school_auto'
  | 'root_vision'
  | 'auto_execute'

export interface CalendarEventInput {
  userId: string
  childId: string
  title: string
  dateStart: string
  dateEnd?: string
  requiresAction?: boolean
  requiresActionText?: string | null
  requiresItems?: string[]
  source: CalendarSource
  sourceEmailId?: string
  notes?: string
  description?: string
  eventType?: string
  requiresPayment?: number | null
  client?: SupabaseClient
}

export interface CalendarEventResult {
  ok: boolean
  id?: string
  error?: string
}

export interface CalendarListItem {
  id: string
  title: string
  date_start: string | null
  requires_action: string | null
  requires_items: unknown
  source: string | null
  child_id: string
}

function mapRequiresAction(input: CalendarEventInput): string | null {
  if (input.requiresActionText != null) return input.requiresActionText
  if (input.requiresAction) return '需要确认'
  return null
}

export const CalendarService = {
  async upsertEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    try {
      const supabase = getDb(input.client)

      const { data: existing } = await supabase
        .from('child_school_calendar')
        .select('id')
        .eq('user_id', input.userId)
        .eq('child_id', input.childId)
        .eq('title', input.title)
        .eq('date_start', input.dateStart)
        .eq('source', input.source)
        .maybeSingle()

      const row = {
        user_id: input.userId,
        child_id: input.childId,
        title: input.title,
        date_start: input.dateStart,
        date_end: input.dateEnd || input.dateStart,
        requires_action: mapRequiresAction(input),
        requires_items: input.requiresItems || [],
        requires_payment: input.requiresPayment ?? null,
        source: input.source,
        source_email_id: input.sourceEmailId || null,
        description: input.description || input.notes || null,
        event_type: input.eventType || 'activity',
      }

      if (existing?.id) {
        const { error } = await supabase
          .from('child_school_calendar')
          .update(row)
          .eq('id', existing.id)
        if (error) throw error
        return { ok: true, id: existing.id }
      }

      const { data, error } = await supabase
        .from('child_school_calendar')
        .insert(row)
        .select('id')
        .single()

      if (error) throw error
      return { ok: true, id: data.id }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'upsert failed'
      console.error('[CalendarService.upsertEvent]', message)
      return { ok: false, error: message }
    }
  },

  async getUpcoming(
    childId: string,
    days = 30,
    client?: SupabaseClient,
  ): Promise<CalendarListItem[]> {
    try {
      const supabase = client ? getDb(client) : await getAuthDb()
      const future = new Date()
      future.setDate(future.getDate() + days)
      const todayStr = new Date().toISOString().slice(0, 10)
      const futureStr = future.toISOString().slice(0, 10)

      const { data } = await supabase
        .from('child_school_calendar')
        .select('id, title, date_start, requires_action, requires_items, source, child_id')
        .eq('child_id', childId)
        .gte('date_start', todayStr)
        .lte('date_start', futureStr)
        .order('date_start')
        .limit(100)

      return (data || []) as CalendarListItem[]
    } catch (e: unknown) {
      console.error('[CalendarService.getUpcoming]', e)
      return []
    }
  },
}
