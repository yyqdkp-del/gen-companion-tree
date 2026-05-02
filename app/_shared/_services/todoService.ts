import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function markTodoDone(id: string, category?: string): Promise<void> {
  const { error } = await supabase
    .from('todo_items')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error

  await supabase.from('user_habits').insert({
    action_type: 'mark_done',
    target_category: category,
    target_id: id,
  })
}

export async function snoozeTodo(id: string, category?: string): Promise<void> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { error } = await supabase
    .from('todo_items')
    .update({ due_date: tomorrow.toISOString().split('T')[0] })
    .eq('id', id)
  if (error) throw error

  await supabase.from('user_habits').insert({
    action_type: 'snooze',
    target_category: category,
    target_id: id,
  })
}

export async function convertHotspotToTodo(
  hotspotId: string,
  userId: string,
): Promise<void> {
  const res = await fetch('/api/action/perform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_type: 'convert_to_todo',
      hotspot_id: hotspotId,
      user_id: userId,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
