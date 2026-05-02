import { useCallback } from 'react'
import { markTodoDone, snoozeTodo } from '../_services/todoService'
import type { Reminder } from '../_types'

export function useTodoActions(reminders: Reminder[], onSync: () => void) {
  const markDone = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    await markTodoDone(id, category)
    onSync()
  }, [reminders, onSync])

  const snooze = useCallback(async (id: string) => {
    const category = reminders.find(r => r.id === id)?.category
    await snoozeTodo(id, category)
    onSync()
  }, [reminders, onSync])

  return { markDone, snooze }
}
