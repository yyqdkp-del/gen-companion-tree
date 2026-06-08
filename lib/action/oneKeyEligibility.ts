export function shouldShowOneKey(todo: {
  source?: string | null
  title?: string | null
  due_date?: string | null
  priority?: string | null
  requires_action?: boolean | null
  child_id?: string | null
  amount_thb?: number | null
}): boolean {
  if (todo.source === 'hotspot') return false

  if (!todo.title) return false
  if (todo.title.startsWith('📅')) return false
  if (todo.title.startsWith('跟进：【')) return false

  const hasDeadline = !!todo.due_date
  const isUrgent = ['red', 'orange'].includes(String(todo.priority || ''))
  const requiresAction = todo.requires_action === true
  const hasChild = !!todo.child_id
  const hasAmount = !!todo.amount_thb

  return hasDeadline || isUrgent || requiresAction || hasChild || hasAmount
}

export function shouldShowTodoFullOneKey(params: {
  due_date?: string
  urgency_level?: 1 | 2 | 3
  category?: string
  ai_action_data?: Record<string, unknown> | null
  source?: string | null
  title?: string | null
  priority?: string | null
  requires_action?: boolean | null
  child_id?: string | null
  amount_thb?: number | null
}): boolean {
  const priority = params.priority
    || (params.urgency_level === 3 ? 'red' : params.urgency_level === 2 ? 'orange' : undefined)
  const amountThb = params.amount_thb
    ?? (params.ai_action_data?.amount != null ? Number(params.ai_action_data.amount) : null)

  return shouldShowOneKey({
    source: params.source,
    title: params.title,
    due_date: params.due_date,
    priority,
    requires_action: params.requires_action ?? params.ai_action_data?.requires_action === true,
    child_id: params.child_id,
    amount_thb: amountThb,
  })
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
