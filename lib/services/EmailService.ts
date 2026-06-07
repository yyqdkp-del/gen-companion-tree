import type { SupabaseClient } from '@supabase/supabase-js'
import {
  persistEmailExtraction,
  type EmailExtraction,
} from '@/lib/email/persistEmailExtraction'
import { getAuthDb, getDb } from '@/lib/services/_db'

export type { EmailExtraction }

export interface EmailDiscoveryRow {
  id: string
  subject: string | null
  summary: string | null
  extracted_events: unknown
  source_type: string | null
  status: string | null
  created_at: string
}

export const EmailService = {
  async persist(
    extraction: EmailExtraction,
    userId: string,
    childId?: string,
    client?: SupabaseClient,
  ): Promise<{ ok: boolean; eventsWritten?: number; todosWritten?: number }> {
    try {
      const supabase = getDb(client)
      const result = await persistEmailExtraction(supabase, extraction, userId, childId)
      return { ok: true, ...result }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'persist failed'
      console.error('[EmailService.persist]', message)
      return { ok: false }
    }
  },

  async getDiscoveries(
    userId: string,
    limit = 10,
    client?: SupabaseClient,
  ): Promise<EmailDiscoveryRow[]> {
    try {
      const supabase = client ? getDb(client) : await getAuthDb()
      const { data } = await supabase
        .from('processed_emails')
        .select('id, subject, summary, extracted_events, source_type, status, created_at')
        .eq('user_id', userId)
        .in('status', ['active'])
        .in('source_type', ['gmail', 'manual', 'school_upload'])
        .order('created_at', { ascending: false })
        .limit(limit)
      return (data || []) as EmailDiscoveryRow[]
    } catch (e: unknown) {
      console.error('[EmailService.getDiscoveries]', e)
      return []
    }
  },
}
