export function shouldShowTodoFullOneKey(params: {
  due_date?: string
  urgency_level?: 1 | 2 | 3
  category?: string
  ai_action_data?: Record<string, unknown> | null
}): boolean {
  const data = params.ai_action_data || {}
  const priority = String(data.priority || '')
  if (priority === 'red' || priority === 'orange') return true
  if ((params.urgency_level ?? 0) >= 2) return true
  if (params.due_date) return true

  const brain = (data.brain_instruction || {}) as Record<string, unknown>
  const amount = data.amount ?? brain.amount
  if (amount != null && amount !== '') return true

  if (data.requires_action === true) return true

  const lifestyle = ['lifestyle', 'social', 'selfcare']
  if (lifestyle.includes(String(params.category || '')) && !params.due_date) return false

  return false
}

export function shouldShowHotspotOneKey(hotspot: {
  action_available?: boolean
  source?: string
  linked_todo_id?: string | null
  category?: string
  action_data?: Record<string, unknown> | null
}): boolean {
  if (hotspot.action_available) return true
  if (hotspot.source === 'brain') return true
  if (hotspot.action_data?.source === 'brain') return true
  if (hotspot.linked_todo_id) return true

  const lifestyleCategories = ['lifestyle', 'mom', 'weather']
  if (lifestyleCategories.includes(String(hotspot.category || ''))) return false

  return false
}
