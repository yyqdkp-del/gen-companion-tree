export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import {
  addToGoogleCalendar,
  createGmailDraft,
  getMCPConnectionStatus,
  sendGmailDraft,
} from '@/lib/mcp/googleMcp'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getMCPConnectionStatus(user.id)
  return NextResponse.json({ ok: true, ...status })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const op = String(body.op || '')

  try {
    switch (op) {
      case 'create_draft': {
        const to = String(body.to || '').trim()
        const subject = String(body.subject || '').trim()
        const emailBody = String(body.body || '')
        if (!to || !subject || !emailBody) {
          return NextResponse.json({ error: '缺少邮件字段' }, { status: 400 })
        }
        const draft = await createGmailDraft({
          to,
          subject,
          body: emailBody,
          userId: user.id,
        })
        return NextResponse.json({ ok: true, ...draft })
      }

      case 'send_draft': {
        const draftId = String(body.draftId || '')
        const to = String(body.to || '').trim()
        const subject = String(body.subject || '').trim()
        const emailBody = String(body.body || '')
        if (!draftId || !to) {
          return NextResponse.json({ error: '缺少草稿信息' }, { status: 400 })
        }
        const result = await sendGmailDraft({
          userId: user.id,
          draftId,
          to,
          subject,
          body: emailBody,
        })
        if (!result.ok) {
          return NextResponse.json({ ok: false, error: result.error || '发送失败' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, messageId: result.messageId })
      }

      case 'add_calendar': {
        const title = String(body.title || '').trim()
        const date = String(body.date || '').trim()
        if (!title || !date) {
          return NextResponse.json({ error: '缺少日历字段' }, { status: 400 })
        }
        const result = await addToGoogleCalendar({
          userId: user.id,
          title,
          date,
          notes: body.notes ? String(body.notes) : undefined,
        })
        if (!result.ok) {
          return NextResponse.json({ ok: false, error: result.error, via: result.via }, { status: 500 })
        }
        return NextResponse.json({ ok: true, eventLink: result.eventLink, via: result.via })
      }

      default:
        return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 })
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '执行失败'
    console.error('[api/action/mcp]', op, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
