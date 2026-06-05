import { createClient } from '@/lib/supabase/client'
import { getTodayStr } from '@/lib/date/localDate'

const supabase = createClient()

export type DiscoverySourceKind = 'email' | 'photo' | 'chat'

export type DiscoveryItem = {
  id: string
  sourceKind: DiscoverySourceKind
  sourceLabel: string
  summary: string
  createdAt: string
  table: 'processed_emails' | 'raw_inputs'
}

function mapEmailRow(row: {
  id: string
  summary?: string | null
  subject?: string | null
  source_type?: string | null
  created_at: string
}): DiscoveryItem {
  const summary = String(row.summary || row.subject || '邮件中有新信息').trim()
  return {
    id: row.id,
    sourceKind: 'email',
    sourceLabel: '来自邮件',
    summary,
    createdAt: row.created_at,
    table: 'processed_emails',
  }
}

function rawInputSourceKind(inputType?: string | null): DiscoverySourceKind {
  if (inputType === 'image') return 'photo'
  return 'chat'
}

function rawInputSourceLabel(kind: DiscoverySourceKind): string {
  if (kind === 'photo') return '来自拍照'
  return '来自对话'
}

function summaryFromRawInput(row: {
  raw_content?: string | null
  extracted_events?: unknown
  input_type?: string | null
}): string {
  const events = row.extracted_events
  if (Array.isArray(events) && events.length > 0) {
    for (const ev of events) {
      const input = (ev as { input?: { title?: string } })?.input
      const title = input?.title?.trim()
      if (title) return title
    }
  }
  const text = String(row.raw_content || '').trim()
  if (!text) {
    return row.input_type === 'image' ? '根已从照片中整理出信息' : '根已从对话中整理出信息'
  }
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

function mapRawRow(row: {
  id: string
  input_type?: string | null
  raw_content?: string | null
  extracted_events?: unknown
  created_at: string
}): DiscoveryItem {
  const kind = rawInputSourceKind(row.input_type)
  return {
    id: row.id,
    sourceKind: kind,
    sourceLabel: rawInputSourceLabel(kind),
    summary: summaryFromRawInput(row),
    createdAt: row.created_at,
    table: 'raw_inputs',
  }
}

export async function fetchDiscoveries(userId: string): Promise<DiscoveryItem[]> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString()

  const emailPrimary = await supabase
    .from('processed_emails')
    .select('id, source_type, summary, subject, created_at, status')
    .eq('user_id', userId)
    .gt('created_at', sevenDaysAgo)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })
    .limit(5)

  const emailFallback = emailPrimary.error
    ? await supabase
      .from('processed_emails')
      .select('id, subject, created_at, source')
      .eq('user_id', userId)
      .gt('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5)
    : null

  const rawPrimary = await supabase
    .from('raw_inputs')
    .select('id, input_type, raw_content, extracted_events, created_at, status, discovery_dismissed')
    .eq('user_id', userId)
    .eq('status', 'done')
    .eq('discovery_dismissed', false)
    .gt('created_at', threeDaysAgo)
    .order('created_at', { ascending: false })
    .limit(3)

  const rawFallback = rawPrimary.error
    ? await supabase
      .from('raw_inputs')
      .select('id, input_type, raw_content, extracted_events, created_at, status')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gt('created_at', threeDaysAgo)
      .order('created_at', { ascending: false })
      .limit(3)
    : null

  const emailRows = emailPrimary.error ? (emailFallback?.data || []) : (emailPrimary.data || [])
  const rawRows = rawPrimary.error ? (rawFallback?.data || []) : (rawPrimary.data || [])

  const emails = emailRows.map((row) => mapEmailRow(row as Parameters<typeof mapEmailRow>[0]))
  const raws = rawRows.map((row) => mapRawRow(row as Parameters<typeof mapRawRow>[0]))

  return [...emails, ...raws]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

export async function dismissDiscovery(userId: string, item: DiscoveryItem): Promise<void> {
  if (item.table === 'processed_emails') {
    const { error } = await supabase
      .from('processed_emails')
      .update({ status: 'dismissed', updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('raw_inputs')
    .update({ discovery_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', item.id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function addDiscoveryToTodo(userId: string, item: DiscoveryItem): Promise<void> {
  const title = item.summary.length > 80
    ? `跟进：${item.summary.slice(0, 80)}`
    : item.summary
  const { error } = await supabase.from('todo_items').insert({
    user_id: userId,
    title,
    description: item.summary,
    priority: 'orange',
    status: 'pending',
    source: 'rian',
    source_ref_id: item.id,
    due_date: getTodayStr(),
  })
  if (error) throw error
}

export function formatDiscoveryTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
