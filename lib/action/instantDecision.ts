import type { SupabaseClient } from '@supabase/supabase-js'
import { parseThbAmount } from '@/lib/realtime/exchangeRate'
import type { PlannerExchangeRate } from '@/lib/action/exchangeForPlanner'
import type { RootAction, RootDecision, PreparedItem } from '@/lib/action/rootBrain'

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

export function detectDimensionFromTitle(title: string): string {
  if (!title) return 'education'
  const t = title.toLowerCase()
  if (t.match(/航班|flight|行程|机场|中转|值机|mu\d|ca\d/)) return 'mobility'
  if (t.match(/学费|缴费|账单|payment|fee/)) return 'wealth'
  if (t.match(/签证|visa|移民|immigration|tm\d/)) return 'compliance'
  if (t.match(/生病|发烧|请假|sick|医院/)) return 'medical'
  if (t.match(/机场|送.*机场|接.*机场/)) return 'mobility'
  return 'education'
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
        return `约合人民币¥${cny}，PromptPay转账手续费0%，根在为你计算最优方案`
      }
      return 'PromptPay转账手续费0%，根在为你计算最优方案'
    }
    case 'compliance':
      return '根正在查询当地移民局信息...'
    case 'medical':
      return '根正在为你准备请假邮件，请稍等...'
    case 'education':
      return '根正在为你准备回复邮件，请稍等...'
    case 'mobility': {
      const days = daysLeft ?? getDaysLeftForTodo(todo.due_date as string | undefined)
      if (days != null && days <= 1) return '明天出发，今晚确认好所有准备'
      if (days != null && days > 1) return `还有${days}天出发，根在为你准备出行清单`
      return '根在为你准备出行清单'
    }
    default:
      return '根正在为你分析最优方案...'
  }
}

function buildInstantPrepared(
  dimension: string,
  child: InstantChild | null,
): PreparedItem[] {
  const prepared: PreparedItem[] = []

  if (dimension === 'education' || dimension === 'medical') {
    if (child?.teacherEmail) {
      prepared.push({
        type: 'draft',
        label: '邮件准备中...',
        content: '根正在生成邮件内容，请稍等',
        copyable: false,
        source: 'ai_generated',
        disclaimer: '深度分析完成后自动更新',
      })
    }
  }

  if (dimension === 'mobility') {
    prepared.push({
      type: 'checklist',
      label: '基础出行清单',
      content: '护照（所有人）\n手机充电宝\n行李确认\n出发前2小时到机场',
      copyable: false,
      source: 'knowledge_base',
      disclaimer: '',
    })
  }

  if (dimension === 'compliance') {
    prepared.push({
      type: 'info',
      label: '根在查询当地移民局',
      content: '正在获取最新材料清单...',
      copyable: false,
      source: 'ai_generated',
      disclaimer: '深度分析完成后显示准确信息',
    })
  }

  return prepared
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
  const dimension = String(todo.category || detectDimensionFromTitle(String(todo.title || '')))
  const daysLeft = getDaysLeftForTodo(todo.due_date as string | undefined)
  const understand = buildInstantUnderstand(todo, child, daysLeft)
  const insight = buildInstantInsight(todo, dimension, exchange, daysLeft)
  const actions = buildInstantActions(todo, dimension, child)
  const prepared = buildInstantPrepared(dimension, child)

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
    prepared,
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
