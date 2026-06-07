import type { ActionExecutor, ExecutionResult, RootAction } from '@/lib/action/rootBrain'
import {
  addToGoogleCalendar,
  buildGoogleCalendarWebUrl,
  buildMailtoUrl,
  checkMCPConnection,
  createGmailDraft,
  sendGmailDraft,
} from '@/lib/mcp/googleMcp'
import { sendGmail } from '@/lib/google/gmail'
import { CalendarService } from '@/lib/services/CalendarService'
import { TodoService } from '@/lib/services/TodoService'

async function executeGmail(
  executor: ActionExecutor,
  userId: string,
): Promise<ExecutionResult> {
  const to = String(executor.params.to || '').trim()
  const subject = String(executor.params.subject || '')
  const body = String(executor.params.body || '')

  const hasGmail = await checkMCPConnection(userId, 'gmail')

  try {
    if (executor.method === 'create_draft') {
      if (!to || !subject || !body) {
        return { ok: false, error: '缺少邮件字段' }
      }
      if (hasGmail) {
        const draft = await createGmailDraft({ to, subject, body, userId })
        return { ok: true, message: 'draft_created', draftId: draft.draftId }
      }
      if (executor.fallback) {
        return executeExecutor(executor.fallback, userId)
      }
      return { ok: true, url: buildMailtoUrl(to, subject, body), message: 'mailto_fallback' }
    }

    if (executor.method === 'send_draft') {
      const draftId = String(executor.params.draftId || '')
      if (hasGmail && draftId) {
        const result = await sendGmailDraft({ userId, draftId, to, subject, body })
        if (result.ok) return { ok: true, message: 'email_sent' }
      }
      if (hasGmail && to) {
        const direct = await sendGmail(userId, to, subject, body)
        if (direct.success) return { ok: true, message: 'email_sent' }
      }
      if (executor.fallback) {
        return executeExecutor(executor.fallback, userId)
      }
      return { ok: true, url: buildMailtoUrl(to, subject, body), message: 'mailto_fallback' }
    }

    if (executor.method === 'send') {
      if (hasGmail && to) {
        const direct = await sendGmail(userId, to, subject, body)
        if (direct.success) return { ok: true, message: 'email_sent' }
      }
      if (executor.fallback) {
        return executeExecutor(executor.fallback, userId)
      }
      return { ok: true, url: buildMailtoUrl(to, subject, body), message: 'mailto_fallback' }
    }

    return { ok: false, error: `unknown gmail method: ${executor.method}` }
  } catch (e: unknown) {
    if (executor.fallback) {
      return executeExecutor(executor.fallback, userId)
    }
    const message = e instanceof Error ? e.message : 'gmail_failed'
    if (to) {
      return { ok: true, url: buildMailtoUrl(to, subject, body), message: message }
    }
    return { ok: false, error: message }
  }
}

async function executeCalendar(
  executor: ActionExecutor,
  userId: string,
): Promise<ExecutionResult> {
  const title = String(executor.params.title || '').trim()
  const date = String(executor.params.date || '').trim()
  const notes = executor.params.notes ? String(executor.params.notes) : undefined

  if (!title || !date) {
    return { ok: false, error: '缺少日历字段' }
  }

  const hasCalendar = await checkMCPConnection(userId, 'calendar')

  try {
    if (hasCalendar) {
      const result = await addToGoogleCalendar({ userId, title, date, notes })
      if (result.ok) {
        return { ok: true, message: 'calendar_added', eventLink: result.eventLink }
      }
    }

    if (executor.fallback) {
      return executeExecutor(executor.fallback, userId)
    }

    return {
      ok: true,
      url: buildGoogleCalendarWebUrl(title, date),
      message: 'calendar_web_fallback',
    }
  } catch {
    if (executor.fallback) {
      return executeExecutor(executor.fallback, userId)
    }
    return {
      ok: true,
      url: buildGoogleCalendarWebUrl(title, date),
      message: 'calendar_web_fallback',
    }
  }
}

async function executeInternal(
  executor: ActionExecutor,
  userId: string,
): Promise<ExecutionResult> {
  switch (executor.method) {
    case 'complete_todo': {
      const todoId = String(executor.params.todoId || '')
      if (!todoId) return { ok: false, error: 'missing todoId' }
      const result = await TodoService.complete(todoId)
      return result.ok
        ? { ok: true, message: 'todo_completed' }
        : { ok: false, error: result.error }
    }

    case 'add_todo': {
      const result = await TodoService.create({
        userId,
        title: String(executor.params.title || ''),
        dimension: (executor.params.dimension as 'selfcare') || 'selfcare',
        priority: (executor.params.priority as 'yellow') || 'yellow',
        dueDate: executor.params.dueDate ? String(executor.params.dueDate) : undefined,
        childId: executor.params.childId ? String(executor.params.childId) : undefined,
        notes: executor.params.notes ? String(executor.params.notes) : undefined,
        source: 'auto_execute',
      })
      return result.ok
        ? { ok: true, message: 'todo_added' }
        : { ok: false, error: result.error }
    }

    case 'add_calendar': {
      const childId = String(executor.params.childId || '')
      if (!childId) return { ok: false, error: 'missing childId' }
      const result = await CalendarService.upsertEvent({
        userId,
        childId,
        title: String(executor.params.title || ''),
        dateStart: String(executor.params.date || executor.params.dateStart || ''),
        notes: executor.params.notes ? String(executor.params.notes) : undefined,
        source: 'auto_execute',
      })
      return result.ok
        ? { ok: true, message: 'calendar_added' }
        : { ok: false, error: result.error }
    }

    default:
      return { ok: false, error: `unknown internal method: ${executor.method}` }
  }
}

async function executeExecutor(
  executor: ActionExecutor,
  userId: string,
): Promise<ExecutionResult> {
  switch (executor.service) {
    case 'gmail':
      return executeGmail(executor, userId)

    case 'calendar':
      return executeCalendar(executor, userId)

    case 'maps': {
      const dest = String(executor.params.destination || executor.params.query || '')
      return {
        ok: true,
        url: dest
          ? `https://maps.google.com/?q=${encodeURIComponent(dest)}`
          : 'https://maps.google.com',
      }
    }

    case 'grab': {
      const dest = String(executor.params.destination || '')
      return {
        ok: true,
        url: `grab://open?screenType=BOOKING&dropOffName=${encodeURIComponent(dest)}`,
      }
    }

    case 'tel': {
      const phone = String(executor.params.phone || '').replace(/\s/g, '')
      return { ok: true, url: `tel:${phone}` }
    }

    case 'url': {
      const url = String(executor.params.url || '')
      if (!url) return { ok: false, error: 'missing url' }
      return { ok: true, url }
    }

    case 'internal':
      return executeInternal(executor, userId)

    default:
      if (executor.fallback) {
        return executeExecutor(executor.fallback, userId)
      }
      return { ok: false, error: `unsupported service: ${executor.service}` }
  }
}

export async function executeAction(
  action: RootAction,
  userId: string,
): Promise<ExecutionResult> {
  return executeExecutor(action.executor, userId)
}

export async function executeRootAction(
  action: RootAction,
  userId: string,
): Promise<ExecutionResult> {
  return executeAction(action, userId)
}
