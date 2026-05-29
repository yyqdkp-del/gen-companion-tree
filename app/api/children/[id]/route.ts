export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: childId } = await context.params
  if (!childId || childId === 'new') {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!child) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await Promise.all([
    supabase.from('child_profiles').delete().eq('child_id', childId),
    supabase.from('child_daily_log').delete().eq('child_id', childId),
    supabase.from('child_school_calendar').delete().eq('child_id', childId),
    supabase.from('child_activities').delete().eq('child_id', childId),
    supabase.from('child_health_records').delete().eq('child_id', childId),
    supabase.from('chinese_sessions').delete().eq('child_id', childId),
    supabase.from('growth_reports').delete().eq('child_id', childId),
    supabase.from('growth_moments').delete().eq('child_id', childId),
    supabase.from('child_achievements').delete().eq('child_id', childId),
    supabase.from('packing_lists').delete().eq('child_id', childId),
    supabase.from('todo_items').delete().eq('child_id', childId),
  ])

  const { error: deleteError } = await supabase
    .from('children')
    .delete()
    .eq('id', childId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('[api/children/delete]', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
