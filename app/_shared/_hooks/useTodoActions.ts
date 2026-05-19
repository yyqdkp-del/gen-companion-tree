import { useCallback } from 'react'
import { markTodoDone, snoozeTodo } from '../_services/todoService'
import type { Reminder } from '../_types'

export function useTodoActions(reminders: Reminder[], onSync: () => void) {
  const markDone = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    try {
      await markTodoDone(id, category)
      onSync()
    } catch {
      alert('操作失败，请重试')
    }
  }, [reminders, onSync])

  const snooze = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    try {
      await snoozeTodo(id, category)
      onSync()
    } catch {
      alert('操作失败，请重试')
    }
  }, [reminders, onSync])

  return { markDone, snooze }
}
