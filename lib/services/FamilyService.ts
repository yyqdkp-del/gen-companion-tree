import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthDb, getDb } from '@/lib/services/_db'
import type { TodoListItem } from '@/lib/services/TodoService'
import type { CalendarListItem } from '@/lib/services/CalendarService'

export interface FamilyDataOptions {
  childId?: string
  includeTodos?: boolean
  includeCalendar?: boolean
  daysAhead?: number
  client?: SupabaseClient
}

export interface FamilyChildRow {
  id: string
  name: string
  grade: string | null
  school_name: string | null
  school: string | null
  emoji: string | null
  birthdate: string | null
  birth_date?: string | null
  status: string | null
}

export interface FamilyData {
  children: FamilyChildRow[]
  activeChild: FamilyChildRow | null
  todos: TodoListItem[]
  calendar: CalendarListItem[]
  profile: Record<string, unknown> | null
  flights: CalendarListItem[]
}

export type FamilyExecutionContext = Record<string, unknown>

export const FamilyService = {
  async getData(userId: string, options: FamilyDataOptions = {}): Promise<FamilyData> {
    try {
      const supabase = getDb(options.client)
      const daysAhead = options.daysAhead || 30
      const future = new Date()
      future.setDate(future.getDate() + daysAhead)
      const futureStr = future.toISOString().slice(0, 10)
      const todayStr = new Date().toISOString().slice(0, 10)

      const [childrenRes, todosRes, calendarRes, profileRes] = await Promise.all([
        supabase
          .from('children')
          .select('id, name, grade, school_name, school, emoji, birthdate, birth_date, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('name'),

        options.includeTodos !== false
          ? supabase
            .from('todo_items')
            .select('id, title, category, priority, due_date, status, source, child_id')
            .eq('user_id', userId)
            .neq('status', 'done')
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(50)
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),

        options.includeCalendar !== false
          ? supabase
            .from('child_school_calendar')
            .select('id, title, date_start, requires_action, requires_items, source, child_id')
            .eq('user_id', userId)
            .gte('date_start', todayStr)
            .lte('date_start', futureStr)
            .order('date_start')
            .limit(100)
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),

        supabase
          .from('family_profile')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ])

      const children = (childrenRes.data || []) as FamilyChildRow[]
      const calendar = (calendarRes.data || []) as CalendarListItem[]

      const activeChild = options.childId
        ? children.find((c) => c.id === options.childId) || children[0] || null
        : children[0] || null

      const flights = calendar.filter((e) =>
        e.title?.includes('航班')
        || e.title?.includes('flight')
        || e.title?.includes('MU')
        || e.source === 'flight',
      )

      const todos: TodoListItem[] = (todosRes.data || []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        title: String(row.title),
        dimension: (row.category as string) || null,
        priority: (row.priority as string) || null,
        due_date: (row.due_date as string) || null,
        amount: null,
        currency: null,
        status: String(row.status),
        source: (row.source as string) || null,
        child_id: (row.child_id as string) || null,
      }))

      return {
        children,
        activeChild,
        todos,
        calendar,
        profile: (profileRes.data as Record<string, unknown>) || null,
        flights,
      }
    } catch (e: unknown) {
      console.error('[FamilyService.getData]', e)
      return {
        children: [],
        activeChild: null,
        todos: [],
        calendar: [],
        profile: null,
        flights: [],
      }
    }
  },

  /** 一键办 / smart-action 用的按需档案片段（替代散落 getFamilyData） */
  async getFields(
    userId: string,
    needed: string[],
    client?: SupabaseClient,
  ): Promise<FamilyExecutionContext> {
    try {
      const supabase = getDb(client)
      const result: FamilyExecutionContext = {}

      await Promise.all(needed.map(async (field) => {
        switch (field) {
          case 'passport':
          case 'visa':
          case 'medical':
          case 'address':
          case 'insurance': {
            const { data } = await supabase.from('family_profile').select('*').eq('user_id', userId)
            result.profile = data || []
            break
          }
          case 'children': {
            const { data } = await supabase.from('children').select('*').eq('user_id', userId)
            result.children = data || []
            break
          }
          case 'places': {
            const { data } = await supabase.from('family_places').select('*').eq('user_id', userId)
            result.places = data || []
            break
          }
          case 'habits': {
            const { data } = await supabase.from('family_habits').select('*').eq('user_id', userId)
            result.habits = data || []
            break
          }
          case 'finance': {
            const { data } = await supabase.from('family_documents').select('*').eq('user_id', userId)
            result.documents = data || []
            break
          }
          case 'health': {
            const { data } = await supabase
              .from('child_health_records')
              .select('*')
              .eq('user_id', userId)
              .order('date', { ascending: false })
              .limit(5)
            result.childHealth = data || []
            break
          }
          case 'vehicles': {
            const { data } = await supabase.from('vehicles').select('*').eq('user_id', userId)
            result.vehicles = data || []
            break
          }
          default:
            break
        }
      }))

      return result
    } catch (e: unknown) {
      console.error('[FamilyService.getFields]', e)
      return {}
    }
  },

  async getChild(childId: string, client?: SupabaseClient): Promise<Record<string, unknown> | null> {
    try {
      const supabase = client ? getDb(client) : await getAuthDb()
      const { data } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .maybeSingle()
      return (data as Record<string, unknown>) || null
    } catch (e: unknown) {
      console.error('[FamilyService.getChild]', e)
      return null
    }
  },
}
