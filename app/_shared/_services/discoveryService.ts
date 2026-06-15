import { createClient } from '@/lib/supabase/client'
import { getTodayStr } from '@/lib/date/localDate'

const supabase = createClient()

export type DiscoverySourceKind = 'email' | 'photo' | 'chat'

export type ExtractedEvent = {
  title: string
  date: string
  requires_action?: boolean
  requires_items?: string[]
  deadline?: string
}

export type ExtractedTodo = {
  title: string
  date?: string
  due_date?: string | null
  dimension?: string
  deadline?: string
}

export type DiscoveryItem = {
  id: string
  sourceKind: DiscoverySourceKind
  sourceLabel: string
  summary: string
  createdAt: string
  table: 'processed_emails' | 'raw_inputs'
  extractedEvents?: ExtractedEvent[]
  extractedTodos?: ExtractedTodo[]
  messageId?: string
  hasAttachments?: boolean
}

function mapEmailRow(row: {
  id: string
  summary?: string | null
  subject?: string | null
  source_type?: string | null
  message_id?: string | null
  created_at: string
  extracted_events?: unknown
  extracted_requirements?: unknown
  email_type?: string | null
  has_attachments?: boolean | null
}): DiscoveryItem {
  const summary = String(row.summary || row.subject || '邮件中有新信息').trim()
  const events = Array.isArray(row.extracted_events)
    ? (row.extracted_events as ExtractedEvent[])
    : []
  const extractedTodos = Array.isArray(row.extracted_requirements)
    ? (row.extracted_requirements as ExtractedTodo[])
    : []

  const label = row.email_type === 'flight'
    ? '✈️ 出行邮件'
    : row.email_type === 'invoice'
      ? '💰 账单邮件'
      : '📧 学校邮件'

  return {
    id: row.id,
    sourceKind: 'email',
    sourceLabel: label,
    summary,
    createdAt: row.created_at,
    table: 'processed_emails',
    extractedEvents: events,
    extractedTodos,
    messageId: row.message_id || undefined,
    hasAttachments: !!row.has_attachments,
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
    .select('id, source_type, summary, subject, message_id, created_at, status, extracted_events, extracted_requirements, email_type, has_attachments')
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

export async function fetchRecentEmailDiscovery(userId: string): Promise<DiscoveryItem | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('processed_emails')
    .select('id, source_type, summary, subject, message_id, created_at, status, extracted_events, extracted_requirements, email_type, has_attachments')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('source_type', 'gmail')
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return mapEmailRow(data as Parameters<typeof mapEmailRow>[0])
}

async function resolveChildId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('children')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return data?.id || null
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
  const firstTodo = item.extractedTodos?.[0]
  const firstEvent = item.extractedEvents?.[0]
  const dueDate = firstTodo?.due_date || firstEvent?.deadline || firstEvent?.date || null
  const title = firstTodo?.title || firstEvent?.title || item.summary.slice(0, 120)
  const dimension = firstTodo?.dimension || 'education'

  const { error } = await supabase.from('todo_items').insert({
    user_id: userId,
    title,
    description: item.summary,
    priority: 'orange',
    status: 'pending',
    source: 'gmail',
    source_ref_id: item.id,
    due_date: dueDate,
    category: dimension,
    ai_action_data: item.messageId ? { source_email_id: item.messageId } : undefined,
  })
  if (error) throw error
}

export async function addDiscoveryToCalendar(userId: string, item: DiscoveryItem): Promise<void> {
  const childId = await resolveChildId(userId)
  if (!childId) throw new Error('no_child')

  const events = item.extractedEvents?.length
    ? item.extractedEvents
    : [{ title: item.summary, date: getTodayStr(), requires_action: true }]

  for (const event of events.slice(0, 3)) {
    if (!event.title) continue
    const date = event.date || getTodayStr()

    const { data: existing } = await supabase
      .from('child_school_calendar')
      .select('id')
      .eq('user_id', userId)
      .eq('child_id', childId)
      .eq('title', event.title)
      .eq('date_start', date)
      .maybeSingle()

    if (existing) continue

    const { error } = await supabase.from('child_school_calendar').insert({
      user_id: userId,
      child_id: childId,
      title: event.title,
      date_start: date,
      date_end: date,
      requires_action: event.requires_action ? '需要确认' : null,
      requires_items: event.requires_items || [],
      source: 'gmail',
      source_email_id: item.messageId || null,
      event_type: 'activity',
    })
    if (error) throw error
  }
}

export async function addDiscoveryReminder(userId: string, item: DiscoveryItem): Promise<void> {
  const childId = await resolveChildId(userId)
  const firstEvent = item.extractedEvents?.[0]
  const dueDate = firstEvent?.deadline || firstEvent?.date || getTodayStr()

  const { error } = await supabase.from('todo_items').insert({
    user_id: userId,
    child_id: childId,
    title: firstEvent?.title ? `提醒：${firstEvent.title}` : item.summary.slice(0, 80),
    description: item.summary,
    priority: 'orange',
    status: 'pending',
    due_date: dueDate,
    source: 'gmail',
    category: 'education',
    ai_action_data: item.messageId ? { source_email_id: item.messageId } : undefined,
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

export function formatEventDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  } catch {
    return date
  }
}
