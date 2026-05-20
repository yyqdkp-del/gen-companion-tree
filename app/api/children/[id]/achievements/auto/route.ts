export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import {
  extractHanziFromSessions,
  unlockHanziAchievements,
} from '@/lib/children/unlockHanziAchievements'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: childId } = await context.params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!child) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { data: sessions } = await supabase
    .from('chinese_sessions')
    .select('input_text, input_type, result')
    .eq('child_id', childId)

  const uniqueHanzi = extractHanziFromSessions(sessions)
  await unlockHanziAchievements(supabase, user.id, childId, uniqueHanzi.length)

  return NextResponse.json({ ok: true, hanzi_count: uniqueHanzi.length })
}
