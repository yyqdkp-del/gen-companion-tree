import type { SupabaseClient } from '@supabase/supabase-js'
import type { TodoDimension, TodoPriority } from '@/lib/services/TodoService'
import type { ClassificationResult, ContentType } from '@/lib/vision/contentClassifier'
import {
  contentTypeToDimension,
  contentTypeToEmailDocType,
  isSchoolRelatedContent,
} from '@/lib/email/emailClassification'
import { normalizeEmailDate } from '@/lib/email/emailDateParser'

export interface EmailTodoItem {
  title: string
  dimension: TodoDimension
  due_date?: string | null
  priority?: TodoPriority
}

export interface EmailExtraction {
  emailId: string
  subject: string
  fromAddress: string
  receivedAt: string
  summary: string
  docType: string
  contentType: ContentType
  classification?: ClassificationResult
  dimension: TodoDimension
  isSchoolRelated: boolean
  events: Array<{
    title: string
    date: string
    requires_action: boolean
    requires_items?: string[]
    deadline?: string
  }>
  amounts: Array<{
    amount: number
    currency: string
    purpose: string
    due_date?: string
  }>
  todos: EmailTodoItem[]
  /** @deprecated 兼容 processed_emails.extracted_requirements */
  requirements: string[]
  hasAttachments: boolean
}

function calendarRequiresAction(value: boolean): string | null {
  return value ? '需要确认' : null
}

async function resolveActiveChildId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  return children?.[0]?.id || null
}

export async function persistEmailExtraction(
  supabase: SupabaseClient,
  extraction: EmailExtraction,
  userId: string,
  childId?: string | null,
): Promise<{ eventsWritten: number; todosWritten: number }> {
  const activeChildId = childId ?? await resolveActiveChildId(supabase, userId)

  await supabase.from('processed_emails').upsert(
    {
      user_id: userId,
      message_id: extraction.emailId,
      from_email: extraction.fromAddress,
      from_address: extraction.fromAddress,
      subject: extraction.subject,
      received_at: extraction.receivedAt,
      summary: extraction.summary,
      source_type: 'gmail',
      source: 'gmail',
      status: 'active',
      is_school_related: extraction.isSchoolRelated,
      email_type: extraction.docType,
      processed_at: new Date().toISOString(),
      extracted_events: extraction.events,
      extracted_amounts: extraction.amounts,
      extracted_requirements: extraction.todos.map((t) => ({
        title: t.title,
        due_date: t.due_date,
        dimension: t.dimension,
      })),
      has_attachments: extraction.hasAttachments,
      attachment_count: extraction.hasAttachments ? 1 : 0,
      events_created: extraction.events.length,
      todos_created: extraction.amounts.length + extraction.todos.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'message_id' },
  )

  let eventsWritten = 0
  let todosWritten = 0

  if (activeChildId && extraction.isSchoolRelated && extraction.contentType !== 'flight_itinerary') {
    for (const event of extraction.events) {
      if (!event.title || !event.date) continue

      const { data: existing } = await supabase
        .from('child_school_calendar')
        .select('id')
        .eq('user_id', userId)
        .eq('child_id', activeChildId)
        .eq('title', event.title)
        .eq('date_start', event.date)
        .eq('source', 'gmail')
        .maybeSingle()

      if (existing) continue

      const { error } = await supabase.from('child_school_calendar').insert({
        user_id: userId,
        child_id: activeChildId,
        title: event.title,
        date_start: event.date,
        date_end: event.deadline || event.date,
        requires_action: calendarRequiresAction(event.requires_action),
        requires_items: event.requires_items || [],
        source: 'gmail',
        source_email_id: extraction.emailId,
        event_type: extraction.contentType === 'school_calendar' ? 'holiday' : 'activity',
      })

      if (!error) eventsWritten += 1
    }
  }

  for (const amount of extraction.amounts) {
    if (!amount.amount) continue
    const { error } = await supabase.from('todo_items').insert({
      user_id: userId,
      child_id: activeChildId,
      title: `付款：${amount.purpose || extraction.subject}`,
      description: `${amount.amount} ${amount.currency || 'THB'}`,
      category: 'wealth',
      priority: 'orange',
      status: 'pending',
      due_date: amount.due_date || null,
      source: 'gmail',
      ai_action_data: {
        source_email_id: extraction.emailId,
        amount: amount.amount,
        currency: amount.currency,
        content_type: extraction.contentType,
      },
    })
    if (!error) todosWritten += 1
  }

  for (const todo of extraction.todos) {
    if (!todo.title?.trim()) continue
    const { error } = await supabase.from('todo_items').insert({
      user_id: userId,
      child_id: activeChildId,
      title: todo.title.trim(),
      category: todo.dimension,
      priority: todo.priority || 'yellow',
      status: 'pending',
      due_date: todo.due_date || null,
      source: 'gmail',
      ai_action_data: {
        source_email_id: extraction.emailId,
        content_type: extraction.contentType,
        classification_reason: extraction.classification?.reason,
      },
    })
    if (!error) todosWritten += 1
  }

  return { eventsWritten, todosWritten }
}

