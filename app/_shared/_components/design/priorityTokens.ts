import type { Priority } from '@/app/_shared/_types'

export type PriKind = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'grey'

export const PRIORITY_KINDS: PriKind[] = ['red', 'orange', 'yellow', 'green', 'blue', 'grey']

export function priorityToKind(priority?: Priority | string): PriKind {
  if (priority === 'red' || priority === 'orange' || priority === 'yellow') return priority
  if (priority === 'green') return 'green'
  if (priority === 'blue') return 'blue'
  return 'grey'
}

export const PRI_LABEL: Record<PriKind, string> = {
  red: '今天必须',
  orange: '3天内',
  yellow: '本周',
  green: '本月',
  blue: '长期',
  grey: '等待中',
}

export function priCssVars(kind: PriKind) {
  return {
    background: `var(--pri-${kind}-bg)`,
    border: `1px solid var(--pri-${kind}-border)`,
    color: `var(--pri-${kind}-text)`,
    dot: `var(--pri-${kind}-dot)`,
  }
}
