import { useMemo } from 'react'
import { runTodoEngine } from '../_engine/todo'
import type { TodoItem } from '../_types'
import type { TodoEngineResult } from '../_engine/todo'

export function useTodoEngine(todos: TodoItem[]): TodoEngineResult {
  return useMemo(() => runTodoEngine(todos, new Date()), [todos])
}
