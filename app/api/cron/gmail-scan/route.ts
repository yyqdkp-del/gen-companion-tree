export const dynamic = 'force-dynamic'
// app/api/cron/gmail-scan/route.ts
// Vercel Cron Job：每天4次自动扫描已连接 Gmail 的用户邮箱

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/google/tokenStore'

const SCHOOL_FILTERS = [
  'school', 'academy', 'college', 'international',
  'parent', 'student', 'class', 'grade', 'term',
  'holiday', 'schedule', 'fee', 'payment', 'field trip',
  'sports day', 'graduation', 'report card',
  '学校', '幼儿园', '家长', '通知', '课表', '成绩',
  '缴费', '活动', '假期', '运动会', '家长会',
  'lanna', 'prem', 'maerim', 'chiang mai',
  'ClassDojo', 'dojo', 'class story', 'portfolio', 'behavior report',
]

type GmailMessageRow = {
  message_id: string
  from: string
  subject: string
  date: string
  body: string
  snippet: string
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function extractBody(payload: { body?: { data?: string }; parts?: unknown[] } | undefined): string {
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  for (const part of payload.parts || []) {
    const text = extractBody(part as { body?: { data?: string }; parts?: unknown[] })
    if (text) return text
  }
  return ''
}

function parseGmailMessage(msg: {
  id?: string
  snippet?: string
  payload?: { headers?: { name: string; value: string }[]; body?: { data?: string }; parts?: unknown[] }
}): GmailMessageRow {
  const headers = msg.payload?.headers || []
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  return {
    message_id: msg.id || '',
    from: getHeader('From'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body: extractBody(msg.payload).slice(0, 2000),
    snippet: msg.snippet || '',
  }
}

async function listGmailUserIds(): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('user_id')
    .eq('service', 'gmail')
    .not('refresh_token', 'is', null)

  if (error) {
    console.error('[gmail-scan] list users failed:', error.message)
    return []
  }

  return [...new Set((data || []).map((row) => row.user_id).filter(Boolean))]
}

async function fetchRecentEmailsForUser(userId: string): Promise<GmailMessageRow[]> {
  const accessToken = await getValidAccessToken(userId, 'gmail')
  if (!accessToken) {
    console.warn(`[gmail-scan] user=${userId} skip: no valid Gmail token`)
    return []
  }

  const sinceSec = Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000)
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('q', `after:${sinceSec}`)
  listUrl.searchParams.set('maxResults', '30')

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!listRes.ok) {
    const errText = await listRes.text().catch(() => '')
    throw new Error(`Gmail list failed (${listRes.status}): ${errText.slice(0, 200)}`)
  }

  const listData = (await listRes.json()) as { messages?: { id: string }[] }
  const ids = (listData.messages || []).map((m) => m.id).filter(Boolean)
  const emails: GmailMessageRow[] = []

  for (const id of ids) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!msgRes.ok) continue
      const msg = await msgRes.json()
      emails.push(parseGmailMessage(msg))
    } catch (e) {
      console.warn(`[gmail-scan] user=${userId} message=${id} read failed:`, (e as Error).message)
    }
  }

  return emails
}

function filterRelevantEmails(emails: GmailMessageRow[]): GmailMessageRow[] {
  return emails.filter((email) => {
    const text = `${email.subject} ${email.from} ${email.snippet || ''}`.toLowerCase()
    return SCHOOL_FILTERS.some((kw) => text.includes(kw.toLowerCase()))
  })
}

async function parseEmailsForUser(
  baseUrl: string,
  userId: string,
  emails: GmailMessageRow[],
): Promise<{ ok: boolean; processed?: number; results?: unknown[]; error?: string }> {
  const parseRes = await fetch(`${baseUrl}/api/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET || '',
    },
    body: JSON.stringify(
      emails.map((e) => ({
        ...e,
        user_id: userId,
        source: 'mcp_scan' as const,
      })),
    ),
  })

  const result = await parseRes.json().catch(() => ({}))
  if (!parseRes.ok) {
    return { ok: false, error: result.error || `parse HTTP ${parseRes.status}` }
  }
  return { ok: true, processed: result.processed, results: result.results }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const userIds = await listGmailUserIds()

  if (!userIds.length) {
    console.log('[gmail-scan] no users with Gmail connected')
    return NextResponse.json({ ok: true, message: '无已连接 Gmail 的用户', users: 0, results: [] })
  }

  const results: Array<Record<string, unknown>> = []

  for (const userId of userIds) {
    try {
      const allEmails = await fetchRecentEmailsForUser(userId)
      const relevant = filterRelevantEmails(allEmails)

      if (!relevant.length) {
        console.log(
          `[gmail-scan] user=${userId} ok scanned=${allEmails.length} relevant=0 processed=0`,
        )
        results.push({
          userId,
          ok: true,
          scanned: allEmails.length,
          relevant: 0,
          processed: 0,
        })
        continue
      }

      const parsed = await parseEmailsForUser(baseUrl, userId, relevant)
      if (!parsed.ok) {
        console.error(
          `[gmail-scan] user=${userId} parse failed scanned=${allEmails.length} relevant=${relevant.length} error=${parsed.error}`,
        )
        results.push({
          userId,
          ok: false,
          scanned: allEmails.length,
          relevant: relevant.length,
          error: parsed.error,
        })
        continue
      }

      console.log(
        `[gmail-scan] user=${userId} ok scanned=${allEmails.length} relevant=${relevant.length} processed=${parsed.processed ?? 0}`,
      )
      results.push({
        userId,
        ok: true,
        scanned: allEmails.length,
        relevant: relevant.length,
        processed: parsed.processed ?? 0,
        details: parsed.results,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`[gmail-scan] user=${userId} failed:`, message)
      results.push({ userId, ok: false, error: message })
    }
  }

  const succeeded = results.filter((r) => r.ok).length
  const failed = results.length - succeeded

  return NextResponse.json({
    ok: failed === 0,
    users: userIds.length,
    succeeded,
    failed,
    results,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
