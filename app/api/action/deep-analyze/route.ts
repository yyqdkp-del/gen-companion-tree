export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { checkLimit, recordUsage } from '@/lib/limits/usage'
import { runDeepAnalysisForTodo } from '@/lib/action/deepAnalysis'
import { isCachedRootDecisionValid } from '@/lib/action/decisionCache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const todoId = String(body.source_id || body.todoId || '')
  if (!todoId) {
    return NextResponse.json({ ok: false, error: 'Missing source_id' }, { status: 400 })
  }

  const { data: todo, error } = await supabase
    .from('todo_items')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', user.id)
    .single()

  if (error || !todo) {
    return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
  }

  const cacheCheck = isCachedRootDecisionValid(todo.ai_action_data)
  if (cacheCheck.valid && cacheCheck.decision) {
    return NextResponse.json({
      ok: true,
      decision: cacheCheck.decision,
      autoCompleted: [],
      fromCache: true,
    })
  }

  const oneTapLimit = await checkLimit(user.id, 'one_tap', user.email)
  if (!oneTapLimit.allowed) {
    return NextResponse.json(
      { error: 'limit_reached', feature: 'one_tap' },
      { status: 429 },
    )
  }

  try {
    const brainResult = await runDeepAnalysisForTodo(
      supabase,
      user.id,
      todoId,
      todo as Record<string, unknown>,
    )
    await recordUsage(user.id, 'one_tap')

    return NextResponse.json({
      ok: true,
      decision: brainResult.decision,
      autoCompleted: brainResult.autoCompleted,
      fromCache: false,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Deep analysis failed'
    console.error('[deep-analyze]', todoId, message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
