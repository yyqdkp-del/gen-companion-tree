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

export async function GET(req: NextRequest) {
  const denied = assertCronSecret(req)
  if (denied) return denied

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ ok: false, error: listError.message }, { status: 500 })
  }

  const toDelete = (listData?.users || []).filter((u) => {
    const requestedAt = u.user_metadata?.delete_requested_at
    if (typeof requestedAt !== 'string' || !requestedAt) return false
    return new Date(requestedAt) < thirtyDaysAgo
  })

  const purged: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const user of toDelete) {
    try {
      await Promise.all([
        supabase.from('children').delete().eq('user_id', user.id),
        supabase.from('family_profile').delete().eq('user_id', user.id),
        supabase.from('todo_items').delete().eq('user_id', user.id),
        supabase.from('hotspot_items').delete().eq('user_id', user.id),
        supabase.from('chinese_sessions').delete().eq('user_id', user.id),
        supabase.from('growth_reports').delete().eq('user_id', user.id),
        supabase.from('mom_memories').delete().eq('user_id', user.id),
        supabase.from('push_subscriptions').delete().eq('user_id', user.id),
        supabase.from('user_line_credentials').delete().eq('user_id', user.id),
      ])

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) throw deleteError
      purged.push(user.id)
    } catch (e: unknown) {
      failed.push({
        id: user.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    purged: purged.length,
    failed,
  })
}
