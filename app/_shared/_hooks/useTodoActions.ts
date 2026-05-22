import { useCallback } from 'react'
import { toast } from '@/app/components/Toast'
import { markTodoDone, snoozeTodo } from '../_services/todoService'
import type { Reminder } from '../_types'

type TodoOptimistic = {
  remove?: (id: string) => void
  restore?: (id: string) => void
}

export function useTodoActions(
  reminders: Reminder[],
  onSync: () => void,
  optimistic?: TodoOptimistic,
) {
  const markDone = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    optimistic?.remove?.(id)
    try {
      await markTodoDone(id, category)
      onSync()
    } catch {
      optimistic?.restore?.(id)
      toast('操作失败，请重试', 'error')
    }
  }, [reminders, onSync, optimistic])

  const snooze = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    try {
      await snoozeTodo(id, category)
      onSync()
    } catch {
      toast('操作失败，请重试', 'error')
    }
  }, [reminders, onSync])

  return { markDone, snooze }
}
