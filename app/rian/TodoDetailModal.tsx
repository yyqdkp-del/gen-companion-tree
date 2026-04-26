'use client'
import ActionModal from '@/app/components/ActionModal'

type Reminder = {
  id: string; title: string; description?: string; category?: string
  urgency_level: number; due_date?: string; status: string; ai_action_data?: any
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
      userId={userId}
      onClose={onClose}
      onDone={onDone}
      onSnooze={onSnooze}
      onSync={onSync}
    />
  )
}
