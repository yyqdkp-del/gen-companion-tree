export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/assertAdmin'

const ALLOWED_ENDPOINTS = new Set([
  '/api/cron/scheduler',
  '/api/cron/visa-reminder',
  '/api/cron/account-purge',
  '/api/cron/patrol',
])

export async function POST(req: NextRequest) {
  const { error: forbidden } = await assertAdmin(req)
  if (forbidden) return forbidden

  const body = await req.json().catch(() => ({}))
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : ''
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')
  const url = `${base}${endpoint}?secret=${encodeURIComponent(cronSecret)}`

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' })
    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* plain text response */
    }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      data,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
