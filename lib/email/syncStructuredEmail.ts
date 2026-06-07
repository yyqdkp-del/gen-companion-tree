import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailExtraction } from '@/lib/email/pdfExtractor'
import type { ExtractedEmail } from '@/lib/email/gmailExtract'

export type StructuredEmailInput = {
  userId: string
  messageId: string
  email: ExtractedEmail
  bodyExtraction: EmailExtraction | null
  attachmentExtractions: Array<EmailExtraction | null>
  merged: {
    allEvents: EmailExtraction['events']
    allAmounts: EmailExtraction['amounts']
    allRequirements: string[]
    summaryParts: string[]
  }
}

async function resolveActiveChildId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  return children?.[0]?.id || null
}

export async function persistStructuredEmail(
  supabase: SupabaseClient,
  input: StructuredEmailInput,
): Promise<{ eventsWritten: number; todosWritten: number }> {
  const { userId, messageId, email, merged } = input
  const activeChildId = await resolveActiveChildId(supabase, userId)

  const summary = merged.summaryParts.filter(Boolean).join('；') || email.subject

  await supabase.from('processed_emails').upsert(
    {
      user_id: userId,
      message_id: messageId,
      from_email: email.from,
      from_address: email.from,
      subject: email.subject,
      received_at: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      summary,
      source_type: 'gmail',
      source: 'gmail',
      status: 'active',
      is_school_related: true,
      email_type: 'school',
      processed_at: new Date().toISOString(),
      extracted_events: merged.allEvents,
      extracted_amounts: merged.allAmounts,
      extracted_requirements: merged.allRequirements,
      has_attachments: email.attachments.length > 0,
      attachment_count: email.attachments.length,
      events_created: merged.allEvents.length,
      todos_created: merged.allAmounts.length + merged.allRequirements.length,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'message_id' },
  )

  let eventsWritten = 0
  let todosWritten = 0

  if (activeChildId) {
    for (const event of merged.allEvents) {
      if (!event.date || !event.title) continue

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
        date_end: event.date,
        requires_action: event.requires_action ? '需要确认' : null,
        requires_items: event.requires_items || [],
        source: 'gmail',
        source_email_id: messageId,
        event_type: 'activity',
      })

      if (!error) eventsWritten += 1
    }
  }

  for (const amount of merged.allAmounts) {
    if (!amount.amount) continue
    const { error } = await supabase.from('todo_items').insert({
      user_id: userId,
      child_id: activeChildId,
      title: `付款：${amount.purpose || email.subject}`,
      description: `${amount.amount} ${amount.currency || 'THB'}`,
      category: 'wealth',
      priority: 'orange',
      status: 'pending',
      due_date: amount.due_date || null,
      source: 'gmail',
      ai_action_data: {
        source_email_id: messageId,
        amount: amount.amount,
        currency: amount.currency,
      },
    })
    if (!error) todosWritten += 1
  }

  for (const req of merged.allRequirements) {
    if (!req?.trim()) continue
    const { error } = await supabase.from('todo_items').insert({
      user_id: userId,
      child_id: activeChildId,
      title: req.trim(),
      category: 'education',
      priority: 'yellow',
      status: 'pending',
      source: 'gmail',
      ai_action_data: { source_email_id: messageId },
    })
    if (!error) todosWritten += 1
  }

  return { eventsWritten, todosWritten }
}

export async function fetchLatestEmailDiscovery(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  id: string
  summary: string
  created_at: string
} | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('processed_emails')
    .select('id, summary, subject, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('source_type', 'gmail')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    summary: String(data.summary || data.subject || '').trim(),
    created_at: data.created_at,
  }
}
