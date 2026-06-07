import type { SupabaseClient } from '@supabase/supabase-js'
import { createAutoCapabilities } from '@/lib/action/autoCapabilities'
import { getExchangeRate } from '@/lib/action/exchangeForPlanner'
import { parseThbAmount } from '@/lib/realtime/exchangeRate'

export interface UserAction {
  label: string
  action: string
  value: string
  timing: 'now' | 'today' | 'tomorrow' | 'scheduled'
  reason: string
}

export interface PlanExecuteResult {
  autoCompleted: string[]
  userActions: UserAction[]
  nextStep: string
  draft?: string
}

type PlannerTodo = Record<string, unknown> & {
  title: string
  due_date?: string | null
  child_id?: string | null
  category?: string | null
  ai_action_data?: Record<string, unknown> | null
}

function resolveChildFromTodo(todo: PlannerTodo, familyData: Record<string, unknown>) {
  if (todo.child_id) return { childId: String(todo.child_id), childName: String(todo.child_name || '孩子') }

  const children = (familyData.children || []) as Array<{ id: string; name?: string }>
  const brain = (todo.ai_action_data?.brain_instruction || {}) as Record<string, unknown>
  const who = String(brain.who || '')
  const matched = children.find((c) => c.name && who.includes(c.name))
  if (matched) return { childId: matched.id, childName: matched.name || '孩子' }

  if (children.length === 1) {
    return { childId: children[0].id, childName: children[0].name || '孩子' }
  }
  return { childId: undefined, childName: who || '孩子' }
}

function enrichTodo(todo: PlannerTodo, familyData: Record<string, unknown>): PlannerTodo {
  const brain = (todo.ai_action_data?.brain_instruction || {}) as Record<string, unknown>
  const extra = (todo.ai_action_data || {}) as Record<string, unknown>
  const { childId, childName } = resolveChildFromTodo(todo, familyData)

  const medications = extra.medications as unknown[] | undefined
    ?? (extra.medical as Record<string, unknown> | undefined)?.medications as unknown[] | undefined

  return {
    ...todo,
    dimension: String(todo.dimension || brain.dimension || todo.category || 'estate'),
    child_id: childId || todo.child_id,
    child_name: childName,
    follow_up_date: extra.follow_up_date || brain.follow_up_date,
    medications: Array.isArray(medications) ? medications : [],
    prescription: extra.prescription || brain.prescription,
    hospital: extra.hospital || brain.hospital,
    amount: extra.amount ?? parseThbAmount(todo.title),
    currency: extra.currency || 'THB',
    payment_url: extra.payment_url || brain.payment_url,
    depart_date: extra.depart_date || brain.depart_date || todo.due_date,
  }
}

function findImmigrationOffice(familyData: Record<string, unknown>): string {
  const places = (familyData.places || []) as Array<{ name?: string; label?: string; maps_url?: string; url?: string }>
  const hit = places.find((p) =>
    /移民|immigration|visa/i.test(`${p.name || ''} ${p.label || ''}`),
  )
  if (hit?.maps_url || hit?.url) return hit.maps_url || hit.url || ''
  if (hit?.name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hit.name)}`
  }
  return 'https://maps.google.com/?q=immigration+office'
}

function findHospitalMaps(todo: PlannerTodo): string {
  const hospital = String(todo.hospital || '医院')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital)}`
}

