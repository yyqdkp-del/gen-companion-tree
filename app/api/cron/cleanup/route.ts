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

  const { data: hotspotTodos } = await supabase
    .from('todo_items')
    .select('id, source_ref_id, created_at')
    .eq('source', 'hotspot')
    .eq('status', 'pending')
    .not('source_ref_id', 'is', null)
    .order('created_at', { ascending: false })

  const seen = new Set<string>()
  const toExpire: string[] = []

  for (const todo of hotspotTodos || []) {
    const refId = String(todo.source_ref_id)
    if (seen.has(refId)) {
      toExpire.push(todo.id)
    } else {
      seen.add(refId)
    }
  }

  if (toExpire.length > 0) {
    await supabase
      .from('todo_items')
      .update({ status: 'expired' })
      .in('id', toExpire)
    console.log(`[cleanup] expired ${toExpire.length} duplicate hotspot todos`)
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const { data: overdueTodos } = await supabase
    .from('todo_items')
    .select('id, title, category')
    .eq('status', 'pending')
    .lt('due_date', yesterdayStr)

  const autoCloseDimensions = ['mobility', 'education', 'logistics']

  for (const todo of overdueTodos || []) {
    const status = autoCloseDimensions.includes(todo.category)
      ? 'done'
      : 'expired'

    await supabase
      .from('todo_items')
      .update({ status })
      .eq('id', todo.id)
  }

  console.log(`[cleanup] auto-closed ${overdueTodos?.length || 0} overdue todos`)

  return NextResponse.json({
    ok: true,
    expired: toExpire.length,
    autoClosed: overdueTodos?.length || 0,
  })
}
