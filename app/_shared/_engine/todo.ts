// ─────────────────────────────────────────
// 待办引擎
// 妈妈的全能智能处理引擎
// 纯函数，零副作用，零UI
// 日期分组使用本地日历日（见 lib/date/localDate）
// ─────────────────────────────────────────

import type { TodoItem } from '../_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'

export type TodoGroup = {
  today: TodoItem[]    // 今天必须办
  soon:  TodoItem[]    // 近期跟进（3天内）
  later: TodoItem[]    // 放心里（3 天以后，无月末上限）
}

export type TodoEngineResult = {
  groups: TodoGroup
  badge:  number       // 水珠数字：今日数量
  state:  'red' | 'orange' | 'yellow' | 'calm'  // 水珠颜色
  advice: string       // 给妈妈的一句话
  totalPending: number // 全部未完成数量
}

// ── 분그룹 분류 ────────────────────────────
export function groupTodos(todos: TodoItem[], now: Date = new Date()): TodoGroup {
  const today    = getTodayStr(now)
  const in3days  = addDaysStr(now, 3)

  const pending = todos.filter(t =>
    t.status !== 'done' && t.status !== 'dismissed' && !t._isTemp
  )

  const today_items = pending.filter(t =>
    !t.due_date || t.due_date === today || t.priority === 'red'
  ).sort((a, b) => {
    const o: Record<string, number> = { red: 0, orange: 1, yellow: 2, green: 3, blue: 4, grey: 5 }
    return (o[a.priority] ?? 5) - (o[b.priority] ?? 5)
  })

  const soon_items = pending.filter(t =>
    t.due_date && t.due_date > today && t.due_date <= in3days
  ).sort((a, b) => a.due_date!.localeCompare(b.due_date!))

  const later_items = pending.filter(t =>
    t.due_date && t.due_date > in3days
  ).sort((a, b) => a.due_date!.localeCompare(b.due_date!))

  return { today: today_items, soon: soon_items, later: later_items }
}

// ── 水珠状态 ──────────────────────────────
export function getTodoState(
  groups: TodoGroup
): 'red' | 'orange' | 'yellow' | 'calm' {
  if (groups.today.some(t => t.priority === 'red'))    return 'red'
  if (groups.today.some(t => t.priority === 'orange')) return 'orange'
  if (groups.today.length > 0)                         return 'yellow'
  if (groups.soon.length > 0)                          return 'yellow'
  return 'calm'
}

// ── 给妈妈的建议 ──────────────────────────
export function getTodoAdvice(groups: TodoGroup): string {
  const todayCount = groups.today.length
  const soonCount  = groups.soon.length

  if (todayCount === 0 && soonCount === 0) {
    return '今天没有紧急事项，好好休息 🌸'
  }

  const urgent = groups.today.filter(t => t.priority === 'red')
  if (urgent.length > 0) {
    return `今天有 ${urgent.length} 件必须处理，其余可以稍后再看`
  }

  if (todayCount > 0 && soonCount > 0) {
    return `今天 ${todayCount} 件，3天内还有 ${soonCount} 件需要跟进`
  }

  if (todayCount > 0) {
    return `今天有 ${todayCount} 件待办，一件一件来`
  }

  return `近期有 ${soonCount} 件需要跟进，今天可以先看看`
}

// ── 主函数 ────────────────────────────────
export function runTodoEngine(
  todos: TodoItem[],
  now: Date = new Date()
): TodoEngineResult {
  const groups       = groupTodos(todos, now)
  const state        = getTodoState(groups)
  const advice       = getTodoAdvice(groups)
  const badge        = groups.today.length
  const totalPending = todos.filter(t =>
    t.status !== 'done' && t.status !== 'dismissed' && !t._isTemp
  ).length

  return { groups, badge, state, advice, totalPending }
}
