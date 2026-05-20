export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import {
  extractHanziFromSessions,
  unlockHanziAchievements,
} from '@/lib/children/unlockHanziAchievements'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function normalizeAchievement(row: Record<string, unknown>) {
  const body = row.body
  let description = row.description as string | undefined
  if (!description && body) {
    if (typeof body === 'object' && body !== null && 'description' in body) {
      description = String((body as { description?: string }).description || '')
    } else if (typeof body === 'string') {
      description = body
    }
  }
  return {
    ...row,
    type: (row.type as string) || 'custom',
    emoji: (row.emoji as string) || '⭐',
    description: description || null,
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: childId } = await context.params
  const supabase = getServiceSupabase()

  const { data: child, error: childErr } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single()

  if (childErr || !child) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const [
    { data: hanziSessions },
    { data: todos },
  ] = await Promise.all([
    supabase
      .from('chinese_sessions')
      .select('input_text, input_type, result, learned_at')
      .eq('child_id', childId)
      .order('learned_at', { ascending: false })
      .limit(200),
    supabase
      .from('todo_items')
      .select('title, status, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .order('completed_at', { ascending: false })
      .limit(20),
  ])

  const uniqueHanzi = extractHanziFromSessions(hanziSessions)
  await unlockHanziAchievements(supabase, user.id, childId, uniqueHanzi.length)

  const [
    { data: achievements },
    { data: moments },
  ] = await Promise.all([
    supabase
      .from('child_achievements')
      .select('*')
      .eq('child_id', childId)
      .order('achieved_at', { ascending: false })
      .limit(20),
    supabase
      .from('growth_moments')
      .select('*')
      .eq('child_id', childId)
      .order('moment_date', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    child,
    achievements: (achievements || []).map((a) => normalizeAchievement(a as Record<string, unknown>)),
    moments: moments || [],
    hanzi_count: uniqueHanzi.length,
    hanzi_list: uniqueHanzi.slice(0, 30),
    recent_todos: todos || [],
  })
}