export async function planAndExecute(
  supabase: SupabaseClient,
  todo: PlannerTodo,
  familyData: Record<string, unknown>,
  userId: string,
): Promise<PlanExecuteResult> {
  const AUTO_CAPABILITIES = createAutoCapabilities(supabase)
  const enriched = enrichTodo(todo, familyData)
  const dimension = String(enriched.dimension || 'estate')

  const autoCompleted: string[] = []
  const userActions: UserAction[] = []
  let draft: string | undefined

  switch (dimension) {
    case 'compliance': {
      if (enriched.due_date) {
        const reminders = await AUTO_CAPABILITIES.setMultiReminders({
          title: enriched.title,
          targetDate: String(enriched.due_date),
          daysBefore: [30, 14, 7, 3, 1],
          userId,
        })
        autoCompleted.push(...reminders)
      }

      const script = await AUTO_CAPABILITIES.generateDraft({
        type: 'call_script',
        context: { todo: enriched, type: 'visa' },
        userId,
      })
      if (script) {
        autoCompleted.push('已生成办理话术')
        draft = script.text
      }

      userActions.push({
        label: '前往移民局',
        action: 'navigate',
        value: findImmigrationOffice(familyData),
        timing: 'scheduled',
        reason: '需要本人到场办理',
      })
      break
    }

    case 'medical': {
      if (enriched.child_id) {
        if (enriched.follow_up_date) {
          await AUTO_CAPABILITIES.addCalendarEvent({
            title: `复诊：${enriched.title}`,
            date: String(enriched.follow_up_date),
            userId,
            childId: String(enriched.child_id),
            notes: enriched.prescription ? String(enriched.prescription) : undefined,
          })
          autoCompleted.push('已写入复诊日历')
        }

        const meds = enriched.medications as Array<{ name?: string }>
        if (meds.length > 0) {
          for (const med of meds) {
            await AUTO_CAPABILITIES.setReminder({
              title: `给${enriched.child_name}服药：${med.name || '药物'}`,
              dueDate: new Date().toISOString().slice(0, 10),
              userId,
              childId: String(enriched.child_id),
            })
          }
          autoCompleted.push(`已设置${meds.length}个用药提醒`)
        }
      }

      userActions.push({
        label: '导航到医院',
        action: 'navigate',
        value: findHospitalMaps(enriched),
        timing: 'now',
        reason: '需要带孩子就诊',
      })
      break
    }

    case 'wealth': {
      const exchange = await getExchangeRate()
      if (exchange && enriched.amount) {
        const converted = await AUTO_CAPABILITIES.calculateExchange({
          amount: Number(enriched.amount),
          fromCurrency: String(enriched.currency || 'THB'),
          toCurrency: 'CNY',
        })
        if (converted) {
          autoCompleted.push(`已换算：${converted.original} = ${converted.converted}`)
          if (converted.tip) autoCompleted.push(converted.tip)
        }
      }

      if (enriched.due_date) {
        await AUTO_CAPABILITIES.setReminder({
          title: `付款截止：${enriched.title}`,
          dueDate: String(enriched.due_date),
          userId,
        })
        autoCompleted.push('已设置付款截止提醒')
      }

      userActions.push({
        label: '立即付款',
        action: 'open_url',
        value: String(enriched.payment_url || 'https://wise.com'),
        timing: 'now',
        reason: '需要本人确认付款',
      })
      break
    }

    case 'education': {
      if (enriched.due_date && enriched.child_id) {
        await AUTO_CAPABILITIES.addCalendarEvent({
          title: enriched.title,
          date: String(enriched.due_date),
          userId,
          childId: String(enriched.child_id),
        })
        autoCompleted.push('已写入孩子校历')

        const draftResult = await AUTO_CAPABILITIES.generateDraft({
          type: 'leave_letter',
          context: { todo: enriched },
          userId,
        })
        if (draftResult) {
          autoCompleted.push('已生成回执草稿')
          draft = draftResult.text
        }
      }

      userActions.push({
        label: '查看草稿',
        action: 'open_draft',
        value: '',
        timing: 'now',
        reason: '确认内容后发给老师',
      })
      break
    }

    case 'mobility': {
      if (enriched.depart_date) {
        await AUTO_CAPABILITIES.setReminder({
          title: `出发提醒：${enriched.title}`,
          dueDate: String(enriched.depart_date),
          userId,
        })
        autoCompleted.push('已设置出发提醒')

        const dayBefore = new Date(`${String(enriched.depart_date)}T12:00:00`)
        dayBefore.setDate(dayBefore.getDate() - 1)
        await AUTO_CAPABILITIES.setReminder({
          title: `明天出发，确认行李：${enriched.title}`,
          dueDate: dayBefore.toISOString().slice(0, 10),
          userId,
        })
        autoCompleted.push('已设置行李确认提醒')
      }

      const callScript = await AUTO_CAPABILITIES.generateDraft({
        type: 'call_script',
        context: { todo: enriched, type: 'flight' },
        userId,
      })
      if (callScript) {
        autoCompleted.push('已生成致电话术')
        draft = draft || callScript.text
      }

      userActions.push({
        label: '致电航空公司',
        action: 'call',
        value: 'tel:95530',
        timing: 'today',
        reason: '确认行李直挂和改签政策',
      })
      break
    }

    default: {
      if (enriched.due_date) {
        await AUTO_CAPABILITIES.setReminder({
          title: enriched.title,
          dueDate: String(enriched.due_date),
          userId,
        })
        autoCompleted.push('已设置截止提醒')
      }
      break
    }
  }

  const nextStep = userActions[0]?.reason || '请查看上方提示'
  return { autoCompleted, userActions, nextStep, draft }
}

export function userActionsToExecutionPackActions(userActions: UserAction[]) {
  return userActions.map((ua) => {
    switch (ua.action) {
      case 'navigate':
        return { type: 'navigate', label: ua.label, data: { url: ua.value } }
      case 'call':
        return { type: 'call', label: ua.label, data: { phone: ua.value.replace(/^tel:/, '') } }
      case 'open_url':
        return { type: 'open_url', label: ua.label, data: { url: ua.value } }
      case 'open_draft':
        return { type: 'email', label: ua.label, data: { note: ua.reason } }
      default:
        return { type: ua.action, label: ua.label, data: { url: ua.value } }
    }
  })
}

export function buildExecutionPackFromPlan(result: PlanExecuteResult) {
  return {
    summary: result.autoCompleted.join('；') || result.nextStep,
    actions: userActionsToExecutionPackActions(result.userActions),
    primary_action_index: 0,
    primary_action_reason: result.nextStep,
    autoCompleted: result.autoCompleted,
    userActions: result.userActions,
    nextStep: result.nextStep,
    draft: result.draft,
  }
}
