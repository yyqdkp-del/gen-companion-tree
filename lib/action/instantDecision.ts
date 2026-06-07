import type { SupabaseClient } from '@supabase/supabase-js'
import { parseThbAmount } from '@/lib/realtime/exchangeRate'
import type { PlannerExchangeRate } from '@/lib/action/exchangeForPlanner'
import type { RootAction, RootDecision } from '@/lib/action/rootBrain'

export type InstantChild = {
  id?: string
  name?: string
  nameEn?: string
  grade?: string | null
  teacherName?: string
  teacherEmail?: string
}

export function getDaysLeftForTodo(dueDate?: string | null): number | null {
  if (!dueDate) return null
  const due = new Date(`${String(dueDate).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function buildLeaveEmail(child: InstantChild): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return `Dear ${child.teacherName || 'Teacher'},

I am writing to inform you that ${child.nameEn || child.name} (${child.grade || ''}) will be absent from school today, ${today}, due to illness.

We will ensure he/she catches up on any missed work upon return.

Thank you for your understanding.

Best regards`
}

export function buildInstantUnderstand(
  todo: Record<string, unknown>,
  _child: InstantChild | null,
  daysLeft: number | null,
): string {
  const title = String(todo.title || '')
  if (daysLeft === 0) return `${title}，今天截止`
  if (daysLeft === 1) return `${title}，明天截止`
  if (daysLeft != null && daysLeft > 0 && daysLeft <= 30) return `${title}，还有${daysLeft}天`
  return title
}

export function buildInstantInsight(
  todo: Record<string, unknown>,
  dimension: string,
  exchange: PlannerExchangeRate | null,
  daysLeft: number | null,
): string {
  switch (dimension) {
    case 'wealth': {
      const aiExtra = (todo.ai_action_data || {}) as Record<string, unknown>
      const amountThb = (aiExtra.amount as number | undefined)
        ?? parseThbAmount(String(todo.title || ''))
      const cnyRate = exchange?.rates?.CNY
      if (cnyRate && amountThb) {
        const cny = Math.round(amountThb * cnyRate)
        return `约合人民币¥${cny}，PromptPay转账手续费0%`
      }
      return '建议用PromptPay转账，手续费最低'
    }
    case 'compliance': {
      const days = daysLeft ?? getDaysLeftForTodo(todo.due_date as string | undefined)
      if (days != null && days <= 7) return '⚠️ 非常紧急，需要尽快处理'
      if (days != null && days <= 14) return '建议本周内预约'
      return '建议提前准备材料'
    }
    case 'medical':
      return '请假邮件已准备好，确认后一键发送'
    case 'education':
      return '回复邮件已准备好，确认后一键发送'
    case 'mobility':
      return '出发前检查护照、行李和中转时间'
    default:
      return '根正在为你分析最优方案...'
  }
}

export function buildInstantActions(
  todo: Record<string, unknown>,
  dimension: string,
  child: InstantChild | null,
): RootAction[] {
  const actions: RootAction[] = []
  const todoId = String(todo.id || '')

  switch (dimension) {
    case 'wealth':
      actions.push({
        id: 'pay',
        label: '打开KPlus付款',
        type: 'primary',
        executor: {
          service: 'url',
          method: 'open',
          params: { url: 'kplus://', fallback: 'https://www.kasikornbank.com' },
        },
        requiresConfirm: false,
      })
      break

    case 'medical':
    case 'education':
      if (child?.teacherEmail) {
        actions.push({
          id: 'email',
          label: dimension === 'medical' ? '发请假邮件给老师' : '发邮件给老师',
          type: 'primary',
          executor: {
            service: 'gmail',
            method: 'create_draft',
            params: {
              to: child.teacherEmail,
              subject: `Absence Notice - ${child.nameEn || child.name || 'Student'}`,
              body: buildLeaveEmail(child),
            },
          },
          requiresConfirm: true,
          confirmMessage: `确认发送给 ${child.teacherName || '老师'}？`,
        })
      }
      break

    case 'compliance':
      actions.push({
        id: 'navigate',
        label: '导航到移民局',
        type: 'primary',
        executor: {
          service: 'url',
          method: 'open',
          params: { url: 'https://maps.google.com/?q=immigration+office+near+me' },
        },
        requiresConfirm: false,
      })
      break

    case 'mobility':
      actions.push({
        id: 'grab',
        label: '叫Grab到机场',
        type: 'primary',
        executor: {
          service: 'grab',
          method: 'open',
          params: { destination: 'airport' },
        },
        requiresConfirm: false,
      })
      break

    default:
      break
  }

  if (todoId) {
    actions.push({
      id: 'complete',
      label: '标记完成',
      type: 'secondary',
      executor: {
        service: 'internal',
        method: 'complete_todo',
        params: { todoId },
      },
      requiresConfirm: false,
    })
  }

  return actions
}

export function buildInstantResponse(
  todo: Record<string, unknown>,
  child: InstantChild | null,
  exchange: PlannerExchangeRate | null,
): RootDecision {
  const dimension = String(todo.category || 'education')
  const daysLeft = getDaysLeftForTodo(todo.due_date as string | undefined)
  const understand = buildInstantUnderstand(todo, child, daysLeft)
  const insight = buildInstantInsight(todo, dimension, exchange, daysLeft)
  const actions = buildInstantActions(todo, dimension, child)

  return {
    understanding: {
      situation: understand,
      urgency: daysLeft != null && daysLeft <= 1
        ? 'critical'
        : daysLeft != null && daysLeft <= 3
          ? 'urgent'
          : daysLeft != null && daysLeft <= 7
            ? 'normal'
            : 'low',
      emotion: '',
      keyFacts: [],
    },
    actions,
    prepared: [],
    message: {
      headline: String(todo.title || '待办'),
      detail: understand,
      reassurance: insight,
    },
    completion: {
      message: '已完成',
      nextStep: '',
    },
    isPartial: true,
  }
}

export async function loadInstantChild(
  supabase: SupabaseClient,
  childId: string | null | undefined,
  familyChild: InstantChild | null,
): Promise<InstantChild | null> {
  if (!familyChild && !childId) return null

  const base: InstantChild = {
    id: familyChild?.id || childId || undefined,
    name: familyChild?.name,
    nameEn: familyChild?.name,
    grade: familyChild?.grade,
  }

  if (!childId) return base

  const { data: profile } = await supabase
    .from('child_profiles')
    .select('teacher_name, teacher_email, name_en')
    .eq('child_id', childId)
    .maybeSingle()

  return {
    ...base,
    teacherName: String(profile?.teacher_name || ''),
    teacherEmail: String(profile?.teacher_email || ''),
    nameEn: String(profile?.name_en || familyChild?.name || ''),
  }
}

export function isFullRootDecision(decision: RootDecision | undefined): boolean {
  if (!decision) return false
  return !(decision as RootDecision & { isPartial?: boolean }).isPartial
}
