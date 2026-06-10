import { createClient } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'
import type { TodoRepeat } from '@/app/_shared/_types'

const supabase = createClient()

const REPEAT_VALUES: readonly TodoRepeat[] = ['daily', 'weekly', 'monthly', 'weekdays']

function isTodoRepeat(v: string | null | undefined): v is TodoRepeat {
  return !!v && (REPEAT_VALUES as readonly string[]).includes(v)
}

/** 下一周期截止日期：有 due_date 从该日历日算，否则从「今天」算 */
function getNextDueDate(currentDue: string | null, repeat: TodoRepeat): string {
  const base = currentDue
    ? new Date(currentDue.includes('T') ? currentDue : `${currentDue}T12:00:00`)
    : new Date()

  switch (repeat) {
    case 'daily':
      return addDaysStr(base, 1)
    case 'weekdays': {
      let next = new Date(base)
      do {
        next.setDate(next.getDate() + 1)
      } while (next.getDay() === 0 || next.getDay() === 6)
      return getTodayStr(next)
    }
    case 'weekly':
      return addDaysStr(base, 7)
    case 'monthly': {
      const d = new Date(base)
      d.setMonth(d.getMonth() + 1)
      return getTodayStr(d)
    }
    default:
      return addDaysStr(new Date(), 1)
  }
}

export async function markTodoDone(id: string, category?: string): Promise<void> {
  const { data: todo, error: fetchErr } = await supabase
    .from('todo_items')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  const { error: updErr } = await supabase
    .from('todo_items')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id)
  if (updErr) throw updErr

  if (todo && isTodoRepeat(todo.repeat)) {
    const nextDue = getNextDueDate(todo.due_date ?? null, todo.repeat)
    const { error: insErr } = await supabase.from('todo_items').insert({
      user_id: todo.user_id,
      title: todo.title,
      description: todo.description ?? null,
      category: todo.category ?? null,
      priority: todo.priority,
      status: 'pending',
      repeat: todo.repeat,
      due_date: nextDue,
      source: todo.source ?? null,
      source_ref_id: todo.source_ref_id ?? null,
      ai_draft: todo.ai_draft ?? null,
      one_tap_ready: todo.one_tap_ready ?? false,
      ai_action_type: todo.ai_action_type ?? null,
      ai_action_data: todo.ai_action_data ?? null,
    })
    if (insErr) throw insErr
  }

  await supabase.from('user_habits').insert({
    action_type: 'mark_done',
    target_category: category,
    target_id: id,
  })
}

export async function snoozeTodo(id: string, category?: string): Promise<void> {
  const { data: todo, error: fetchErr } = await supabase
    .from('todo_items')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  const nextDue = todo && isTodoRepeat(todo.repeat)
    ? getNextDueDate(todo.due_date ?? null, todo.repeat)
    : addDaysStr(new Date(), 1)

  const { error } = await supabase
    .from('todo_items')
    .update({ due_date: nextDue })
    .eq('id', id)
  if (error) throw error

  await supabase.from('user_habits').insert({
    action_type: 'snooze',
    target_category: category,
    target_id: id,
  })
}

export async function convertHotspotToTodo(hotspotId: string): Promise<void> {
  const result = await convertHotspotToTodoAndMarkRead(hotspotId, () => {})
  if (!result) throw new Error('convert failed')
}

/** 热点转待办后标记已读并触发同步（供 UI 层单一调用，避免与引擎列表逻辑耦合） */
export async function convertHotspotToTodoAndMarkRead(
  hotspotId: string,
  onRead: (id: string) => void,
  onSync?: () => void,
): Promise<{ todo_id: string; already_exists: boolean } | null> {
  try {
    const res = await fetchWithAuth('/api/action/perform', {
      method: 'POST',
      body: JSON.stringify({
        action_type: 'convert_to_todo',
        hotspot_id: hotspotId,
      }),
    })

    const data = await res.json()
    if (!data.ok) return null

    onRead(hotspotId)
    onSync?.()

    return {
      todo_id: data.todo_id,
      already_exists: Boolean(data.already_exists),
    }
  } catch {
    return null
  }
}