export function buildEmailExtractionFromStructured(input: {
  messageId: string
  subject: string
  from: string
  date: string
  summary: string
  docType?: string
  contentType?: ContentType
  classification?: ClassificationResult
  dimension?: TodoDimension
  isSchoolRelated?: boolean
  events: EmailExtraction['events']
  amounts: EmailExtraction['amounts']
  todos: EmailTodoItem[]
  hasAttachments: boolean
}): EmailExtraction {
  const contentType = input.contentType || 'school_notice'
  return {
    emailId: input.messageId,
    subject: input.subject,
    fromAddress: input.from,
    receivedAt: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
    summary: input.summary,
    docType: input.docType || contentTypeToEmailDocType(contentType),
    contentType,
    classification: input.classification,
    dimension: input.dimension || contentTypeToDimension(contentType),
    isSchoolRelated: input.isSchoolRelated ?? isSchoolRelatedContent(contentType),
    events: input.events,
    amounts: input.amounts,
    todos: input.todos,
    requirements: input.todos.map((t) => t.title),
    hasAttachments: input.hasAttachments,
  }
}

const CLAUDE_CATEGORY_MAP: Record<string, TodoDimension> = {
  education: 'education',
  compliance: 'compliance',
  wealth: 'wealth',
  medical: 'medical',
  logistics: 'logistics',
  social: 'social',
  mobility: 'mobility',
}

function mapClaudeCategory(raw?: string, emailType?: string): TodoDimension {
  if (raw && CLAUDE_CATEGORY_MAP[raw]) return CLAUDE_CATEGORY_MAP[raw]
  if (emailType === 'finance') return 'wealth'
  if (emailType === 'visa_compliance') return 'compliance'
  if (emailType === 'medical') return 'medical'
  return 'education'
}

/** Claude 全文解析 → 统一 EmailExtraction */
export function buildEmailExtractionFromClaude(
  parsed: {
    email_type?: string
    is_school_related?: boolean
    summary?: string
    events?: Array<{
      title?: string
      date_start?: string | null
      date_end?: string | null
      requires_action?: string | null
      requires_items?: string[]
      requires_payment?: number | null
      payment_deadline?: string | null
      deadline?: string | null
    }>
    todos?: Array<{
      title?: string
      due_date?: string | null
      category?: string
    }>
  },
  email: { message_id?: string; from: string; subject: string; date: string },
  classification?: ClassificationResult,
): EmailExtraction {
  const receivedAt = email.date ? new Date(email.date).toISOString() : new Date().toISOString()
  const contentType = classification?.type
    || (parsed.email_type === 'finance' ? 'invoice_bill' : 'school_notice')

  const dimension = classification
    ? contentTypeToDimension(classification.type)
    : mapClaudeCategory(undefined, parsed.email_type)

  const events = (parsed.events || [])
    .filter((e) => e.title)
    .map((e) => ({
      title: String(e.title),
      date: normalizeEmailDate(e.date_start, receivedAt) || '',
      requires_action: Boolean(e.requires_action),
      requires_items: e.requires_items || [],
      deadline: normalizeEmailDate(e.payment_deadline || e.deadline || e.date_end, receivedAt) || undefined,
    }))
    .filter((e) => e.date)

  const amounts = (parsed.events || [])
    .filter((e) => e.requires_payment && Number(e.requires_payment) > 0)
    .map((e) => ({
      amount: Number(e.requires_payment),
      currency: 'THB',
      purpose: String(e.title || email.subject),
      due_date: normalizeEmailDate(e.payment_deadline || e.date_start, receivedAt) || undefined,
    }))

  const todos: EmailTodoItem[] = (parsed.todos || [])
    .filter((t) => t.title?.trim())
    .map((t) => ({
      title: String(t.title).trim(),
      dimension: mapClaudeCategory(t.category, parsed.email_type),
      due_date: normalizeEmailDate(t.due_date, receivedAt) || null,
      priority: 'orange' as const,
    }))

  const isSchool = classification
    ? isSchoolRelatedContent(classification.type)
    : parsed.is_school_related !== false

  return {
    emailId: email.message_id || `${email.from}_${email.date}`,
    subject: email.subject,
    fromAddress: email.from,
    receivedAt,
    summary: String(parsed.summary || email.subject).slice(0, 200),
    docType: contentTypeToEmailDocType(contentType),
    contentType,
    classification,
    dimension,
    isSchoolRelated: isSchool && contentType !== 'flight_itinerary',
    events: contentType === 'flight_itinerary' ? [] : events,
    amounts,
    todos,
    requirements: todos.map((t) => t.title),
    hasAttachments: false,
  }
}
