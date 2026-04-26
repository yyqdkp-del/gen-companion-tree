'use client'
import ActionModal from '@/app/components/ActionModal'

export type ChildEvent = {
  id: string; child_id: string; event_type?: string; title: string
  date_start: string; description?: string; requires_action?: string
  requires_items?: string[]; requires_payment?: number; source?: string
  ai_action_data?: any
}
type Props = {
  event: ChildEvent | null; childName: string
  userId: string; onClose: () => void; onDone?: () => void
}

export default function ChildActionSheet({ event, childName, userId, onClose, onDone }: Props) {
  if (!event) return null
  return (
    <ActionModal
      source_type="schedule"
      source_id={event.id}
      title={event.title}
      category={event.event_type}
      urgency_level={event.requires_payment ? 2 : 1}
      event_data={event}
      child_name={childName}
      userId={userId}
      onClose={onClose}
      onDone={() => { onDone?.(); onClose() }}
      onSnooze={onClose}
    />
  )
}
