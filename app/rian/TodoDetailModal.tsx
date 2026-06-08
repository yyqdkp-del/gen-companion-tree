'use client'
import ActionModal from '@/app/components/ActionModal'

type Reminder = {
  id: string; title: string; description?: string; category?: string
  urgency_level: number; due_date?: string; status: string; ai_action_data?: any
  source?: string | null
  priority?: string | null
  child_id?: string | null
  requires_action?: boolean | null
  amount_thb?: number | null
  source_url?: string | null
}
type Props = {
  reminder: Reminder | null; userId: string
  onClose: () => void; onDone: (id: string) => void
  onSnooze: (id: string) => void; onSync?: () => void
}

export default function TodoDetailModal({ reminder, userId, onClose, onDone, onSnooze, onSync }: Props) {
  if (!reminder) return null
  return (
    <ActionModal
      source_type="todo"
      source_id={reminder.id}
      title={reminder.title}
      category={reminder.category}
      urgency_level={reminder.urgency_level as 1 | 2 | 3}
      due_date={reminder.due_date}
      ai_action_data={reminder.ai_action_data}
      todo_source={reminder.source}
      todo_priority={reminder.priority}
      todo_child_id={reminder.child_id}
      todo_requires_action={reminder.requires_action}
      todo_amount_thb={reminder.amount_thb}
      todo_source_url={reminder.source_url}
      userId={userId}
      onClose={onClose}
      onDone={onDone}
      onSnooze={onSnooze}
      onSync={onSync}
    />
  )
}
