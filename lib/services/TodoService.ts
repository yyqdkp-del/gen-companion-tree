import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthDb, getDb } from '@/lib/services/_db'

export type TodoDimension =
  | 'compliance'
  | 'medical'
  | 'wealth'
  | 'education'
  | 'mobility'
  | 'logistics'
  | 'estate'
  | 'social'
  | 'selfcare'

export type TodoPriority = 'red' | 'orange' | 'yellow' | 'green'

export type TodoSource =
  | 'gmail'
  | 'rian'
  | 'root_vision'
  | 'auto_execute'
  | 'patrol'
  | 'manual'
  | 'school_auto'

export interface CreateTodoInput {
  userId: string
  childId?: string
  title: string
  dimension: TodoDimension
  priority: TodoPriority
  dueDate?: string
  amount?: number
  currency?: string
  source: TodoSource
  notes?: string
  description?: string
  repeat?: string
  sourceRefId?: string
  aiDraft?: string
  aiActionType?: string
  aiActionData?: Record<string, unknown>
  oneTapReady?: boolean
  client?: SupabaseClient
}

export interface TodoResult {
  ok: boolean
  id?: string
  error?: string
}

export interface TodoListItem {
  id: string
  title: string
  dimension: string | null
  priority: string | null
  due_date: string | null
  amount: number | null
  currency: string | null
  status: string
  source: string | null
  child_id: string | null
}

function buildDescription(input: CreateTodoInput): string | null {
  if (input.description) return input.description
  if (input.notes) return input.notes
  if (input.amount) {
    return `${input.amount} ${input.currency || ''}`.trim()
  }
  return null
}

export const TodoService = {
  async create(input: CreateTodoInput): Promise<TodoResult> {
    try {
      const supabase = getDb(input.client)

      if (input.dueDate && input.title) {
        const { data: existing } = await supabase
          .from('todo_items')
          .select('id')
          .eq('user_id', input.userId)
          .eq('title', input.title)
          .eq('due_date', input.dueDate)
          .maybeSingle()

        if (existing) return { ok: true, id: existing.id }
      }

      const row: Record<string, unknown> = {
        user_id: input.userId,
        child_id: input.childId || null,
        title: input.title,
        category: input.dimension,
        priority: input.priority,
        due_date: input.dueDate || null,
        description: buildDescription(input),
        source: input.source,
        status: 'pending',
      }

      if (input.repeat) row.repeat = input.repeat
      if (input.sourceRefId) row.source_ref_id = input.sourceRefId
      if (input.aiDraft) row.ai_draft = input.aiDraft
      if (input.aiActionType) row.ai_action_type = input.aiActionType
      if (input.aiActionData) row.ai_action_data = input.aiActionData
      if (input.oneTapReady != null) row.one_tap_ready = input.oneTapReady

      const { data, error } = await supabase
        .from('todo_items')
        .insert(row)
        .select('id')
        .single()

      if (error) throw error
      return { ok: true, id: data.id }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'create failed'
      console.error('[TodoService.create]', message)
      return { ok: false, error: message }
    }
  },

  async complete(id: string, client?: SupabaseClient): Promise<TodoResult> {
    try {
      const supabase = getDb(client)
      const { error } = await supabase
        .from('todo_items')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { ok: true, id }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'complete failed'
      console.error('[TodoService.complete]', message)
      return { ok: false, error: message }
    }
  },

  async getActive(userId: string, limit = 50, client?: SupabaseClient): Promise<TodoListItem[]> {
    try {
      const supabase = client ? getDb(client) : await getAuthDb()
      const { data } = await supabase
        .from('todo_items')
        .select('id, title, category, priority, due_date, status, source, child_id')
        .eq('user_id', userId)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(limit)

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        dimension: row.category,
        priority: row.priority,
        due_date: row.due_date,
        amount: null,
        currency: null,
        status: row.status,
        source: row.source,
        child_id: row.child_id,
      }))
    } catch (e: unknown) {
      console.error('[TodoService.getActive]', e)
      return []
    }
  },
}
