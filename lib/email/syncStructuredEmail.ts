import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExtractedEmail } from '@/lib/email/gmailExtract'
import { EmailService } from '@/lib/services/EmailService'
import { buildStructuredEmailExtraction } from '@/lib/email/emailPipeline'

export type StructuredEmailInput = {
  userId: string
  messageId: string
  email: ExtractedEmail
}

export async function persistStructuredEmail(
  supabase: SupabaseClient,
  input: StructuredEmailInput,
): Promise<{
  eventsWritten: number
  todosWritten: number
  summary: string
  contentType?: string
} | null> {
  const { userId, messageId, email } = input

  const extraction = await buildStructuredEmailExtraction({
    subject: email.subject,
    body: email.body,
    from: email.from,
    date: email.date,
    messageId,
    attachments: email.attachments,
  })

  if (!extraction) return null

  const result = await EmailService.persist(extraction, userId, undefined, supabase)

  return {
    eventsWritten: result.eventsWritten ?? 0,
    todosWritten: result.todosWritten ?? 0,
    summary: extraction.summary,
    contentType: extraction.contentType,
  }
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
