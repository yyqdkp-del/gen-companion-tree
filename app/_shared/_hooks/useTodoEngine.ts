'use client'

import { useMemo } from 'react'
import { runTodoEngine } from '../_engine/todo'
import type { TodoItem } from '../_types'
import type { TodoEngineResult } from '../_engine/todo'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'

export function useTodoEngine(todos: TodoItem[]): TodoEngineResult {
  const calendarDay = useLocalTodayStr()
  return useMemo(() => runTodoEngine(todos, new Date()), [todos, calendarDay])
}
