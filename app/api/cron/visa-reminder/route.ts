export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function assertCronSecret(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const secret =
    req.headers.get('x-cron-secret') ||
    req.nextUrl.searchParams.get('secret') ||
    bearer
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function utcTodayStr(): string {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())).toISOString().split('T')[0]
}

function parseISODate(s: unknown): string | null {
  if (!s || typeof s !== 'string') return null
  const t = s.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return t
}

function addDaysUtc(dStr: string, days: number): string {
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days))
  return dt.toISOString().split('T')[0]
}

function daysBetween(todayIso: string, expiryIso: string): number {
  return Math.ceil(
    (Date.parse(`${expiryIso}T12:00:00Z`) - Date.parse(`${todayIso}T12:00:00Z`)) / (1000 * 60 * 60 * 24),
  )
}

type ProfileRow = {
  id: string
  user_id: string
  member_name: string | null
  passport_expiry: string | null
  visa_expiry: string | null
}

type ChildRow = {
  id: string
  user_id: string
  name: string
  passport_expiry: string | null
}

type Reminder = {
  userId: string
  dedupe: Record<string, string>
  title: string
  summary: string
  urgency: 'urgent' | 'important'
  relevance_reason: string
}

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const todayStr = utcTodayStr()
  const horizonStr = addDaysUtc(todayStr, 30)

  const reminders: Reminder[] = []

  const { data: profiles, error: pErr } = await supabase
    .from('family_profile')
    .select('id, user_id, member_name, passport_expiry, visa_expiry')

  if (pErr) console.error('[visa-reminder] family_profile:', pErr.message)

  for (const p of (profiles ?? []) as ProfileRow[]) {
    const who = (p.member_name || '您的').trim() || '您的'
    const uid = p.user_id
    const pp = parseISODate(p.passport_expiry)
    const vp = parseISODate(p.visa_expiry)
    if (pp && pp >= todayStr && pp <= horizonStr) {
      const n = daysBetween(todayStr, pp)
      reminders.push({
        userId: uid,
        dedupe: { visa_reminder_v1: `${todayStr}:profile:${p.id}:passport:${pp}` },
        title: `${who}的护照还有 ${n} 天到期`,
        summary: `到期日 ${pp}，请尽快安排护照续办，以免影响出行或签证办理。`,
        urgency: n <= 7 ? 'urgent' : 'important',
        relevance_reason: '基于家庭档案护照到期日与当前日期计算',
      })
    }
    if (vp && vp >= todayStr && vp <= horizonStr) {
      const n = daysBetween(todayStr, vp)
      reminders.push({
        userId: uid,
        dedupe: { visa_reminder_v1: `${todayStr}:profile:${p.id}:visa:${vp}` },
        title: `${who}的签证还有 ${n} 天到期`,
        summary: `到期日 ${vp}，请留意延期或换签截止日期。`,
        urgency: n <= 7 ? 'urgent' : 'important',
        relevance_reason: '基于家庭档案签证到期日与当前日期计算',
      })
    }
  }

  const { data: kids, error: cErr } = await supabase
    .from('children')
    .select('id, user_id, name, passport_expiry')
    .not('passport_expiry', 'is', null)

  if (cErr) console.error('[visa-reminder] children:', cErr.message)

  for (const c of (kids ?? []) as ChildRow[]) {
    const pe = parseISODate(c.passport_expiry)
    if (!pe || pe < todayStr || pe > horizonStr) continue
    const n = daysBetween(todayStr, pe)
    const nm = (c.name || '孩子').trim() || '孩子'
    reminders.push({
      userId: c.user_id,
      dedupe: { visa_reminder_v1: `${todayStr}:child:${c.id}:passport:${pe}` },
      title: `${nm}的护照还有 ${n} 天到期`,
      summary: `到期日 ${pe}，请尽快为孩子安排护照延期或换新。`,
      urgency: n <= 7 ? 'urgent' : 'important',
      relevance_reason: '基于孩子档案护照到期日与当前日期计算',
    })
  }

  let reminded = 0
  for (const r of reminders) {
    const { data: dup } = await supabase
      .from('hotspot_items')
      .select('id')
      .eq('user_id', r.userId)
      .contains('action_data', r.dedupe)
      .limit(1)

    if (dup && dup.length > 0) continue

    const { error } = await supabase.from('hotspot_items').insert({
      user_id: r.userId,
      category: 'visa',
      urgency: r.urgency,
      title: r.title,
      summary: r.summary,
      relevance_reason: r.relevance_reason,
      action_available: false,
      action_type: null,
      action_data: {
        ...r.dedupe,
        source: 'visa_reminder_cron',
      },
      status: 'unread',
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })

    if (!error) reminded++
    else console.error('[visa-reminder] insert:', error.message)
  }

  return NextResponse.json({ ok: true, reminded, checked: reminders.length })
}
