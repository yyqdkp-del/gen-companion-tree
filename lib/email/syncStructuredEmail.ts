import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailExtraction } from '@/lib/email/pdfExtractor'
import type { ExtractedEmail } from '@/lib/email/gmailExtract'
import {
  buildEmailExtractionFromStructured,
  persistEmailExtraction,
} from '@/lib/email/persistEmailExtraction'

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

export async function persistStructuredEmail(
  supabase: SupabaseClient,
  input: StructuredEmailInput,
): Promise<{ eventsWritten: number; todosWritten: number }> {
  const { userId, messageId, email, merged, bodyExtraction } = input
  const summary = merged.summaryParts.filter(Boolean).join('；') || email.subject

  const extraction = buildEmailExtractionFromStructured({
    messageId,
    subject: email.subject,
    from: email.from,
    date: email.date,
    summary,
    docType: bodyExtraction?.docType || 'school',
    events: merged.allEvents,
    amounts: merged.allAmounts,
    requirements: merged.allRequirements,
    hasAttachments: email.attachments.length > 0,
  })

  return persistEmailExtraction(supabase, extraction, userId)
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
