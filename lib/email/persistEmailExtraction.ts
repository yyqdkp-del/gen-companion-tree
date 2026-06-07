import type { SupabaseClient } from '@supabase/supabase-js'

export interface EmailExtraction {
  emailId: string
  subject: string
  fromAddress: string
  receivedAt: string
  summary: string
  docType: string
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
      is_school_related: true,
      email_type: extraction.docType || 'school',
      processed_at: new Date().toISOString(),
      extracted_events: extraction.events,
      extracted_amounts: extraction.amounts,
      extracted_requirements: extraction.requirements,
      has_attachments: extraction.hasAttachments,
      attachment_count: extraction.hasAttachments ? 1 : 0,
      events_created: extraction.events.length,
      todos_created: extraction.amounts.length + extraction.requirements.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'message_id' },
  )

  let eventsWritten = 0
  let todosWritten = 0

  if (activeChildId) {
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
        event_type: 'activity',
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
      },
    })
    if (!error) todosWritten += 1
  }

  for (const req of extraction.requirements) {
    if (!req?.trim()) continue
    const { error } = await supabase.from('todo_items').insert({
      user_id: userId,
      child_id: activeChildId,
      title: req.trim(),
      category: 'education',
      priority: 'yellow',
      status: 'pending',
      source: 'gmail',
      ai_action_data: { source_email_id: extraction.emailId },
    })
    if (!error) todosWritten += 1
  }

  return { eventsWritten, todosWritten }
}

/** Gemini/pdfExtractor 合并结果 → 统一 EmailExtraction */
export function buildEmailExtractionFromStructured(input: {
  messageId: string
  subject: string
  from: string
  date: string
  summary: string
  docType?: string
  events: EmailExtraction['events']
  amounts: EmailExtraction['amounts']
  requirements: string[]
  hasAttachments: boolean
}): EmailExtraction {
  return {
    emailId: input.messageId,
    subject: input.subject,
    fromAddress: input.from,
    receivedAt: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
    summary: input.summary,
    docType: input.docType || 'school',
    events: input.events,
    amounts: input.amounts,
    requirements: input.requirements,
    hasAttachments: input.hasAttachments,
  }
}

/** Claude 全文解析 → 统一 EmailExtraction（校历/待办/已处理记录） */
export function buildEmailExtractionFromClaude(
  parsed: {
    email_type?: string
    summary?: string
    events?: Array<{
      title?: string
      date_start?: string | null
      date_end?: string | null
      requires_action?: string | null
      requires_items?: string[]
      requires_payment?: number | null
      payment_deadline?: string | null
    }>
    todos?: Array<{
      title?: string
      due_date?: string | null
      category?: string
    }>
  },
  email: { message_id?: string; from: string; subject: string; date: string },
): EmailExtraction {
  const events = (parsed.events || [])
    .filter((e) => e.title && e.date_start)
    .map((e) => ({
      title: String(e.title),
      date: String(e.date_start),
      requires_action: Boolean(e.requires_action),
      requires_items: e.requires_items || [],
      deadline: e.payment_deadline || e.date_end || undefined,
    }))

  const amounts = (parsed.events || [])
    .filter((e) => e.requires_payment && Number(e.requires_payment) > 0)
    .map((e) => ({
      amount: Number(e.requires_payment),
      currency: 'THB',
      purpose: String(e.title || email.subject),
      due_date: e.payment_deadline || e.date_start || undefined,
    }))

  const requirements = (parsed.todos || [])
    .map((t) => String(t.title || '').trim())
    .filter(Boolean)

  return {
    emailId: email.message_id || `${email.from}_${email.date}`,
    subject: email.subject,
    fromAddress: email.from,
    receivedAt: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
    summary: String(parsed.summary || email.subject).slice(0, 200),
    docType: parsed.email_type || 'school',
    events,
    amounts,
    requirements,
    hasAttachments: false,
  }
}
